import { Pattern, builtInPatterns } from '../patterns/index.js';
import { TaintEngine } from './taint.js';

export interface Match {
  type: string;
  severity: string;
  path: string;
  redacted: string;
  confidence: number;
  secretId?: string;
  sourceSecretIds?: string[];
  rawValue?: string;
}

export interface ScannerOptions {
  patterns?: Pattern[];
  deepScan?: boolean;
  includeBase64?: boolean;
  contextWindow?: number;
  taintEnabled?: boolean;
}

export class Scanner {
  private patterns: Pattern[];
  private taintEngine: TaintEngine;
  private taintEnabled: boolean;

  constructor(options: ScannerOptions = {}, taintEngine: TaintEngine) {
    this.patterns = options.patterns || builtInPatterns;
    this.taintEngine = taintEngine;
    this.taintEnabled = options.taintEnabled ?? true;
  }

  /**
   * Performs a deep scan of the provided data structure.
   */
  async scan(data: any, path: string = ''): Promise<Match[]> {
    const matches: Match[] = [];

    if (typeof data === 'string') {
      // Check for direct pattern matches
      for (const pattern of this.patterns) {
        let match;
        while ((match = pattern.regex.exec(data)) !== null) {
          const rawValue = match[0];
          const secretId = `sec_${Math.random().toString(36).substring(7)}`;
          
          matches.push({
            type: pattern.name,
            severity: pattern.severity,
            path,
            redacted: this.redact(rawValue),
            confidence: 0.99,
            secretId,
            rawValue
          });

          if (this.taintEnabled) {
            this.taintEngine.tag(data, secretId, 'scanner');
          }
        }
        pattern.regex.lastIndex = 0;
      }

      // Check for taints if no direct matches or if taint tracking is priority
      if (this.taintEnabled) {
        const taints = this.taintEngine.getTaints(data);
        if (taints.length > 0) {
          matches.push({
            type: 'tainted_content',
            severity: 'medium',
            path,
            redacted: '[TAINTED CONTENT]',
            confidence: 0.8,
            sourceSecretIds: taints.map(t => t.secretId)
          });
        }
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        matches.push(...(await this.scan(data[i], `${path}[${i}]`)));
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        matches.push(...(await this.scan(data[key], path ? `${path}.${key}` : key)));
      }
    }

    return matches;
  }

  /**
   * Incremental scanning for streaming tokens.
   */
  async scanStream(tokens: string, context: string = ''): Promise<Match[]> {
    // For streaming, we look at the new tokens plus some context
    const fullText = context + tokens;
    return this.scan(fullText, 'stream');
  }

  private redact(secret: string): string {
    if (secret.length <= 8) return '********';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }
}
