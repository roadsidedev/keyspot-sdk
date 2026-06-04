import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';
import { existsSync } from 'node:fs';

export interface WorkerJob {
  type: 'scan' | 'prune';
  data: any;
}

export class WorkerPool {
  private queue: { job: WorkerJob; resolve: (val: any) => void; reject: (err: any) => void }[] = [];
  private activeCount = 0;
  private useInlineFallback = false;

  constructor(
    private size: number = 4,
    private _recycleAfter: number = 100,
    private jobTimeoutMs: number = 30000
  ) {
    this.useInlineFallback = !this.workerScriptExists();
  }

  private workerScriptExists(): boolean {
    try {
      const url = new URL('./worker-script.js', import.meta.url);
      return existsSync(url.pathname);
    } catch {
      return false;
    }
  }

  async run(job: WorkerJob): Promise<any> {
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
        workerData: job
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
