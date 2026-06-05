import { describe, it, expect, vi } from 'vitest';
import { ConsoleTracer, AgentGuardTracer, noopTracer, setGlobalTracer, getGlobalTracer } from '@agentguard/core/telemetry';
import { AgentGuard } from '@agentguard/core';

describe('Telemetry (Tracer)', () => {
  it('noopTracer returns a span without throwing', () => {
    const span = noopTracer.startSpan('test');
    expect(span).toBeDefined();
    span.end();
    span.setAttribute('key', 'val');
    span.addEvent('event');
  });

  it('ConsoleTracer logs span lifecycle', () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    const tracer = new ConsoleTracer('test');
    const span = tracer.startSpan('op');
    span.end();

    console.log = origLog;
    expect(logs.some(l => l.includes('[TRACE] test.op start'))).toBe(true);
    expect(logs.some(l => l.includes('[TRACE] test.op end'))).toBe(true);
  });

  it('AgentGuardTracer wraps checkpoint with tracing', async () => {
    const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
    const guard = new AgentGuard({ taintEnabled: true, tracer: noopTracer });
    const result = await guard.checkpoint(state);
    expect(result.key).toMatch(/^vault:v1:/);
  });

  it('setGlobalTracer/getGlobalTracer round-trips', () => {
    setGlobalTracer(noopTracer);
    expect(getGlobalTracer()).toBe(noopTracer);
  });
});
