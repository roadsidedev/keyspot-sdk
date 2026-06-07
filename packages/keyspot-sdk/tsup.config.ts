import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/index': 'src/adapters/index.ts',
    'frameworks/index': 'src/frameworks/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  noExternal: [
    '@roadsidelab/keyspot-core',
    '@roadsidelab/keyspot-vault',
    '@roadsidelab/keyspot-patterns',
    '@roadsidelab/keyspot-adapters',
    '@roadsidelab/keyspot-frameworks',
    '@roadsidelab/keyspot-cli',
  ],
  external: [
    '@pinecone-database/pinecone',
    'chromadb',
    '@qdrant/js-client-rest',
    'weaviate-ts-client',
    'lancedb',
    '@zilliz/milvus2-sdk-node',
    '@aws-sdk/client-secrets-manager',
  ],
  clean: true,
  splitting: false,
  shims: true,
});
