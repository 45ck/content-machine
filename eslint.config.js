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
      '**/tmp/**',
      '**/output/**',
      '**/report/**',
      '**/test-e2e-output/**',
      '**/vendor/**',
      '**/templates/**',
      '**/connectors/**',
      '**/docs/api/**',
      '**/*.d.ts',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

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

      // === MAINTAINABILITY GATES (FAIL) ===
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-depth': ['error', 5],

      // === MAINTAINABILITY GATES (STRICT) ===
      'max-params': ['error', 6],
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'sonarjs/no-duplicate-string': ['error', { threshold: 5 }],
      'sonarjs/no-identical-functions': 'error',
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
