import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@roadsidelab/keyspot-sdk': path.resolve(__dirname, 'packages/keyspot-sdk/src'),
      '@roadsidelab/keyspot-sdk/adapters': path.resolve(__dirname, 'packages/@keyspot/adapters/src'),
      '@roadsidelab/keyspot-sdk/frameworks': path.resolve(__dirname, 'packages/@keyspot/frameworks/src'),
      '@roadsidelab/keyspot-sdk/cli': path.resolve(__dirname, 'packages/@keyspot/cli/src'),
      // Internal aliases (resolved through meta-package)
      '@roadsidelab/keyspot-core': path.resolve(__dirname, 'packages/@keyspot/core/src'),
      '@roadsidelab/keyspot-vault': path.resolve(__dirname, 'packages/@keyspot/vault/src'),
      '@roadsidelab/keyspot-patterns': path.resolve(__dirname, 'packages/@keyspot/patterns/src'),
      '@roadsidelab/keyspot-adapters': path.resolve(__dirname, 'packages/@keyspot/adapters/src'),
      '@roadsidelab/keyspot-frameworks': path.resolve(__dirname, 'packages/@keyspot/frameworks/src'),
      '@roadsidelab/keyspot-cli': path.resolve(__dirname, 'packages/@keyspot/cli/src'),
      '@roadsidelab/keyspot-server': path.resolve(__dirname, 'packages/@keyspot/server/src/app.ts'),
      '@roadsidelab/keyspot-server/metrics': path.resolve(__dirname, 'packages/@keyspot/server/src/metrics.ts'),
    }
  },
  plugins: [
    {
      name: 'resolve-js-to-ts',
      enforce: 'pre',
      resolveId(source: string, _importer: string | undefined) {
        if (source.endsWith('.js')) {
          const tsSource = source.replace(/\.js$/, '.ts');
          return this.resolve(tsSource, _importer, { skipSelf: true })
            .then(resolved => resolved || null);
        }
        return null;
      }
    }
  ],
  test: {
    globals: true,
    environment: 'node',
    env: {
      JWT_SECRET: 'test-jwt-secret-for-vitest',
      MIGRATION_SECRET: 'test-migration-secret-for-vitest',
      X402_JWT_SECRET: 'test-x402-jwt-secret-for-vitest',
    },
    include: ['tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    }
  }
});
