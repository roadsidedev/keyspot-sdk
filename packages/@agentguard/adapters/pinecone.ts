import { BaseVectorStoreAdapter } from './vector.js';
import { Pinecone, Index } from '@pinecone-database/pinecone';

export class ProductionPineconeAdapter extends BaseVectorStoreAdapter {
  wrap(index: Index) {
    const originalUpsert = index.upsert.bind(index);
    
    // Override upsert to ensure all vectors are sanitized before storage
    index.upsert = async (records: any[]) => {
      console.log(`[PineconeAdapter] Sanitizing ${records.length} records...`);
      const sanitized = await this.sanitizeDocuments(records);
      return originalUpsert(sanitized);
    };

    return index;
  }
}
