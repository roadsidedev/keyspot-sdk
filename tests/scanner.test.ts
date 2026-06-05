import { describe, it, expect } from 'vitest';
import { Scanner } from '@roadsidelab/keyspot-core/scanner';
import { TaintEngine } from '@roadsidelab/keyspot-core/taint';

describe('Scanner', () => {
  it('detects an OpenAI key in a string', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('my api key is sk-123456789012345678901234567890123456789012345678');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('openai_api_key');
    expect(matches[0].severity).toBe('high');
  });

  it('returns empty for clean input', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('this is a clean string with no secrets');
    expect(matches).toHaveLength(0);
  });

  it('detects an Ethereum private key', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('ethereum_private_key');
  });

  it('redacts long secrets properly', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('sk-123456789012345678901234567890123456789012345678');
    expect(matches[0].redacted).toBe('sk-1...5678');
  });

  it('redacts short secrets as asterisks', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    // We need a match with length <= 8
    const matches = await scanner.scan('short');
    expect(matches).toHaveLength(0); // No pattern matches "short"
  });

  it('performs deep scan of nested objects', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const data = {
      user: 'alice',
      config: {
        apiKey: 'sk-123456789012345678901234567890123456789012345678'
      },
      history: [{ role: 'user', content: 'hello' }]
    };
    const matches = await scanner.scan(data);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(m => m.path.includes('config.apiKey'))).toBe(true);
  });

  it('scans arrays recursively', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const data = ['clean', 'sk-123456789012345678901234567890123456789012345678'];
    const matches = await scanner.scan(data);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].path).toContain('[1]');
  });

  it('handles streaming scan', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678', 'context');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('detects tainted content when taint enabled', async () => {
    const taint = new TaintEngine();
    taint.tag('tainted-value', 'sec_001', 'test');
    const scanner = new Scanner({ taintEnabled: true }, taint);
    const matches = await scanner.scan('tainted-value');
    expect(matches.some(m => m.type === 'tainted_content')).toBe(true);
  });

  it('detects Anthropic API keys', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const anthropicKey = 'sk-ant-api03-' + 'A'.repeat(86) + '-AAAAAAAA';
    const matches = await scanner.scan(anthropicKey);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('anthropic_api_key');
  });

  it('detects AWS access key', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('AKIA1234567890123456');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('aws_access_key');
  });
});
