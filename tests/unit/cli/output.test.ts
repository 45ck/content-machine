import { describe, expect, it } from 'vitest';
import {
  buildJsonEnvelope,
  setOutputWriter,
  writeJsonEnvelope,
  writeStderr,
  writeStderrLine,
  writeStdout,
  writeStdoutLine,
} from '../../../src/cli/output';

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

  it('applies defaults for optional fields', () => {
    const result = buildJsonEnvelope({ command: 'x' });
    expect(result.args).toEqual({});
    expect(result.outputs).toEqual({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('writes through an injected writer when present', () => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    setOutputWriter((fd, chunk) => {
      if (fd === 1) stdoutChunks.push(chunk);
      if (fd === 2) stderrChunks.push(chunk);
    });

    writeStdoutLine('hello');
    writeStderrLine('oops');
    writeJsonEnvelope(buildJsonEnvelope({ command: 'script' }));

    setOutputWriter(null);

    expect(stdoutChunks.join('')).toContain('hello\n');
    expect(stdoutChunks.join('')).toContain('"schemaVersion": 1');
    expect(stdoutChunks.join('')).toMatch(/\n$/);
    expect(stderrChunks.join('')).toBe('oops\n');
  });

  it('falls back to writing directly when no writer is set', () => {
    setOutputWriter(null);
    writeStdout('');
    writeStderr('');
  });
});
