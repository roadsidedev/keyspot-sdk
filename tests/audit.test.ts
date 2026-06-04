import { describe, it, expect } from 'vitest';
import { AuditLogger } from '@agentguard/core/security';

describe('AuditLogger', () => {
  it('logs events and returns an entry with hash', () => {
    const logger = new AuditLogger();
    const entry = logger.log({ type: 'test', data: 'hello' });
    expect(entry.hash).toBeDefined();
    expect(entry.hash).toHaveLength(64);
    expect(entry.prevHash).toBe('0'.repeat(64));
    expect(entry.event.type).toBe('test');
  });

  it('produces a verifiable hash chain', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    logger.log({ type: 'event2' });
    logger.log({ type: 'event3' });
    const entries = logger.getEntries();
    expect(logger.verifyChain(entries)).toBe(true);
  });

  it('detects tampered logs', () => {
    const logger = new AuditLogger();
    logger.log({ type: 'event1' });
    logger.log({ type: 'event2' });
    logger.log({ type: 'event3' });
    const entries = logger.getEntries();
    // Tamper with the second entry's event
    const tampered = entries.map((e, i) => 
      i === 1 ? { ...e, event: { ...e.event, type: 'tampered' } } : e
    );
    expect(logger.verifyChain(tampered)).toBe(false);
  });
});
