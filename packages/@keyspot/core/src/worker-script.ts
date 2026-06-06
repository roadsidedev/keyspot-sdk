import { parentPort, workerData } from 'node:worker_threads';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';

const { type, data } = workerData as { type: 'scan' | 'prune'; data: any };

const taintEngine = new TaintEngine();
const scanner = new Scanner({}, taintEngine);

if (type === 'scan') {
  scanner.scan(data).then(matches => {
    parentPort?.postMessage(matches);
  });
}
