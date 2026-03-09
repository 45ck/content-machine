import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  const homedir = vi.fn(() => '/home/tester');
  return {
    ...actual,
    homedir,
    default: { ...actual, homedir },
  };
});

describe('whisper asset paths', () => {
  const originalEnv = { ...process.env };
  const globalDir = path.resolve('/home/tester', '.cm', 'assets', 'whisper');
  const legacyDir = path.resolve('/work', '.cache', 'whisper');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resolves model filename and path', async () => {
    const { resolveWhisperModelFilename, resolveWhisperModelPath } =
      await import('../../../../src/core/assets/whisper');
    expect(resolveWhisperModelFilename('base')).toBe('ggml-base.bin');
    expect(resolveWhisperModelFilename('large')).toBe('ggml-large-v3.bin');
    expect(resolveWhisperModelPath('base', '/tmp')).toBe(path.join(globalDir, 'ggml-base.bin'));
  });

  it('uses CM_WHISPER_DIR when set', async () => {
    process.env.CM_WHISPER_DIR = '~/models/whisper';
    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe(path.resolve('/home/tester', 'models', 'whisper'));
  });

  it('falls back to global then legacy dirs', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => String(p) === globalDir
    );

    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe(globalDir);
  });

  it('uses legacy dir when global is missing', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => String(p) === legacyDir
    );

    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe(legacyDir);
  });

  it('resolves executable candidates and runtime status', async () => {
    const { existsSync } = await import('node:fs');
    const whisperDir = path.resolve(process.cwd(), 'tests', '.tmp', 'whisper-helper');
    const executablePath = path.join(
      whisperDir,
      'build',
      'bin',
      process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
    );
    const modelPath = path.join(whisperDir, 'ggml-base.bin');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      const value = String(p);
      return value === modelPath || value === executablePath;
    });

    const {
      resolveWhisperExecutableCandidates,
      resolveWhisperExecutablePath,
      getWhisperRuntimeStatus,
      buildWhisperInstallFix,
    } = await import('../../../../src/core/assets/whisper');

    const candidates = resolveWhisperExecutableCandidates(whisperDir);
    expect(candidates).toHaveLength(2);
    expect(resolveWhisperExecutablePath(whisperDir)).toBe(executablePath);

    const status = getWhisperRuntimeStatus({
      model: 'base',
      dir: whisperDir,
      version: '1.7.4',
    });

    expect(status.modelPresent).toBe(true);
    expect(status.binaryPresent).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.fix).toBe(
      buildWhisperInstallFix({
        model: 'base',
        dir: whisperDir,
        version: '1.7.4',
      })
    );
  });
});
