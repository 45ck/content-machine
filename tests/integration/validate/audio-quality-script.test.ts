import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveFfmpegPath } from '../../../src/core/video/ffmpeg';

const execFileAsync = promisify(execFile);

async function hasCommand(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    await execFileAsync(command, args, { windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function makeSilentVideo(outputPath: string, ffmpegPath: string): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=1080x1920:r=30',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-t',
      '3',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'ultrafast',
      '-crf',
      '35',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-shortest',
      outputPath,
    ],
    { windowsHide: true, timeout: 120_000 }
  );
}

async function makeClippedAudio(outputPath: string, ffmpegPath: string): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:sample_rate=44100:duration=1',
      '-filter:a',
      'volume=30dB',
      '-c:a',
      'pcm_s16le',
      outputPath,
    ],
    { windowsHide: true, timeout: 120_000 }
  );
}

const ffmpegPath = resolveFfmpegPath();
const canRun = (await hasCommand('python')) && (await hasCommand(ffmpegPath, ['-version']));

describe('audio_quality.py integration', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cm-audio-quality-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.runIf(canRun)('returns finite JSON metrics for silent media', async () => {
    const mediaPath = join(dir, 'silent.mp4');
    await makeSilentVideo(mediaPath, ffmpegPath);

    const { stdout } = await execFileAsync(
      'python',
      [
        resolve(process.cwd(), 'scripts', 'audio_quality.py'),
        '--media',
        mediaPath,
        '--ffmpeg-path',
        ffmpegPath,
      ],
      { windowsHide: true, timeout: 120_000 }
    );

    const payload = JSON.parse(stdout);

    expect(payload).toEqual({
      loudnessLUFS: -99.0,
      truePeakDBFS: -99.0,
      loudnessRange: 0.0,
      clippingRatio: 0.0,
      peakLevelDB: 0.0,
      snrDB: 0.0,
    });
  });

  it.runIf(canRun)('reports a non-zero clipping ratio for clipped audio', async () => {
    const mediaPath = join(dir, 'clipped.wav');
    await makeClippedAudio(mediaPath, ffmpegPath);

    const { stdout } = await execFileAsync(
      'python',
      [
        resolve(process.cwd(), 'scripts', 'audio_quality.py'),
        '--media',
        mediaPath,
        '--ffmpeg-path',
        ffmpegPath,
      ],
      { windowsHide: true, timeout: 120_000 }
    );

    const payload = JSON.parse(stdout) as Record<string, number>;

    expect(Number.isFinite(payload.clippingRatio)).toBe(true);
    expect(Number.isFinite(payload.peakLevelDB)).toBe(true);
    expect(Number.isFinite(payload.snrDB)).toBe(true);
    expect(payload.clippingRatio).toBeGreaterThan(0);
    expect(payload.peakLevelDB).toBeGreaterThanOrEqual(-0.1);
  });
});
