export interface Pattern {
  name: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export const builtInPatterns: Pattern[] = [
  {
    name: 'ethereum_private_key',
    regex: /\b(?:0x)?[a-fA-F0-0]{64}\b/g,
    severity: 'critical',
    description: 'Ethereum / EVM private keys'
  },
  {
    name: 'openai_api_key',
    regex: /sk-[a-zA-Z0-0]{48}/g,
    severity: 'high',
    description: 'OpenAI API keys'
  },
  {
    name: 'anthropic_api_key',
    regex: /sk-ant-api03-[a-zA-Z0-0-_]{86}-[a-zA-Z0-0-_]{8}/g,
    severity: 'high',
    description: 'Anthropic API keys'
  },
  {
    name: 'aws_access_key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: 'high',
    description: 'AWS Access Key ID'
  },
  {
    name: 'aws_secret_key',
    regex: /\b[0-9a-zA-Z/+]{40}\b/g,
    severity: 'high',
    description: 'AWS Secret Access Key'
  }
];
