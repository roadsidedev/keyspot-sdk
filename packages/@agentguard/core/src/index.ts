import { Scanner, ScannerOptions, Match } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultAdapter, InMemoryVaultAdapter, VaultWriteOptions } from '@agentguard/vault';
import { PromptShield, AuditLogger, PromptShieldRule } from './security.js';

export interface AgentGuardConfig extends ScannerOptions {
  vault?: VaultAdapter;
  workerPool?: { size: number };
  onSecretFound?: (match: Match) => Promise<void>;
  rotationHook?: (match: Match) => Promise<string | null>;
  promptShield?: { enabled: boolean; rules?: PromptShieldRule[] };
  hosted?: {
    enabled: boolean;
    agentWalletAddress?: string;
    facilitatorUrl?: string;
  };
}

const PATH_SEVERITY: Record<string, number> = {
  config: 1.0,
  secret: 1.0,
  token: 1.0,
  key: 1.0,
  password: 1.0,
  credential: 1.0,
  env: 0.9,
  github: 0.8,
  ci: 0.8,
  log: 0.5,
  debug: 0.5,
  history: 0.4,
  message: 0.3,
  chat: 0.3,
  memory: 0.3,
};

function contextualConfidence(path: string, baseConfidence: number): number {
  const parts = path.toLowerCase().split(/[.\[\]_/-]+/);
  for (const part of parts) {
    const boost = PATH_SEVERITY[part];
    if (boost) {
      return Math.min(1.0, baseConfidence + (boost - 0.5) * 0.3);
    }
  }
  // Default: slightly reduce for unknown paths
  return Math.max(0.5, baseConfidence - 0.1);
}

export class AgentGuard {
  private scanner: Scanner;
  private vault: VaultAdapter;
  private taintEngine: TaintEngine;
  private promptShield?: PromptShield;
  private auditLogger: AuditLogger;
  private onSecretFound?: (match: Match) => Promise<void>;
  private rotationHook?: (match: Match) => Promise<string | null>;

  constructor(private config: AgentGuardConfig = {}) {
    this.taintEngine = new TaintEngine();
    this.scanner = new Scanner(config, this.taintEngine);
    this.vault = config.vault || new InMemoryVaultAdapter();
    this.auditLogger = new AuditLogger();
    this.onSecretFound = config.onSecretFound;
    this.rotationHook = config.rotationHook;

    if (config.promptShield?.enabled) {
      this.promptShield = new PromptShield(config.promptShield.rules);
    }
  }

  private async checkHostedAccess(): Promise<boolean> {
    console.log(`[Hosted] Checking access for ${this.config.hosted?.agentWalletAddress}`);
    return true;
  }

  async scan(data: any): Promise<Match[]> {
    return this.scanner.scan(data);
  }

  async stream(tokens: string, context: string = ''): Promise<Match[]> {
    return this.scanner.scanStream(tokens, context);
  }

  async checkpoint(state: any): Promise<any> {
    if (this.config.hosted?.enabled) {
      const hasAccess = await this.checkHostedAccess();
      if (!hasAccess) {
        throw new Error('402 Payment Required: Hosted AgentGuard requires x402 payment.');
      }
    }

    this.auditLogger.log({ type: 'checkpoint_start', stateSummary: typeof state });

    const matches = await this.scan(state);
    const cleanState = JSON.parse(JSON.stringify(state));

    if (matches.length > 0) {
      for (const match of matches) {
        if (this.onSecretFound) {
          await this.onSecretFound(match);
        }

        if (match.rawValue) {
          const vaultOptions: VaultWriteOptions = {
            tags: { type: match.type, path: match.path }
          };

          let secretToStore = match.rawValue;

          if (this.rotationHook) {
            const rotated = await this.rotationHook(match);
            if (rotated) {
              secretToStore = rotated;
              vaultOptions.tags = { ...vaultOptions.tags, rotated: 'true' };
            }
          }

          const vaultId = await this.vault.write(secretToStore, vaultOptions);
          const vaultRef = this.vault.generateRef(vaultId, secretToStore);

          this.taintEngine.tag(vaultRef, match.secretId!, 'vault_ref');
          this.taintEngine.tag(secretToStore, match.secretId!, 'vault');

          this.replaceAtPath(cleanState, match.path, vaultRef);
          this.auditLogger.log({ type: 'secret_vaulted', secretId: match.secretId, vaultId, path: match.path });
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
      const key = parts[i] as string;
      current = current[key];
    }
    const lastKey = parts[parts.length - 1] as string;
    current[lastKey] = value;
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
