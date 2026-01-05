import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  esbuild: {
    target: 'node20',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'vendor', 'templates'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    },
    testTimeout: 30000,
    pool: 'forks',
    watch: false,
    alias: {
      '../errors.js': '../errors.ts',
      '../config.js': '../config.ts',
      '../logger.js': '../logger.ts',
      '../../test/stubs/fake-llm.js': '../../test/stubs/fake-llm.ts',
    },
  },
});
