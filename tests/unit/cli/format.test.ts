import { describe, expect, it } from 'vitest';
import { CMError } from '../../../src/core/errors';
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
});
