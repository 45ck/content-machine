import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    expect(resolveWhisperModelPath('base', '/tmp')).toBe(
      '/home/tester/.cm/assets/whisper/ggml-base.bin'
    );
  });

  it('uses CM_WHISPER_DIR when set', async () => {
    process.env.CM_WHISPER_DIR = '~/models/whisper';
    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe('/home/tester/models/whisper');
  });

  it('falls back to global then legacy dirs', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) =>
      String(p).includes('/home/tester/.cm/assets/whisper')
    );

    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe('/home/tester/.cm/assets/whisper');
  });

  it('uses legacy dir when global is missing', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) =>
      String(p).includes('/work/.cache/whisper')
    );

    const { resolveWhisperDir } = await import('../../../../src/core/assets/whisper');
    const dir = resolveWhisperDir('/work');
    expect(dir).toBe('/work/.cache/whisper');
  });
});
