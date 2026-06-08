import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { MetricsRegistry, metrics } from '../packages/@keyspot/server/src/metrics.js';

vi.mock('../packages/@keyspot/server/src/middleware/requireSubscription.js', () => ({
  requireSubscription: () => (_req: any, _res: any, next: any) => next(),
}));

const { createApp } = await import('../packages/@keyspot/server/src/app.js');

let baseUrl: string;
let server: http.Server;

describe('Server API', () => {
  beforeAll(async () => {
    const app = createApp();
    const srv = app.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      server = srv;
    });
    await new Promise(r => srv.on('listening', r));
  });

  afterAll(() => {
    server?.close();
  });

  it('GET /health returns status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('2.1.0');
  });

  it('POST /checkpoint validates request body', async () => {
    const res = await fetch(`${baseUrl}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: null }), // null fails z.any() in older zod
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
  });

  it('POST /checkpoint scans and returns clean state', async () => {
    const res = await fetch(`${baseUrl}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: { key: 'sk-123456789012345678901234567890123456789012345678' },
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cleanState.key).toMatch(/^vault:v1:/);
  });

  it('POST /checkpoint passes clean state through', async () => {
    const res = await fetch(`${baseUrl}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { message: 'hello' } }),
    });
    const body = await res.json();
    expect(body.cleanState.message).toBe('hello');
  });

  it('GET /health includes x402 status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(body).toHaveProperty('x402');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });

  it('GET /metrics returns prometheus text', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('keyspot_');
    expect(res.headers.get('Content-Type')).toContain('text/plain');
  });
});

describe('Metrics Registry', () => {
  it('counter increments', () => {
    const r = new MetricsRegistry();
    const c = r.counter('test_total', 'Test counter');
    c.inc();
    c.inc({ status: 'ok' });
    const output = r.export();
    expect(output).toContain('test_total 1');
    expect(output).toContain('{status="ok"}');
  });

  it('histogram records observations', () => {
    const r = new MetricsRegistry();
    const h = r.histogram('test_duration_ms', 'Test duration');
    h.observe(10);
    h.observe(20);
    const output = r.export();
    expect(output).toContain('test_duration_ms_count');
    expect(output).toContain('test_duration_ms_sum');
  });

  it('pre-defined metrics exist', () => {
    expect(metrics.checkpointTotal).toBeDefined();
    expect(metrics.httpRequestDuration).toBeDefined();
    expect(metrics.secretsFound).toBeDefined();
    expect(metrics.scanTotal).toBeDefined();
  });
});
