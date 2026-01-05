# Implementation Plan: OSS-Friendly Code Quality Gates

**Date:** 2026-01-05  
**Status:** Ready for Implementation  
**Type:** Infrastructure  
**Estimated Effort:** 2-3 hours

---

## Overview

Implement maintainability-focused code quality gates optimized for open-source contribution. The system enforces complexity limits, coverage thresholds, and duplication detection while remaining contributor-friendly.

### Goals

1. **Prevent hard-to-change code** from accumulating (complexity/depth gates)
2. **Ensure test coverage** with achievable initial thresholds
3. **Detect code duplication** before it becomes technical debt
4. **Reduce PR friction** with deterministic, fast CI gates
5. **Support contributor success** with clear local validation steps

### Non-Goals

- Mutation testing (defer until coverage ≥70%)
- Pre-commit hooks (adds contributor friction)
- Type-aware ESLint rules (breaks on contributor environments)
- Per-file coverage enforcement (defer until overall coverage ≥70%)

---

## Architecture

### Quality Gate Pipeline (CI Order)

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────────┐
│  Typecheck  │───▶│    Lint     │───▶│ Format Check │───▶│ Test+Coverage │───▶│ Duplication │
│   (tsc)     │    │  (ESLint)   │    │  (Prettier)  │    │   (Vitest)    │    │   (jscpd)   │
└─────────────┘    └─────────────┘    └──────────────┘    └───────────────┘    └─────────────┘
      │                  │                  │                    │                   │
      ▼                  ▼                  ▼                    ▼                   ▼
   0 errors         0 errors            0 diffs            ≥60% coverage         ≤5% clones
                  (complexity,                             (lines/funcs)
                   depth caps)
```

### Threshold Summary

| Metric | Ideal | Warn | Fail | Tool |
|--------|-------|------|------|------|
| Cyclomatic Complexity | ≤10 | 11-15 | >15 | ESLint `complexity` |
| Cognitive Complexity | ≤8 | 9-15 | >15 | `sonarjs/cognitive-complexity` |
| Nesting Depth | ≤3 | 4 | ≥5 | ESLint `max-depth` |
| LOC per Function | ≤50 | 51-80 | >100 | ESLint `max-lines-per-function` |
| Line Coverage | ≥80% | 60-79% | <60% | Vitest coverage |
| Branch Coverage | ≥70% | 50-69% | <50% | Vitest coverage |
| Code Duplication | <3% | 3-5% | >5% | jscpd |

### Exclusion Strategy (OSS-Critical)

All quality tools MUST exclude:
- `vendor/**` — 139+ vendored repos
- `templates/**` — Remotion templates
- `connectors/**` — MCP connectors
- `dist/**` — Build output
- `coverage/**` — Coverage reports
- `node_modules/**` — Dependencies
- `**/*.d.ts` — Type declarations

Test files (`**/*.test.ts`, `tests/**`) excluded from:
- Complexity rules (tests often have long setup)
- Duplication detection (test fixtures repeat)
- NOT excluded from coverage (tests must run)

---

## Implementation Steps

### Step 1: Install Dependencies

**Command:**
```bash
pnpm add -D @eslint/js globals @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-sonarjs prettier jscpd
```

**Rationale:**
| Package | Purpose |
|---------|---------|
| `@eslint/js` | ESLint v9 recommended config |
| `globals` | Browser/Node global definitions |
| `@typescript-eslint/parser` | TypeScript parsing (no type-aware) |
| `@typescript-eslint/eslint-plugin` | TS-specific rules |
| `eslint-plugin-sonarjs` | Cognitive complexity, code smells |
| `prettier` | Code formatting |
| `jscpd` | Copy-paste detection |

---

### Step 2: Create ESLint Flat Config

**File:** `eslint.config.js`

**Key Decisions:**
- **No type-aware linting** — Omit `parserOptions.project` to avoid contributor friction and CI slowdown. TypeScript correctness enforced by `pnpm typecheck`.
- **Fail on maintainability gates** — `complexity`, `cognitive-complexity`, `max-depth`
- **Warn on style gates** — `max-lines-per-function`, `max-params`, `no-duplicate-string`
- **Relax rules for tests** — Tests often have long setup, repeated fixtures

**Configuration:**
```javascript
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
      '**/vendor/**',
      '**/templates/**',
      '**/connectors/**',
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
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // === MAINTAINABILITY GATES (FAIL) ===
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-depth': ['error', 5],

      // === MAINTAINABILITY NUDGES (WARN) ===
      'max-params': ['warn', 6],
      'max-lines-per-function': [
        'warn',
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'sonarjs/no-duplicate-string': ['warn', 5],
      'sonarjs/no-identical-functions': 'warn',
    },
  },

  // Test files: relax complexity rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
      'max-lines-per-function': 'off',
    },
  },
];
```

---

### Step 3: Update Vitest Coverage Config

**File:** `vitest.config.ts`

**Key Decisions:**
- **Explicit include/exclude** — Ensures coverage scope matches source code only
- **Overall thresholds only** — No `perFile` initially (blocks PRs on legacy modules)
- **No autoUpdate** — Ratcheting is a deliberate maintainer action, not automated
- **Commented glob thresholds** — Ready to enable for `src/core/**` when coverage improves

**Configuration:**
```typescript
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
```

---

### Step 4: Create jscpd Config

**File:** `.jscpd.json`

**Key Decisions:**
- **5% threshold** — Tighten to 3% when codebase stabilizes
- **70 minTokens** — Avoids false positives on short snippets
- **Exclude tests** — Test fixtures legitimately repeat setup code

**Configuration:**
```json
{
  "threshold": 5,
  "reporters": ["console", "json"],
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/vendor/**",
    "**/templates/**",
    "**/connectors/**",
    "**/.git/**",
    "tests/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "format": ["typescript", "javascript"],
  "minTokens": 70,
  "absolute": true
}
```

---

### Step 5: Create Prettier Config

**File:** `.prettierrc`

**Configuration:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true
}
```

**File:** `.prettierignore`

```
node_modules/
dist/
coverage/
vendor/
templates/
connectors/
*.d.ts
pnpm-lock.yaml
```

---

### Step 6: Update package.json Scripts

**Changes to `package.json`:**

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli/index.ts",
    "cm": "tsx src/cli/index.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "typecheck": "tsc --noEmit",
    "dup:check": "jscpd --config .jscpd.json",
    "quality": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:coverage && pnpm dup:check",
    "eval": "npx promptfoo eval",
    "eval:script": "npx promptfoo eval -c evals/configs/cm-script.yaml"
  }
}
```

**New Scripts:**
| Script | Purpose |
|--------|---------|
| `lint:fix` | Auto-fix ESLint issues |
| `format` | Format all files with Prettier |
| `format:check` | Check formatting (CI) |
| `dup:check` | Run duplication detection |
| `quality` | Run all quality checks locally |

---

### Step 7: Create GitHub Actions CI Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Test with coverage
        run: pnpm test:coverage

      - name: Duplication check
        run: pnpm dup:check

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

---

### Step 8: Create OSS Meta-Files

#### SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email security concerns to: [your-email@example.com]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours. If the issue is confirmed, we will:
1. Work on a fix privately
2. Release a patch
3. Credit you in the release notes (unless you prefer anonymity)

## Security Best Practices for Contributors

- Never commit API keys or secrets
- Use `.env` files (listed in `.gitignore`)
- Validate all external inputs with Zod schemas
- Review dependencies for known vulnerabilities
```

#### CODE_OF_CONDUCT.md

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to a positive environment:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior:

* Trolling, insulting/derogatory comments, and personal attacks
* Public or private harassment
* Publishing others' private information without permission
* Other conduct which could reasonably be considered inappropriate

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the project maintainers. All complaints will be reviewed and
investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
```

#### .github/pull_request_template.md

```markdown
## Description

<!-- What does this PR do? Why is it needed? -->

## Related Issue

<!-- Link to issue: Fixes #123 or Closes #456 -->

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Checklist

### Before Submitting

- [ ] I have read [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] My code follows the project's style guidelines
- [ ] I have run `pnpm quality` locally and all checks pass

### Testing

- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally (`pnpm test`)
- [ ] Coverage thresholds are met (`pnpm test:coverage`)

### Documentation

- [ ] I have updated relevant documentation
- [ ] Documentation follows the `YYYYMMDD` date convention

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional context or notes for reviewers -->
```

#### .github/ISSUE_TEMPLATE/bug.yml

```yaml
name: Bug Report
description: Report a bug or unexpected behavior
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug!

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear description of the bug
      placeholder: What happened? What did you expect to happen?
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: How can we reproduce this bug?
      placeholder: |
        1. Run command `cm generate "topic"`
        2. Wait for processing
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should have happened?
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Your system information
      value: |
        - OS: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
        - Node.js: [e.g., 20.10.0]
        - pnpm: [e.g., 9.0.0]
        - content-machine: [e.g., 0.1.0]
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Relevant Logs
      description: Paste any error messages or logs
      render: shell

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched for existing issues
          required: true
        - label: I am using the latest version
          required: false
```

#### .github/ISSUE_TEMPLATE/feature.yml

```yaml
name: Feature Request
description: Suggest a new feature or enhancement
labels: ["enhancement", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature!

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this feature solve?
      placeholder: I'm frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How should this feature work?
      placeholder: I would like to be able to...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other solutions have you considered?

  - type: dropdown
    id: archetype
    attributes:
      label: Related Archetype
      description: Does this relate to a specific content archetype?
      options:
        - Not applicable
        - listicle
        - versus
        - howto
        - myth
        - story
        - hot-take

  - type: checkboxes
    id: contribution
    attributes:
      label: Contribution
      options:
        - label: I am willing to help implement this feature
          required: false
```

---

### Step 9: Update CONTRIBUTING.md

Add new section after "Getting Started":

```markdown
## Local Quality Checks

Before opening a PR, run all quality checks locally:

```bash
# Run all checks at once
pnpm quality

# Or run individually:
pnpm typecheck      # TypeScript compilation
pnpm lint           # ESLint (complexity, depth gates)
pnpm format:check   # Prettier formatting
pnpm test:coverage  # Tests with coverage thresholds
pnpm dup:check      # Code duplication detection
```

### Quality Gate Thresholds

| Check | Threshold | Action on Failure |
|-------|-----------|-------------------|
| Cyclomatic complexity | ≤15 per function | Refactor into smaller functions |
| Cognitive complexity | ≤15 per function | Simplify logic flow |
| Nesting depth | ≤5 levels | Extract nested blocks |
| Line coverage | ≥60% | Add tests for uncovered code |
| Branch coverage | ≥50% | Add tests for edge cases |
| Code duplication | ≤5% | Extract shared utilities |

### Fixing Common Issues

**Complexity too high:**
```typescript
// ❌ High complexity
function processData(data) {
  if (data.type === 'A') {
    if (data.subtype === 'A1') { /* ... */ }
    else if (data.subtype === 'A2') { /* ... */ }
  } else if (data.type === 'B') { /* ... */ }
}

// ✅ Lower complexity
const processors = {
  'A-A1': processA1,
  'A-A2': processA2,
  'B': processB,
};
function processData(data) {
  const key = data.subtype ? `${data.type}-${data.subtype}` : data.type;
  return processors[key]?.(data);
}
```

**Coverage too low:**
- Add unit tests for new functions
- Test error paths and edge cases
- Use `pnpm test:coverage` to identify uncovered lines
```

Update "Before Creating PR" checklist:

```markdown
### Before Creating PR

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Formatting clean (`pnpm format:check`)
- [ ] Coverage thresholds met (`pnpm test:coverage`)
- [ ] No new duplication (`pnpm dup:check`)
- [ ] Task moved to `done/`
- [ ] Documentation updated (with `YYYYMMDD` date suffix)
- [ ] No hardcoded secrets
```

---

## Ratchet Schedule

Document this in CONTRIBUTING.md for transparency:

| Milestone | Coverage | Action |
|-----------|----------|--------|
| **Now** | Any | Overall thresholds: 60/60/60/50 |
| **≥70%** | 70%+ overall | Enable `src/core/**` glob threshold (70/70/70/55) |
| **≥75%** | 75%+ overall | Switch to negative thresholds (freeze uncovered counts) |
| **Quarterly** | — | Review and tighten warn-level rules |

### Switching to Negative Thresholds

When coverage reaches 75%, switch from percentage thresholds to "max uncovered" thresholds:

```typescript
thresholds: {
  // Freeze current uncovered counts (example values)
  lines: -150,      // Max 150 uncovered lines
  functions: -20,   // Max 20 uncovered functions
  statements: -200, // Max 200 uncovered statements
  branches: -80,    // Max 80 uncovered branches
}
```

This prevents coverage regression while allowing focused improvement.

---

## Verification Checklist

After implementation, verify:

- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` runs without configuration errors
- [ ] `pnpm lint` catches complexity violations (test with intentionally bad code)
- [ ] `pnpm format:check` detects unformatted files
- [ ] `pnpm test:coverage` reports coverage and enforces thresholds
- [ ] `pnpm dup:check` runs and respects threshold
- [ ] `pnpm quality` runs all checks in sequence
- [ ] CI workflow triggers on push/PR
- [ ] CI fails correctly when thresholds are violated
- [ ] Vendor folder is excluded from all tools
- [ ] Test files are excluded from complexity/duplication rules

---

## Files Created/Modified Summary

| File | Action | Purpose |
|------|--------|---------|
| `eslint.config.js` | Create | ESLint v9 flat config with complexity gates |
| `.jscpd.json` | Create | Duplication detection config |
| `.prettierrc` | Create | Code formatting rules |
| `.prettierignore` | Create | Formatting exclusions |
| `.github/workflows/ci.yml` | Create | CI pipeline |
| `SECURITY.md` | Create | Vulnerability reporting |
| `CODE_OF_CONDUCT.md` | Create | Community standards |
| `.github/pull_request_template.md` | Create | PR checklist |
| `.github/ISSUE_TEMPLATE/bug.yml` | Create | Bug report form |
| `.github/ISSUE_TEMPLATE/feature.yml` | Create | Feature request form |
| `vitest.config.ts` | Modify | Add coverage thresholds |
| `package.json` | Modify | Add quality scripts |
| `CONTRIBUTING.md` | Modify | Add quality checks section |

---

## Dependencies Added

```json
{
  "devDependencies": {
    "@eslint/js": "^9.x",
    "@typescript-eslint/eslint-plugin": "^8.x",
    "@typescript-eslint/parser": "^8.x",
    "eslint-plugin-sonarjs": "^3.x",
    "globals": "^15.x",
    "jscpd": "^4.x",
    "prettier": "^3.x"
  }
}
```

---

## References

- [ESLint v9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint complexity rule](https://eslint.org/docs/latest/rules/complexity)
- [Vitest coverage thresholds](https://vitest.dev/config/coverage)
- [jscpd configuration](https://github.com/kucherenko/jscpd)
- [SonarJS cognitive complexity](https://github.com/SonarSource/eslint-plugin-sonarjs)

---

**Last Updated:** 2026-01-05  
**Author:** content-machine maintainers
