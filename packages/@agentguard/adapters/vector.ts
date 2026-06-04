import { AgentGuard } from '../core/index.js';

export interface VectorStoreAdapter {
  wrap(store: any): any;
}

export abstract class BaseVectorStoreAdapter implements VectorStoreAdapter {
  constructor(protected guard: AgentGuard) {}

  abstract wrap(store: any): any;

  protected async sanitizeDocuments(documents: any[]): Promise<any[]> {
    const sanitized = [];
    for (const doc of documents) {
      // In a real implementation, we'd handle strings or objects
      const clean = await this.guard.checkpoint(doc);
      sanitized.push(clean);
    }
    return sanitized;
  }
}

/**
 * Mock Chroma Adapter
 */
export class ChromaAdapter extends BaseVectorStoreAdapter {
  wrap(client: any) {
    const originalAdd = client.add.bind(client);
    client.add = async (params: any) => {
      if (params.documents) {
        params.documents = await this.sanitizeDocuments(params.documents);
      }
      return originalAdd(params);
    };
    return client;
  }
}

/**
 * Mock Pinecone Adapter
 */
export class PineconeAdapter extends BaseVectorStoreAdapter {
  wrap(index: any) {
    const originalUpsert = index.upsert.bind(index);
    index.upsert = async (records: any[]) => {
      const sanitized = await this.sanitizeDocuments(records);
      return originalUpsert(sanitized);
    };
    return index;
  }
}

/**
 * Mock Qdrant Adapter
 */
export class QdrantAdapter extends BaseVectorStoreAdapter {
  wrap(client: any) {
    const originalUpsert = client.upsert.bind(client);
    client.upsert = async (collectionName: string, params: any) => {
      if (params.points) {
        params.points = await this.sanitizeDocuments(params.points);
      }
      return originalUpsert(collectionName, params);
    };
    return client;
  }
}
