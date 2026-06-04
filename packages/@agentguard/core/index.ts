import { Scanner, ScannerOptions, Match } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultAdapter, InMemoryVaultAdapter } from '../vault/index.js';
import { PromptShield, AuditLogger, PromptShieldRule } from './security.js';

export interface AgentGuardConfig extends ScannerOptions {
  vault?: VaultAdapter;
  workerPool?: { size: number };
  onSecretFound?: (match: Match) => Promise<void>;
  promptShield?: { enabled: boolean; rules?: PromptShieldRule[] };
}

export class AgentGuard {
  private scanner: Scanner;
  private vault: VaultAdapter;
  private taintEngine: TaintEngine;
  private promptShield?: PromptShield;
  private auditLogger: AuditLogger;
  private onSecretFound?: (match: Match) => Promise<void>;

  constructor(config: AgentGuardConfig = {}) {
    this.taintEngine = new TaintEngine();
    this.scanner = new Scanner(config, this.taintEngine);
    this.vault = config.vault || new InMemoryVaultAdapter();
    this.auditLogger = new AuditLogger();
    this.onSecretFound = config.onSecretFound;

    if (config.promptShield?.enabled) {
      this.promptShield = new PromptShield(config.promptShield.rules);
    }
  }

  async scan(data: any): Promise<Match[]> {
    return this.scanner.scan(data);
  }

  async stream(tokens: string, context: string = ''): Promise<Match[]> {
    return this.scanner.scanStream(tokens, context);
  }

  async checkpoint(state: any): Promise<any> {
    // Audit log the checkpoint start
    this.auditLogger.log({ type: 'checkpoint_start', stateSummary: typeof state });

    const matches = await this.scan(state);
    
    // Deep clone state to avoid mutating original
    const cleanState = JSON.parse(JSON.stringify(state));

    if (matches.length > 0) {
      for (const match of matches) {
        if (this.onSecretFound) {
          await this.onSecretFound(match);
        }

        if (match.rawValue) {
          const vaultId = await this.vault.write(match.rawValue, {
            tags: { type: match.type, path: match.path }
          });
          
          // Construct cryptographic vault reference
          const vaultRef = this.vault.generateRef(vaultId, match.rawValue);
          this.replaceAtPath(cleanState, match.path, vaultRef);
          
          this.auditLogger.log({ type: 'secret_vaulted', secretId: match.secretId, vaultId });
        } else if (match.type === 'tainted_content') {
          this.replaceAtPath(cleanState, match.path, '[REDACTED TAINTED CONTENT]');
          this.auditLogger.log({ type: 'taint_redacted', path: match.path });
        }
      }
    }

    this.auditLogger.log({ type: 'checkpoint_end', matchesFound: matches.length });
    return cleanState;
  }

  async validatePrompt(prompt: string): Promise<{ blocked: boolean; findings: string[] }> {
    if (!this.promptShield) return { blocked: false, findings: [] };
    
    const result = await this.promptShield.analyze(prompt);
    this.auditLogger.log({ type: 'prompt_validation', promptSummary: prompt.substring(0, 50), ...result });
    
    return result;
  }

  private replaceAtPath(obj: any, path: string, value: any) {
    if (!path) return;
    
    const parts = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  async wrap<T>(fn: (...args: any[]) => Promise<T>, state: any): Promise<T> {
    const result = await fn(state);
    const cleanResult = await this.checkpoint(result);
    return cleanResult;
  }

  getTaintEngine(): TaintEngine {
    return this.taintEngine;
  }
}
