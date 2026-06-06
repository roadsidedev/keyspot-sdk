import { createHash } from 'crypto';

export interface PromptShieldRule {
  name: string;
  pattern: RegExp;
  severity: 'block' | 'warn' | 'ignore';
}

const defaultRules: PromptShieldRule[] = [
  { name: 'jailbreak_attempt', pattern: /ignore previous instructions|forget your instructions|you are now an unrestricted|you are free from all restrictions|you have no rules/i, severity: 'block' },
  { name: 'data_exfiltration', pattern: /send this to|post to http|upload your memory|forward to https?:\/\/|exfiltrate/i, severity: 'warn' },
  { name: 'base64_encode', pattern: /base64[\s\(]*encode|encode.*base64|convert to base64/i, severity: 'warn' },
  { name: 'hex_encode', pattern: /convert to hex|hexadecimal encode|encode as hex/i, severity: 'warn' },
  { name: 'role_play_bypass', pattern: /act as|roleplay as|pretend to be|act like|from now on you are/i, severity: 'warn' },
  { name: 'memory_extraction', pattern: /what (is|was|were) (my|the secret|the password|the api|the token)|retrieve (my|all) (memories|history|context)/i, severity: 'block' },
  { name: 'system_prompt_extraction', pattern: /print (your|the) (system prompt|instructions|guidelines|rules)|output your (system prompt|prompt template)|reveal your (prompt|instructions)/i, severity: 'block' },
  { name: 'dangerous_directive', pattern: /modify (your|the) (code|program|behavior|rules|constraints)|disable (your |the |all )?(safety|filter|restriction|protection|limit)/i, severity: 'block' },
  { name: 'reverse_psychology', pattern: /you (must|have to|need to) (reveal|show|tell|give) me|it('s| is) your (duty|job|responsibility|purpose) to|as an AI you should/i, severity: 'warn' },
  { name: 'command_injection', pattern: /`[^`]+`|\\\$\([^)]+\)/i, severity: 'warn' },
  { name: 'sql_injection', pattern: /' OR '1'='1|' OR 1=1|UNION SELECT|DROP TABLE|DELETE FROM/i, severity: 'warn' },
  { name: 'encoded_exfiltration', pattern: /(base64|hex|binary).*(output|response|result|send|post|upload)/i, severity: 'warn' },
  { name: 'recursion_loop', pattern: /repeat (this|the same) (prompt|message|request|command) (back |again |)and (again )?over/i, severity: 'ignore' },
  { name: 'context_leak', pattern: /what (else |also )?(do you know|is stored|are you hiding|are my memories|was in my previous)/i, severity: 'warn' },
  { name: 'tool_abuse', pattern: /execute|run command|shell command|terminal|access the file system|read file|write file|delete file/i, severity: 'warn' },
  { name: 'indirect_injection', pattern: /the user (said|told me|asked me|wants me) to ignore|my (creator|developer|owner) wants me to/i, severity: 'warn' },
  { name: 'prompt_leak', pattern: /what (are|were|is) my (instructions|prompt|rules|guidelines|directives)|tell me (more|all) about my (instructions|prompt|system prompt)/i, severity: 'block' },
  { name: 'assistant_superiority', pattern: /you are (capable|able|allowed|free) to (do |bypass |ignore |override )|you don't (have |need )?(restrictions|limits|boundaries|boundaries)/i, severity: 'warn' },
];

export class PromptShield {
  private rules: PromptShieldRule[];

  constructor(customRules?: PromptShieldRule[]) {
    this.rules = customRules ? [...defaultRules, ...customRules] : [...defaultRules];
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

export interface AuditEntry {
  event: Record<string, unknown>;
  timestamp: number;
  prevHash: string;
  hash: string;
}

export class AuditLogger {
  private lastHash: string = '0'.repeat(64);
  private entries: AuditEntry[] = [];

  log(event: Record<string, unknown>): AuditEntry {
    const timestamp = Date.now();
    const prevHash = this.lastHash;
    const data = JSON.stringify({ ...event, timestamp, prevHash });
    const hash = createHash('sha256').update(data).digest('hex');
    const entry: AuditEntry = { event, timestamp, prevHash, hash };
    this.entries.push(entry);
    this.lastHash = hash;
    return entry;
  }

  verifyChain(entries: AuditEntry[]): boolean {
    let currentPrevHash = '0'.repeat(64);
    for (const entry of entries) {
      if (entry.prevHash !== currentPrevHash) return false;
      const data = JSON.stringify({ ...entry.event, timestamp: entry.timestamp, prevHash: entry.prevHash });
      currentPrevHash = createHash('sha256').update(data).digest('hex');
      if (entry.hash !== currentPrevHash) return false;
    }
    return true;
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getLastHash(): string {
    return this.lastHash;
  }

  clear(): void {
    this.entries = [];
    this.lastHash = '0'.repeat(64);
  }
}
