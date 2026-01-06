import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateVideoPath } from '../../../src/validate/validate';

const execFileAsync = promisify(execFile);

async function hasCommand(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ['-version'], { windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const canRun = (await hasCommand('ffmpeg')) && (await hasCommand('ffprobe'));

async function makeColorVideo(params: {
  outputPath: string;
  width: number;
  height: number;
  durationSeconds: number;
  fps: number;
}): Promise<void> {
  const { outputPath, width, height, durationSeconds, fps } = params;

  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=black:s=${width}x${height}:r=${fps}`,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-t',
      String(durationSeconds),
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

describe('cm validate - integration (ffmpeg/ffprobe)', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cm-validate-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.runIf(canRun)('passes on a valid portrait MP4', async () => {
    const videoPath = join(dir, 'valid_portrait.mp4');
    await makeColorVideo({
      outputPath: videoPath,
      width: 1080,
      height: 1920,
      durationSeconds: 30,
      fps: 30,
    });

    const report = await validateVideoPath(videoPath, { profile: 'portrait' });
    expect(report.passed).toBe(true);
    expect(report.summary.width).toBe(1080);
    expect(report.summary.height).toBe(1920);
    expect(report.summary.container).toBe('mp4');
  });

  it.runIf(canRun)('fails on wrong resolution', async () => {
    const videoPath = join(dir, 'wrong_res.mp4');
    await makeColorVideo({
      outputPath: videoPath,
      width: 720,
      height: 1280,
      durationSeconds: 30,
      fps: 30,
    });

    const report = await validateVideoPath(videoPath, { profile: 'portrait' });
    expect(report.passed).toBe(false);
    expect(report.gates.find((g) => g.gateId === 'resolution')?.passed).toBe(false);
  });
});
