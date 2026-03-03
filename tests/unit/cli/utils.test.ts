import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  readInputFile,
  writeOutputFile,
  handleCommandError,
  formatDuration,
  formatFileSize,
  parseWhisperModel,
} from '../../../src/cli/utils';
import { resetCliRuntime, setCliRuntime } from '../../../src/cli/runtime';
import { CMError } from '../../../src/core/errors';
import * as output from '../../../src/cli/output';
import * as format from '../../../src/cli/format';
import { logger } from '../../../src/core/logger';
import * as fsPromises from 'fs/promises';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('../../../src/core/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('../../../src/cli/format', () => ({
  formatCliErrorLines: vi.fn(),
  getCliErrorInfo: vi.fn(),
  getExitCodeForError: vi.fn(),
}));

describe('cli utils', () => {
  beforeEach(() => {
    resetCliRuntime();
    vi.clearAllMocks();
    output.setOutputWriter(() => {});
  });

  afterEach(() => {
    output.setOutputWriter(null);
  });

  it('readInputFile parses JSON content', async () => {
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('{"ok":true}');
    await expect(readInputFile('input.json')).resolves.toEqual({ ok: true });
  });

  it('readInputFile throws CMError for missing files', async () => {
    const err = Object.assign(new Error('missing'), { code: 'ENOENT' });
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    await expect(readInputFile('missing.json')).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
  });

  it('readInputFile throws CMError for invalid JSON', async () => {
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('{nope');
    await expect(readInputFile('bad.json')).rejects.toMatchObject({ code: 'INVALID_JSON' });
  });

  it('readInputFile rethrows unknown errors', async () => {
    const err = new Error('boom');
    (fsPromises.readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    await expect(readInputFile('err.json')).rejects.toThrow('boom');
  });

  it('writeOutputFile creates directories and writes pretty JSON', async () => {
    (fsPromises.mkdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fsPromises.writeFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await writeOutputFile('out/dir/file.json', { hello: 'world' });

    expect(fsPromises.mkdir).toHaveBeenCalledWith('out/dir', { recursive: true });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      'out/dir/file.json',
      '{\n  "hello": "world"\n}',
      'utf-8'
    );
  });

  it('handleCommandError writes JSON envelope and exits in json mode', async () => {
    setCliRuntime({ json: true, command: 'script', startTime: 100 });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    });

    const info = { code: 'OOPS', message: 'bad', context: { a: 1 } };
    (format.getCliErrorInfo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (format.getExitCodeForError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(2);

    const jsonSpy = vi.spyOn(output, 'writeJsonEnvelope');

    expect(() => handleCommandError(new Error('boom'))).toThrow('exit:2');
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'script',
        errors: [{ code: 'OOPS', message: 'bad', context: { a: 1 } }],
      })
    );

    exitSpy.mockRestore();
  });

  it('handleCommandError writes human output and logs CMError', () => {
    setCliRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    });

    (format.getCliErrorInfo as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      code: 'INVALID_ARGUMENT',
      message: 'bad args',
      context: { fix: 'nope' },
    });
    (format.getExitCodeForError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(2);
    (format.formatCliErrorLines as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      'ERROR: bad args',
    ]);

    const stderrSpy = vi.spyOn(output, 'writeStderrLine');
    const error = new CMError('INVALID_ARGUMENT', 'bad args');

    expect(() => handleCommandError(error)).toThrow('exit:2');
    expect(stderrSpy).toHaveBeenCalledWith('ERROR: bad args');
    expect(logger.error).toHaveBeenCalledWith({ error, code: error.code }, 'Command failed');

    exitSpy.mockRestore();
  });

  it('handleCommandError logs stacks for unexpected errors', () => {
    setCliRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    });

    (format.getCliErrorInfo as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      code: 'UNKNOWN_ERROR',
      message: 'boom',
    });
    (format.getExitCodeForError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1);
    (format.formatCliErrorLines as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      'ERROR: boom',
    ]);

    const err = new Error('boom');

    expect(() => handleCommandError(err)).toThrow('exit:1');
    expect(logger.error).toHaveBeenCalledWith({ stack: err.stack }, 'Unexpected error');

    exitSpy.mockRestore();
  });

  it('formatDuration formats seconds', () => {
    expect(formatDuration(12.3)).toBe('12.3s');
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(61.2)).toBe('1m 1s');
  });

  it('formatFileSize formats bytes', () => {
    expect(formatFileSize(12)).toBe('12 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('parseWhisperModel normalizes and validates values', () => {
    expect(parseWhisperModel(undefined)).toBe('base');
    expect(parseWhisperModel('LARGE')).toBe('large');
    expect(() => parseWhisperModel('giant')).toThrow('Invalid Whisper model');
  });
});
