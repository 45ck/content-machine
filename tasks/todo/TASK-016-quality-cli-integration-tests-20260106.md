# TASK-016: Add CLI Integration Tests

**Type:** test
**Priority:** High
**Estimated Effort:** 4 hours
**Created:** 2026-01-06

## Objective

Add integration tests for CLI commands to ensure end-to-end functionality.

## Current State

- CLI commands have 0% test coverage
- Only unit tests for schemas and utilities
- No integration testing of full command execution

## Acceptance Criteria

- [ ] `cm script` command has integration tests
- [ ] `cm generate --mock` command has integration tests
- [ ] `cm init` command has integration tests (with mocked prompts)
- [ ] Tests run in CI
- [ ] Tests use mock providers (no real API calls)

## Implementation

### 1. Create test infrastructure

```typescript
// tests/integration/cli/helpers.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runCLI(args: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const { stdout, stderr } = await execAsync(
      `npx tsx src/cli/index.ts ${args}`
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1,
    };
  }
}
```

### 2. Add integration tests

```typescript
// tests/integration/cli/script.test.ts
import { describe, it, expect } from 'vitest';
import { runCLI } from './helpers';

describe('cm script', () => {
  it('should generate script with --mock flag', async () => {
    const { stdout, exitCode } = await runCLI(
      'script "test topic" --mock --output test-script.json'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Script generated');
  });
});
```

### 3. Add to CI

Ensure integration tests run after unit tests.

## Files to Create

- `tests/integration/cli/helpers.ts`
- `tests/integration/cli/script.test.ts`
- `tests/integration/cli/generate.test.ts`
- `tests/integration/cli/init.test.ts`

## Testing

```bash
npm run test:run -- tests/integration/cli/
```
