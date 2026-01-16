import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.cache/**',
      '**/.stryker-tmp/**',
      '.stryker-tmp/**',
      '**/tmp/**',
      '**/output/**',
      '**/report/**',
      '**/reports/**',
      'reports/**',
      '**/test-e2e-output/**',
      '**/vendor/**',
      '**/templates/**',
      '**/connectors/**',
      '**/docs/api/**',
      '**/*.d.ts',
      'scripts/run-vitest.mjs',
    ],
  },

  // Base recommended rules
  {
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        // NOTE: No `project` — avoids type-aware linting issues
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
    },
    rules: {
      // Disable base rules replaced by TS versions
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // === MAINTAINABILITY GATES ===
      // Keep these as guidance (warn) so CI stays green while the project matures.
      complexity: ['warn', 30],
      'sonarjs/cognitive-complexity': ['warn', 30],
      'max-depth': ['warn', 6],
      'max-params': ['warn', 8],
      'max-lines-per-function': [
        'warn',
        { max: 200, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 10 }],
      'sonarjs/no-identical-functions': 'warn',
    },
  },

  // Enforce centralized domain model imports.
  // - Schemas/types/errors should be imported from `src/domain` rather than scattered `*/schema` modules.
  // - Allow schema modules themselves to compose schemas directly without going through the domain barrel.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/domain/**', '**/schema.ts', '**/schema.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/schema', '**/schema.ts', '**/*-schema', '**/*-schema.ts'],
              message: 'Import schemas/types from `src/domain` instead of `*/schema`.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/cli/commands/generate.ts', 'src/cli/commands/render.ts'],
    rules: {
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // Test files: relax complexity rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off', // Test assertions often repeat strings
    },
  },
];
