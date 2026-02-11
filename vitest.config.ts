import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
      provider: 'custom',
      customProviderModule: './scripts/vitest/coverage-provider.mjs',
      reporter: ['text', 'json', 'html', 'lcov'],
      // We manage cleaning ourselves in `scripts/quality/clean-coverage.mjs`.
      // Vitest's built-in clean can race in some environments when using forks + coverage.
      clean: false,
      cleanOnRerun: false,
      // Explicit scope ensures thresholds are meaningful
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
      // Overall thresholds - set to current baseline, ratchet up as tests added
      thresholds: {
        // Baseline as of 2026-02-07 (see `npm run test:coverage`).
        // Keep this slightly below current to avoid flakiness while preventing regressions.
        lines: 75,
        functions: 85,
        statements: 75,
        branches: 68,
        // NOTE: perFile: true deferred until coverage ~70%

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
    poolOptions: {
      forks: {
        // Ensure each test file runs in an isolated worker so `vi.mock()` is reliable and
        // global state doesn't leak across the suite (especially under coverage).
        isolate: true,
      },
    },
    watch: false,
    alias: {
      '../errors.js': '../errors.ts',
      '../config.js': '../config.ts',
      '../logger.js': '../logger.ts',
      '../../test/stubs/fake-llm.js': '../../test/stubs/fake-llm.ts',
    },
  },
});
