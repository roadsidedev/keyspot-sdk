import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';

export interface WorkerJob {
  type: 'scan' | 'prune';
  data: any;
}

// ── Isolated VM Sandbox ────────────────────────────────────────

let ivm: any = null;
try {
  ivm = await (Function('return import("isolated-vm")') as () => Promise<any>)();
} catch {
  // isolated-vm not available; fallback to worker_threads
}

export class IsolatedSandbox {
  private isolate: any;
  private context: any;

  constructor(private memoryLimitMB: number = 64, private timeoutMs: number = 10000) {
    if (ivm) {
      this.isolate = new ivm.Isolate({ memoryLimit: memoryLimitMB });
      this.context = this.isolate.createContextSync();
    }
  }

  async run<T>(code: string, data: any): Promise<T> {
    if (ivm && this.isolate) {
      // Use isolated-vm for true memory isolation
      this.context.evalSync(`globalThis.input = ${JSON.stringify(data)}`, { timeout: this.timeoutMs });
      return this.context.evalSync(code, { timeout: this.timeoutMs });
    }
    // Fallback: run inline
    const fn = new Function('data', code);
    return fn(data);
  }

  dispose(): void {
    if (this.isolate) {
      this.isolate.dispose();
      this.isolate = null;
    }
  }
}

// ── Worker Pool ─────────────────────────────────────────────────

export class WorkerPool {
  private queue: { job: WorkerJob; resolve: (val: any) => void; reject: (err: any) => void }[] = [];
  private activeCount = 0;
  private useInlineFallback: boolean;
  private recycleCount = 0;

  constructor(
    private size: number = 4,
    private _recycleAfter: number = 100,
    private jobTimeoutMs: number = 30000,
    private useIsolatedVM: boolean = false,
  ) {
    this.useInlineFallback = !this.workerScriptExists() && !useIsolatedVM;
  }

  private workerScriptExists(): boolean {
    try {
      return existsSync(new URL('./worker-script.js', import.meta.url).pathname);
    } catch {
      return false;
    }
  }

  async run(job: WorkerJob): Promise<any> {
    if (this.useIsolatedVM) {
      return this.runIsolated(job);
    }
    if (this.useInlineFallback) {
      return this.runInline(job);
    }
    if (this.activeCount < this.size) {
      return this.spawnAndRun(job);
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve, reject });
    });
  }

  private async runIsolated(job: WorkerJob): Promise<any> {
    this.activeCount++;
    const sandbox = new IsolatedSandbox(64, this.jobTimeoutMs);
    try {
      const code = `
        const matches = [];
        const input = globalThis.input;
        // Simple pattern matching in sandbox
        const patterns = [/sk-[a-zA-Z0-9]{48}/g, /\\bAKIA[0-9A-Z]{16}\\b/g, /\\b(?:0x)?[a-fA-F0-9]{64}\\b/g];
        for (const re of patterns) {
          let m;
          while ((m = re.exec(input)) !== null) {
            matches.push({ type: 'sandbox_match', rawValue: m[0], index: m.index });
          }
        }
        return JSON.stringify(matches);
      `;
      const result = await sandbox.run<string>(code, job.data);
      this.activeCount--;
      this.processQueue();
      sandbox.dispose();
      return JSON.parse(result);
    } catch (err) {
      this.activeCount--;
      this.processQueue();
      sandbox.dispose();
      throw err;
    }
  }

  private async runInline(job: WorkerJob): Promise<any> {
    this.activeCount++;
    try {
      const taintEngine = new TaintEngine();
      const scanner = new Scanner({}, taintEngine);
      let result;
      if (job.type === 'scan') {
        result = await scanner.scan(job.data);
      }
      this.activeCount--;
      this.processQueue();
      return result;
    } catch (err) {
      this.activeCount--;
      this.processQueue();
      throw err;
    }
  }

  private spawnAndRun(job: WorkerJob): Promise<any> {
    this.activeCount++;
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker-script.js', import.meta.url), {
        workerData: job,
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        this.activeCount--;
        this.processQueue();
        reject(new Error('Worker job timed out'));
      }, this.jobTimeoutMs);

      worker.on('message', (result) => {
        clearTimeout(timeout);
        this.activeCount--;
        this.processQueue();
        resolve(result);
        worker.terminate();
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        this.activeCount--;
        this.processQueue();
        reject(err);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          this.activeCount--;
          this.processQueue();
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.size) {
      const { job, resolve, reject } = this.queue.shift()!;
      this.spawnAndRun(job).then(resolve).catch(reject);
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

if (!isMainThread && parentPort) {
  const { type, data } = workerData as WorkerJob;
  const taintEngine = new TaintEngine();
  const scanner = new Scanner({}, taintEngine);

  if (type === 'scan') {
    scanner.scan(data).then(matches => {
      parentPort?.postMessage(matches);
    });
  }
}
