import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const existsSyncMock = vi.fn();
const transcribeMock = vi.fn();
const downloadWhisperModelMock = vi.fn();
const installWhisperCppMock = vi.fn();
const execFfprobeMock = vi.fn();
const execFfmpegMock = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: existsSyncMock,
  };
});

vi.mock('@remotion/install-whisper-cpp', () => ({
  transcribe: transcribeMock,
  downloadWhisperModel: downloadWhisperModelMock,
  installWhisperCpp: installWhisperCppMock,
}));

vi.mock('../../../src/core/video/ffmpeg', () => ({
  execFfprobe: execFfprobeMock,
  execFfmpeg: execFfmpegMock,
}));

describe('audio ASR whisper runtime', () => {
  const previousWhisperDir = process.env.CM_WHISPER_DIR;
  const whisperDir = path.join(process.cwd(), 'tests', '.tmp', 'whisper-runtime');
  const modelPath = path.join(whisperDir, 'ggml-base.bin');
  const legacyBinaryPath = path.join(whisperDir, process.platform === 'win32' ? 'main.exe' : 'main');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CM_WHISPER_DIR = whisperDir;
    existsSyncMock.mockReturnValue(false);
    execFfprobeMock.mockResolvedValue({ stdout: '16000\n' });
    execFfmpegMock.mockResolvedValue({ stdout: '' });
  });

  afterAll(() => {
    if (previousWhisperDir === undefined) delete process.env.CM_WHISPER_DIR;
    else process.env.CM_WHISPER_DIR = previousWhisperDir;
  });

  it('falls back to estimated timestamps when Whisper runtime is missing and fallback inputs exist', async () => {
    const { transcribeAudio } = await import('../../../src/audio/asr');

    const result = await transcribeAudio({
      audioPath: 'audio.wav',
      originalText: 'hello world',
      audioDuration: 1,
    });

    expect(result.engine).toBe('estimated');
    expect(result.words).toHaveLength(2);
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it('throws DEPENDENCY_MISSING with the setup command when Whisper is required but missing', async () => {
    const { transcribeAudio } = await import('../../../src/audio/asr');

    await expect(
      transcribeAudio({
        audioPath: 'audio.wav',
        requireWhisper: true,
      })
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
      message: expect.stringContaining('cm setup whisper --model base'),
      context: expect.objectContaining({
        whisperModelPath: modelPath,
      }),
    });

    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it('converts missing whisper spawn errors into DEPENDENCY_MISSING', async () => {
    existsSyncMock.mockImplementation((input: string) => {
      const value = String(input);
      return value === modelPath || value === legacyBinaryPath;
    });
    transcribeMock.mockRejectedValue(
      Object.assign(new Error('spawn ENOENT'), {
        code: 'ENOENT',
      })
    );

    const { transcribeAudio } = await import('../../../src/audio/asr');

    await expect(
      transcribeAudio({
        audioPath: 'audio.wav',
        requireWhisper: true,
      })
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
      message: expect.stringContaining('cm setup whisper --model base'),
    });
  });
});
