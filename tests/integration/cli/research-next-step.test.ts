import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';

describe('cm research Next: guidance', () => {
  it('prints a Next: hint for using research with cm script', async () => {
    const result = await runCli(['research', '--query', 'redis', '--dry-run'], undefined, 60000);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('Next:');
    expect(result.stderr).toContain('cm script');
    expect(result.stderr).toContain('--research');
  });
});

