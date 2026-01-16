import { describe, expect, it } from 'vitest';
import { CMError, RateLimitError } from '../../../src/core/errors';
import { formatCliErrorLines, getCliErrorInfo, getExitCodeForError } from '../../../src/cli/format';

describe('cli format helpers', () => {
  it('formats CMError with fix line and exit code 2 for invalid usage', () => {
    const error = new CMError('INVALID_ARGUMENT', 'Bad duration', { fix: 'Use --duration 45' });

    const info = getCliErrorInfo(error);

    expect(info.code).toBe('INVALID_ARGUMENT');
    expect(info.message).toBe('Bad duration');
    expect(info.fix).toBe('Use --duration 45');

    const lines = formatCliErrorLines(info);
    expect(lines[0]).toBe('ERROR: Bad duration');
    expect(lines).toContain('Fix: Use --duration 45');

    expect(getExitCodeForError(info)).toBe(2);
  });

  it('formats unknown errors with UNKNOWN_ERROR and exit code 1', () => {
    const error = new Error('Unexpected failure');

    const info = getCliErrorInfo(error);

    expect(info.code).toBe('UNKNOWN_ERROR');
    expect(info.message).toBe('Unexpected failure');
    expect(info.fix).toBeUndefined();

    const lines = formatCliErrorLines(info);
    expect(lines[0]).toBe('ERROR: Unexpected failure');
    expect(getExitCodeForError(info)).toBe(1);
  });

  it('includes context and retryable hints when available', () => {
    const error = new RateLimitError('openai', 30);
    const info = getCliErrorInfo(error);

    const lines = formatCliErrorLines(info);
    expect(lines).toContain('Context:');
    expect(lines.some((line) => line.includes('provider: "openai"'))).toBe(true);
    expect(lines.some((line) => line.includes('retryAfter: 30'))).toBe(true);
    expect(lines).toContain('WARN: This error may be temporary. Try again in a few moments.');
  });

  it('stringifies non-error values', () => {
    const info = getCliErrorInfo('nope');
    expect(info.code).toBe('UNKNOWN_ERROR');
    expect(info.message).toBe('nope');
  });
});
