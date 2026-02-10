import { describe, expect, test } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeVideoToVideoSpecV1 } from './analyze';

const execFileAsync = promisify(execFile);

async function makeTinyTwoSceneVideo(outPath: string): Promise<void> {
  // 0.5s black then 0.5s white; yuv420p for broad compatibility.
  await execFileAsync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=320x240:d=0.5',
      '-f',
      'lavfi',
      '-i',
      'color=c=white:s=320x240:d=0.5',
      '-filter_complex',
      '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
      '-map',
      '[v]',
      outPath,
    ],
    { windowsHide: true, timeout: 60_000 }
  );
}

describe('analyzeVideoToVideoSpecV1', () => {
  test('produces a valid spec with minimal modules', async () => {
    const dir = join(tmpdir(), `cm-videospec-test-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'tiny.mp4');

    try {
      await makeTinyTwoSceneVideo(videoPath);

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: false,
        ocr: false,
        asr: false,
        narrative: 'heuristic',
        shotDetector: 'ffmpeg',
        maxSeconds: 1,
      });

      expect(spec.meta.source).toContain('tiny.mp4');
      expect(spec.timeline.shots.length).toBeGreaterThanOrEqual(1);
      expect(spec.timeline.pacing.shot_count).toBe(spec.timeline.shots.length);
      expect(typeof spec.provenance.modules.shot_detection).toBe('string');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('analyzes basic audio structure when an audio stream exists', async () => {
    const dir = join(tmpdir(), `cm-videospec-test-audio-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'tiny-audio.mp4');

    try {
      // 5s black video + gated sine to create periodic energy onsets.
      await execFileAsync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=black:s=320x240:d=5',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=440:duration=5',
          '-shortest',
          '-af',
          // Pulse every 0.5s for ~120 BPM-like onsets.
          'volume=if(lt(mod(t\\,0.5)\\,0.05)\\,1\\,0)',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          videoPath,
        ],
        { windowsHide: true, timeout: 60_000 }
      );

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: false,
        ocr: false,
        asr: false,
        narrative: 'heuristic',
        shotDetector: 'ffmpeg',
        maxSeconds: 5,
      });

      // We don't assert a particular BPM here (heuristics), but we do assert that
      // the audio analysis ran and produced a well-formed structure.
      expect(Array.isArray(spec.audio.music_segments)).toBe(true);
      expect(Array.isArray(spec.audio.sound_effects)).toBe(true);
      expect(Array.isArray(spec.audio.beat_grid.beats)).toBe(true);
      expect(typeof spec.provenance.modules.music_detection).toBe('string');
      expect(spec.provenance.modules.music_detection).not.toBe('no-audio');
      expect(typeof spec.provenance.modules.beat_tracking).toBe('string');
      expect(spec.provenance.modules.beat_tracking).not.toBe('no-audio');
      expect(typeof spec.provenance.modules.sfx_detection).toBe('string');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
