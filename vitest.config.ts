import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@roadsidelab/keyspot-core': path.resolve(__dirname, 'packages/@keyspot/core/src'),
      '@roadsidelab/keyspot-vault': path.resolve(__dirname, 'packages/@keyspot/vault/src'),
      '@roadsidelab/keyspot-patterns': path.resolve(__dirname, 'packages/@keyspot/patterns/src'),
      '@roadsidelab/keyspot-adapters': path.resolve(__dirname, 'packages/@keyspot/adapters/src'),
      '@roadsidelab/keyspot-x402': path.resolve(__dirname, 'packages/@keyspot/x402/src'),
      '@roadsidelab/keyspot-server': path.resolve(__dirname, 'packages/@keyspot/server/src/app.ts'),
      '@roadsidelab/keyspot-frameworks': path.resolve(__dirname, 'packages/@keyspot/frameworks/src'),
      '@roadsidelab/keyspot-cli': path.resolve(__dirname, 'packages/@keyspot/cli/src'),
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
