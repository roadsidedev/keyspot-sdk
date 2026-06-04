import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';

export interface WorkerJob {
  type: 'scan' | 'prune';
  data: any;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: { job: WorkerJob; resolve: (val: any) => void; reject: (err: any) => void }[] = [];
  private activeCount = 0;

  constructor(private size: number = 4) {
    this.init();
  }

  private init() {
    // Workers will be spawned on demand up to this.size
  }

  async run(job: WorkerJob): Promise<any> {
    if (this.activeCount < this.size) {
      return this.spawnAndRun(job);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve, reject });
    });
  }

  private spawnAndRun(job: WorkerJob): Promise<any> {
    this.activeCount++;
    return new Promise((resolve, reject) => {
      // In a real monorepo, we'd point to the compiled JS worker file
      const worker = new Worker(new URL('./worker-script.js', import.meta.url), {
        workerData: job
      });

      worker.on('message', (result) => {
        this.activeCount--;
        this.processQueue();
        resolve(result);
        worker.terminate(); // Recycle for hardening
      });

      worker.on('error', (err) => {
        this.activeCount--;
        this.processQueue();
        reject(err);
      });
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.size) {
      const { job, resolve, reject } = this.queue.shift()!;
      this.spawnAndRun(job).then(resolve).catch(reject);
    }
  }
}

// Worker script logic (would be in a separate file in production)
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
