import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

function makeTinyVideo(outPath: string): void {
  // 1s black video with silent audio so ffmpeg/ffprobe pipelines behave normally.
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=320x240:d=1',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=16000:cl=mono',
      '-shortest',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      outPath,
    ],
    { stdio: 'ignore' }
  );
}

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm videospec', () => {
  it('prints only the output path to stdout in human mode', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp', 'videospec-human');
    mkdirSync(tmpDir, { recursive: true });
    const videoPath = join(tmpDir, 'tiny.mp4');
    const outPath = join(tmpDir, 'videospec.v1.json');
    makeTinyVideo(videoPath);

    const result = await runCli(
      [
        'videospec',
        '--input',
        videoPath,
        '--output',
        outPath,
        '--max-seconds',
        '1',
        '--shot-detector',
        'ffmpeg',
        '--no-ocr',
        '--no-asr',
      ],
      undefined,
      60_000
    );

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(outPath);
    expect(result.stderr).toContain('Shots:');
  }, 90_000);

  it('emits a single JSON envelope in --json mode', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp', 'videospec-json');
    mkdirSync(tmpDir, { recursive: true });
    const videoPath = join(tmpDir, 'tiny.mp4');
    const outPath = join(tmpDir, 'videospec.v1.json');
    makeTinyVideo(videoPath);

    const result = await runCli(
      [
        'videospec',
        '--input',
        videoPath,
        '--output',
        outPath,
        '--max-seconds',
        '1',
        '--shot-detector',
        'ffmpeg',
        '--no-ocr',
        '--no-asr',
        '--json',
      ],
      undefined,
      60_000
    );

    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.command).toBe('videospec');
    expect(parsed.errors).toEqual([]);
    expect(parsed.outputs.videospecPath).toBe(outPath);
    expect(typeof parsed.outputs.shots).toBe('number');
  }, 90_000);
});
