import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  artifactFile,
  createHarnessFailure,
  executeHarnessTool,
  parseHarnessInput,
} from './json-stdio';

describe('parseHarnessInput', () => {
  const schema = z.object({ topic: z.string().min(1) });

  it('accepts direct JSON input', () => {
    const parsed = parseHarnessInput(schema, JSON.stringify({ topic: 'hooks' }));
    expect(parsed).toEqual({
      input: { topic: 'hooks' },
      meta: {},
    });
  });

  it('accepts wrapped JSON input with metadata', () => {
    const parsed = parseHarnessInput(
      schema,
      JSON.stringify({
        input: { topic: 'hooks' },
        meta: { actor: 'codex-cli', runId: 'run-123' },
      })
    );

    expect(parsed).toEqual({
      input: { topic: 'hooks' },
      meta: { actor: 'codex-cli', runId: 'run-123' },
    });
  });
});

describe('executeHarnessTool', () => {
  it('returns a success envelope', async () => {
    const result = await executeHarnessTool({
      tool: 'content-machine/test',
      inputSchema: z.object({ topic: z.string() }),
      rawInput: JSON.stringify({ topic: 'redis' }),
      handler: async ({ input }) => ({
        result: { echoed: input.topic },
        artifacts: [artifactFile('output/result.json', 'Result artifact')],
      }),
    });

    expect(result).toEqual({
      ok: true,
      tool: 'content-machine/test',
      result: { echoed: 'redis' },
      artifacts: [{ path: 'output/result.json', kind: 'file', description: 'Result artifact' }],
      warnings: [],
      meta: {},
    });
  });

  it('returns a failure envelope for invalid input', async () => {
    const result = await executeHarnessTool({
      tool: 'content-machine/test',
      inputSchema: z.object({ topic: z.string().min(1) }),
      rawInput: JSON.stringify({ topic: '' }),
      handler: async () => ({ result: { ok: true } }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_INPUT');
  });
});

describe('createHarnessFailure', () => {
  it('preserves explicit error codes', () => {
    const error = Object.assign(new Error('boom'), {
      code: 'BROKEN',
      details: { path: 'output/file.json' },
    });
    expect(createHarnessFailure('content-machine/test', error)).toEqual({
      ok: false,
      tool: 'content-machine/test',
      error: {
        code: 'BROKEN',
        message: 'boom',
        details: { path: 'output/file.json' },
      },
    });
  });
});
