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
    exclude: ['node_modules', 'dist', 'vendor', 'templates', 'connectors'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Explicit scope — ensures thresholds are meaningful
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/**',
        'vendor/**',
        'templates/**',
        'connectors/**',
        'dist/**',
        'src/**/index.ts',
      ],
      // Overall thresholds (no perFile initially)
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
        // NOTE: perFile: true deferred until coverage ≥70%

        // Glob-specific thresholds (enable when ready):
        // 'src/core/**': {
        //   lines: 70,
        //   functions: 70,
        //   statements: 70,
        //   branches: 55,
        // },
      },
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
