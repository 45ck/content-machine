import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';

describe('cm research sources validation', () => {
  it('fails fast when unknown sources are provided (no silent drops)', async () => {
    const result = await runCli(
      ['research', '--query', 'redis', '--sources', 'reddit,not-a-real-source', '--dry-run'],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ERROR:');
    expect(result.stderr).toContain('not-a-real-source');
    expect(result.stderr).toContain('Fix:');
  });
});
