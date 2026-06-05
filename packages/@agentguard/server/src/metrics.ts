import { Request, Response, NextFunction } from 'express';

export interface Counter {
  inc(labels?: Record<string, string>): void;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
}

export class MetricsRegistry {
  private counters = new Map<string, { help: string; labels: string[]; values: Map<string, number> }>();
  private histograms = new Map<string, { help: string; labels: string[]; values: Map<string, number[]> }>();

  counter(name: string, help: string, labels: string[] = []): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, { help, labels, values: new Map() });
    }
    const entry = this.counters.get(name)!;
    return {
      inc: (l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
      },
    };
  }

  histogram(name: string, help: string, labels: string[] = []): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, { help, labels, values: new Map() });
    }
    const entry = this.histograms.get(name)!;
    return {
      observe: (value: number, l?: Record<string, string>) => {
        const key = l ? serializeLabels(l) : '_total';
        const arr = entry.values.get(key) ?? [];
        arr.push(value);
        entry.values.set(key, arr);
      },
    };
  }

  export(): string {
    const lines: string[] = [];
    for (const [name, c] of this.counters) {
      lines.push(`# HELP ${name} ${c.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of c.values) {
        const labelStr = key === '_total' ? '' : `{${key}}`;
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    for (const [name, h] of this.histograms) {
      lines.push(`# HELP ${name} ${h.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [key, values] of h.values) {
        const labelStr = key === '_total' ? '' : `{${key}}`;
        values.sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        lines.push(`${name}_count${labelStr} ${count}`);
        lines.push(`${name}_sum${labelStr} ${sum.toFixed(2)}`);
        if (count > 0) lines.push(`${name}_bucket${labelStr}{le="+Inf"} ${count}`);
      }
    }
  return lines.join('\n');
}
}

// Global registry
const registry = new MetricsRegistry();

function serializeLabels(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

// Pre-define key metrics
export const metrics = {
  checkpointTotal: registry.counter('agentguard_checkpoint_total', 'Total checkpoint calls', ['status']),
  checkpointDuration: registry.histogram('agentguard_checkpoint_duration_ms', 'Checkpoint duration in ms'),
  scanTotal: registry.counter('agentguard_scan_total', 'Total scan calls', ['status']),
  secretsFound: registry.counter('agentguard_secrets_found_total', 'Secrets detected', ['type']),
  vaultWrites: registry.counter('agentguard_vault_writes_total', 'Vault write operations'),
  promptValidationTotal: registry.counter('agentguard_prompt_validation_total', 'Prompt validation calls', ['blocked']),
  httpRequestDuration: registry.histogram('agentguard_http_request_duration_ms', 'HTTP request duration', ['method', 'path', 'status']),
};

/** Middleware: record HTTP request duration. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    metrics.httpRequestDuration.observe(Date.now() - start, {
      method: req.method,
      path: req.route?.path || req.path,
      status: String(res.statusCode),
    });
  });
  next();
}

/** Handler: export Prometheus-format metrics. */
export function metricsHandler(_req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(registry.export());
}
