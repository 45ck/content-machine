# Contributing to Content Machine

Thank you for your interest in contributing to Content Machine! This document provides guidelines and workflows for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Testing](#testing)

---

## Code of Conduct

This project follows a code of conduct. By participating, you agree to:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intent

---

## Getting Started

### Prerequisites

- Node.js `>=20` (canonical: [`docs/reference/REPO-FACTS.md`](docs/reference/REPO-FACTS.md))
- Git
- Basic understanding of TypeScript, Remotion, and MCP

### Setup

1. **Fork and clone:**

   ```bash
   # Option A: GitHub UI: fork, then clone your fork
   git clone --recurse-submodules https://github.com/<you>/content-machine.git
   cd content-machine
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Initialize/update submodules (vendored repos):**

   ```bash
   git submodule update --init --recursive
   ```

4. **Set up environment:**

   ```bash
   cp .env.example .env
   # Add any required API keys (see docs/reference/ENVIRONMENT-VARIABLES.md)
   ```

5. **Read the docs:**
   - `AGENTS.md` - Project overview
   - `docs/README.md` - Documentation index
   - `tasks/README.md` - Task workflow
   - `docs/dev/README.md` - Dev docs and "single source of truth" rules

### Single Sources Of Truth (Required)

This repo enforces canonical registries for terminology and repo-wide facts:

- Repo facts registry (edit): `registry/repo-facts.yaml`
  - Generate outputs: `npm run repo-facts:gen`
- Ubiquitous language registry (edit): `registry/ubiquitous-language.yaml`
  - Generate outputs: `npm run glossary:gen && npm run ul:gen`

---

## Local Quality Checks

Before opening a PR, run all quality checks locally:

```bash
# Run all checks at once
npm run quality

# Or run individually:
npm run typecheck      # TypeScript compilation
npm run lint           # ESLint (complexity, depth gates)
npm run format:check   # Prettier formatting
npm run test:coverage  # Tests with coverage thresholds
npm run dup:check      # Code duplication detection
```

### Quality Gate Rules (Source Of Truth)

Avoid duplicating thresholds in docs. The enforced rules live in config:

- Lint rules + maintainability gates: `eslint.config.js`
- Coverage thresholds + exclusions: `vitest.config.ts`
- Duplication rules: `.jscpd.json`

---

## Development Workflow

### Task-Based Development

**REQUIRED:** All work must be tracked via tasks in `tasks/`.

1. **Check existing tasks:**

   ```bash
   ls tasks/todo/*.md
   ```

2. **Create a task:**

   ```bash
   # Copy appropriate template
   cp tasks/templates/TASK-FEATURE.template.md tasks/todo/TASK-NNN-feature-your-feature-YYYYMMDD.md
   ```

3. **Move to in-progress:**

   ```bash
   mv tasks/todo/TASK-NNN-*.md tasks/in_progress/
   ```

4. **Follow TDD:**
   - 🔴 RED: Write failing test
   - 🟢 GREEN: Implement minimal fix
   - 🔵 REFACTOR: Improve code

5. **Complete verification checklist** in task file

6. **Move to done:**
   ```bash
   mv tasks/in_progress/TASK-NNN-*.md tasks/done/
   ```

---

## Pull Request Process

### Before Creating PR

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linting clean (`npm run lint`)
- [ ] Formatting clean (`npm run format:check`)
- [ ] Coverage thresholds met (`npm run test:coverage`)
- [ ] No new duplication (`npm run dup:check`)
- [ ] Task moved to `done/`
- [ ] Documentation updated (with `YYYYMMDD` date suffix)
- [ ] No hardcoded secrets

### PR Template

```markdown
## Description

[What does this PR do?]

## Related Task

Closes #NNN [TASK-NNN-type-description-YYYYMMDD.md](link)

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed

## Documentation

- [ ] AGENTS.md updated (if needed)
- [ ] docs/ updated with YYYYMMDD suffix
- [ ] README updated (if needed)
- [ ] Task file completed

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] Tests pass locally
- [ ] No merge conflicts
- [ ] Branch up to date with main
```

### Review Process

1. **Automated checks** run on PR
2. **Maintainer review** (1-2 business days)
3. **Address feedback** if needed
4. **Merge** when approved

---

## Coding Standards

### File Naming

**Documentation:**

- Format: `[type]-[name]-YYYYMMDD.md`
- Example: `feature-mcp-reddit-20260102.md`

**Tasks:**

- Format: `TASK-NNN-[type]-[name]-YYYYMMDD.md`
- Example: `TASK-001-feature-captions-20260102.md`

**Code:**

- camelCase for variables/functions
- PascalCase for classes/types
- kebab-case for file names

### TypeScript

```typescript
// ✅ Good
export interface VideoConfig {
  duration: number;
  fps: number;
  width: number;
  height: number;
}

// ✅ Good
export const createVideo = async (config: VideoConfig): Promise<Video> => {
  // Implementation
};

// ❌ Bad - no types
export const createVideo = async (config) => {
  // Implementation
};
```

### Error Handling

```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new VideoGenerationError('Failed to generate video', { cause: error });
}

// ❌ Bad - swallowed errors
try {
  await riskyOperation();
} catch (error) {
  // Silent failure
}
```

### Logging

```typescript
// ✅ Good - structured logging
logger.info('Video generated', {
  videoId,
  duration,
  outputPath,
  timestamp: new Date().toISOString(),
});

// ❌ Bad - console.log
console.log('Video generated:', videoId);
```

---

## Documentation

### Date Convention (MANDATORY)

**ALL documentation MUST include `YYYYMMDD` suffix:**

✅ **Correct:**

- `feature-caption-system-20260102.md`
- `adr-001-use-remotion-20260102.md`
- `guide-setup-playwright-20260102.md`

❌ **Wrong:**

- `feature-caption-system.md` (NO DATE)
- `adr-001-use-remotion.md` (NO DATE)

### Templates

**ALWAYS use templates** from `docs/dev/templates/`:

- Feature specs → `FEATURE.template.md`
- Bug reports → `BUG.template.md`
- ADRs → `ADR.template.md`
- Guides → `GUIDE.template.md`

### Diátaxis Framework

Follow [Diátaxis](https://diataxis.fr/) categorization:

- **Tutorials** - Learning-oriented (step-by-step)
- **Guides** - Task-oriented (solve specific problem)
- **Reference** - Information-oriented (technical specs)
- **Explanation** - Understanding-oriented (concepts)

---

## Testing

### Test Structure

```typescript
// tests/unit/example.test.ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/module';

describe('functionToTest', () => {
  it('should handle valid input', () => {
    const result = functionToTest(validInput);
    expect(result).toBe(expectedOutput);
  });

  it('should throw on invalid input', () => {
    expect(() => functionToTest(invalidInput)).toThrow(ErrorType);
  });
});
```

### TDD Workflow (Required)

**Tests MUST be written BEFORE implementation:**

1. **🔴 RED**: Write failing test

   ```bash
   npm test
   # Test should FAIL
   ```

2. **🟢 GREEN**: Write minimal code to pass

   ```bash
   # Implement feature
   npm test
   # Test should PASS
   ```

3. **🔵 REFACTOR**: Improve code
   ```bash
   # Clean up code
   npm test
   # Tests still PASS
   ```

### Coverage

- Target: 80% overall
- Critical paths: 90%+
- New code: Must have tests

---

## Areas Needing Contribution

### High Priority

- [ ] MCP Reddit connector implementation
- [ ] Playwright capture pipeline
- [ ] Remotion template development
- [ ] Script generation agent

### Documentation

- [ ] Tutorial: Your first video
- [ ] Guide: Custom caption styles
- [ ] Guide: Add MCP connector
- [ ] Reference: API documentation

### Infrastructure

- [ ] CI/CD workflow (`.github/workflows/ci.yml`)
- [ ] Docker compose for local dev
- [ ] Performance benchmarks

---

## Questions?

- **Issues:** https://github.com/45ck/content-machine/issues
- **Discussions:** https://github.com/45ck/content-machine/discussions
- **Email:** [your-email] (for security issues only)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Last Updated:** 2026-01-02
