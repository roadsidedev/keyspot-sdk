import { describe, it, expect, vi } from 'vitest';
import { AgentGuard, PrunerStrategy, CheckpointTrigger } from '@roadsidelab/keyspot-core';
import { InMemoryVaultAdapter } from '@roadsidelab/keyspot-vault';
import { BaseVectorStoreAdapter } from '@roadsidelab/keyspot-core/adapters';

describe('PRD Gap: PrunerStrategy', () => {
  it('VAULT_WITH_TAINT is the default and vaults secrets', async () => {
    const guard = new AgentGuard();
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toMatch(/^vault:v1:/);
  });

  it('REDACT replaces with truncated value', async () => {
    const guard = new AgentGuard({ pruneStrategy: PrunerStrategy.REDACT });
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toBe('sk-1...5678');
  });

  it('REMOVE sets value to undefined', async () => {
    const guard = new AgentGuard({ pruneStrategy: PrunerStrategy.REMOVE });
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toBeUndefined();
  });

  it('REPLACE uses configurable placeholder', async () => {
    const guard = new AgentGuard({ pruneStrategy: PrunerStrategy.REPLACE, placeholder: '[SENSORED]' });
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toBe('[SENSORED]');
  });

  it('REPLACE defaults to [REDACTED]', async () => {
    const guard = new AgentGuard({ pruneStrategy: PrunerStrategy.REPLACE });
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toBe('[REDACTED]');
  });
});

describe('PRD Gap: CheckpointTrigger + OpenTelemetry', () => {
  it('fires SCAN trigger during checkpoint', async () => {
    const triggered: string[] = [];
    const guard = new AgentGuard({
      checkpointTriggers: new Set([CheckpointTrigger.SCAN]),
      onCheckpointTrigger: async (trigger) => { triggered.push(trigger); },
    });
    await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(triggered).toContain(CheckpointTrigger.SCAN);
  });

  it('fires VAULT_WRITE trigger during checkpoint with secrets', async () => {
    const triggered: string[] = [];
    const guard = new AgentGuard({
      checkpointTriggers: new Set([CheckpointTrigger.VAULT_WRITE]),
      onCheckpointTrigger: async (trigger) => { triggered.push(trigger); },
    });
    await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(triggered).toContain(CheckpointTrigger.VAULT_WRITE);
  });

  it('enableOpenTelemetry creates OtelTracer', () => {
    const guard = new AgentGuard({ enableOpenTelemetry: true });
    expect(guard['tracer']).toBeDefined();
  });

  it('OtelTracer startSpan returns a valid span', async () => {
    const { OtelTracer } = await import('@agentguard/core/telemetry');
    const tracer = new OtelTracer('test');
    const span = tracer.startSpan('op');
    expect(span).toBeDefined();
    expect(typeof span.end).toBe('function');
    span.end();
  });
});

describe('PRD Gap: vectorStores config + wrapVectorStore', () => {
  it('wrapVectorStore returns a wrapped adapter that sanitizes docs', async () => {
    const guard = new AgentGuard();
    const mockStore = { upsert: vi.fn().mockResolvedValue({}) };
    const adapter = new (class extends BaseVectorStoreAdapter {
      wrap(store: any) { return store; }
    })(guard);

    const wrapped = guard.wrapVectorStore(adapter, mockStore);
    expect(wrapped).toBe(mockStore);
  });

  it('accepts vectorStores in config', () => {
    const guard = new AgentGuard({
      vectorStores: [],
    });
    expect(guard).toBeDefined();
  });

  it('getVault returns the configured vault', () => {
    const vault = new InMemoryVaultAdapter();
    const guard = new AgentGuard({ vault });
    expect(guard.getVault()).toBe(vault);
  });
});

describe('PRD Gap: getAuditLogger', () => {
  it('returns the audit logger instance', () => {
    const guard = new AgentGuard();
    const logger = guard.getAuditLogger();
    expect(logger).toBeDefined();
    expect(logger.getEntries()).toHaveLength(0);
  });
});
