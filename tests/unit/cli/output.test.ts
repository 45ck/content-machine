import { describe, expect, it } from 'vitest';
import { buildJsonEnvelope } from '../../../src/cli/output';

describe('cli output helpers', () => {
  it('builds a JSON envelope with required fields', () => {
    const result = buildJsonEnvelope({
      command: 'script',
      args: { topic: 'Redis' },
      outputs: { scriptPath: 'script.json' },
      timingsMs: 123,
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.command).toBe('script');
    expect(result.args).toEqual({ topic: 'Redis' });
    expect(result.outputs).toEqual({ scriptPath: 'script.json' });
    expect(result.timingsMs).toBe(123);
    expect(result.errors).toEqual([]);
  });
});
