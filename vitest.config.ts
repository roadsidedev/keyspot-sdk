import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@agentguard/core': path.resolve(__dirname, 'packages/@agentguard/core/src'),
      '@agentguard/vault': path.resolve(__dirname, 'packages/@agentguard/vault/src'),
      '@agentguard/patterns': path.resolve(__dirname, 'packages/@agentguard/patterns/src'),
      '@agentguard/adapters': path.resolve(__dirname, 'packages/@agentguard/adapters/src'),
      '@agentguard/x402': path.resolve(__dirname, 'packages/@agentguard/x402/src'),
      '@agentguard/server': path.resolve(__dirname, 'packages/@agentguard/server/src'),
      '@agentguard/frameworks': path.resolve(__dirname, 'packages/@agentguard/frameworks/src'),
      '@agentguard/cli': path.resolve(__dirname, 'packages/@agentguard/cli/src'),
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
