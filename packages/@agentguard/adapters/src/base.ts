import { AgentGuard } from '@roadsidelab/keyspot-core';

export interface VectorStoreAdapter {
  wrap(store: any): any;
}

export abstract class BaseVectorStoreAdapter implements VectorStoreAdapter {
  constructor(protected guard: AgentGuard) {}

  abstract wrap(store: any): any;

  protected async sanitizeDocuments<T>(documents: T[]): Promise<T[]> {
    const sanitized: T[] = [];
    for (const doc of documents) {
      // Wrap primitives so checkpoint can replace values by path
      const wrapped = typeof doc === 'string' || typeof doc === 'number'
        ? { _value: doc }
        : doc;
      const clean = await this.guard.checkpoint(wrapped);
      if (typeof doc === 'string' || typeof doc === 'number') {
        sanitized.push((clean as any)._value ?? doc);
      } else {
        sanitized.push(clean);
      }
    }
    return sanitized;
  }
}
