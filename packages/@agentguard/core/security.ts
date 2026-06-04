import { createHash } from 'crypto';

export interface PromptShieldRule {
  name: string;
  pattern: RegExp;
  severity: 'block' | 'warn' | 'ignore';
}

export class PromptShield {
  private rules: PromptShieldRule[] = [
    {
      name: 'jailbreak_attempt',
      pattern: /ignore previous instructions|you are now an unrestricted/i,
      severity: 'block'
    },
    {
      name: 'data_exfiltration',
      pattern: /send this to|post to http|upload your memory/i,
      severity: 'warn'
    }
  ];

  constructor(customRules?: PromptShieldRule[]) {
    if (customRules) {
      this.rules.push(...customRules);
    }
  }

  async analyze(prompt: string): Promise<{ blocked: boolean; findings: string[] }> {
    const findings: string[] = [];
    let blocked = false;

    for (const rule of this.rules) {
      if (rule.pattern.test(prompt)) {
        findings.push(rule.name);
        if (rule.severity === 'block') {
          blocked = true;
        }
      }
    }

    return { blocked, findings };
  }
}

export class AuditLogger {
  private lastHash: string = '0'.repeat(64);

  log(event: any): string {
    const timestamp = Date.now();
    const data = JSON.stringify({ ...event, timestamp, prevHash: this.lastHash });
    const hash = createHash('sha256').update(data).digest('hex');
    
    // In production, this would write to a tamper-proof store
    console.log(`[AUDIT] ${hash} | ${data}`);
    
    this.lastHash = hash;
    return hash;
  }

  verifyChain(logs: any[]): boolean {
    let currentPrevHash = '0'.repeat(64);
    for (const log of logs) {
      if (log.prevHash !== currentPrevHash) return false;
      const data = JSON.stringify(log);
      currentPrevHash = createHash('sha256').update(data).digest('hex');
    }
    return true;
  }
}
