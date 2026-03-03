import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promisify } from 'node:util';

const execFileMock = vi.fn();
execFileMock[promisify.custom] = (cmd: string, args: string[], options: Record<string, unknown>) =>
  new Promise((resolve, reject) => {
    execFileMock(cmd, args, options, (error: unknown, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

describe('probeAudioWithFfprobe', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('parses audio info from ffprobe output', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(
        null,
        JSON.stringify({
          streams: [{ codec_type: 'audio', codec_name: 'aac', sample_rate: '48000', channels: 2 }],
          format: { format_name: 'mp4', duration: '12.34' },
        }),
        ''
      );
    });

    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    const info = await probeAudioWithFfprobe('audio.mp4');

    expect(info.sampleRate).toBe(48000);
    expect(info.durationSeconds).toBeCloseTo(12.34);
    expect(info.codec).toBe('aac');
    expect(info.container).toBe('mp4');
  });

  it('throws when ffprobe is missing', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      const err = new Error('missing');
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      cb?.(err, '', '');
    });

    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    await expect(probeAudioWithFfprobe('audio.mp4')).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
    });
  });

  it('throws when audio stream is missing', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(
        null,
        JSON.stringify({
          streams: [{ codec_type: 'video', codec_name: 'h264' }],
          format: { format_name: 'mp4', duration: '12.34' },
        }),
        ''
      );
    });

    const { probeAudioWithFfprobe } = await import('../../../src/validate/ffprobe-audio');
    await expect(probeAudioWithFfprobe('audio.mp4')).rejects.toMatchObject({
      code: 'AUDIO_PROBE_ERROR',
    });
  });
});
