import { describe, expect, test } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeVideoToVideoSpecV1 } from './analyze';
import { resolveVideoSpecCacheDir } from './cache';

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

async function sha256FileHex(path: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolvePromise());
    stream.on('error', reject);
  });
  return hash.digest('hex');
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

  test('uses cache artifacts when present (no heavy deps)', async () => {
    const dir = join(tmpdir(), `cm-videospec-test-cache-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'tiny.mp4');
    const cacheDir = join(dir, 'cache-root');

    try {
      await makeTinyTwoSceneVideo(videoPath);

      const cacheRoot = resolveVideoSpecCacheDir(cacheDir);
      const stat = await (await import('node:fs/promises')).stat(videoPath);
      const videoHash = await sha256FileHex(videoPath);
      const videoKey = `${videoHash.slice(0, 16)}-${stat.size}`;
      const videoCacheDir = join(cacheRoot, videoKey);
      await mkdir(videoCacheDir, { recursive: true });

      // Pre-populate cache artifacts so analysis takes the "cache hit" branches.
      await (
        await import('node:fs/promises')
      ).writeFile(join(videoCacheDir, 'shots.v1.json'), JSON.stringify([0.5]), 'utf-8');
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'audio.transcript.v1.json'),
        JSON.stringify(
          [{ start: 0, end: 0.4, speaker: 'Person1', text: 'hello world', confidence: 0.9 }],
          null,
          2
        ),
        'utf-8'
      );
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'editing.ocr.bottom.1fps.v2.json'),
        JSON.stringify([{ start: 0.1, end: 0.3, text: 'SUBTITLE', confidence: 0.8 }], null, 2),
        'utf-8'
      );
      // Empty refine cache triggers the "refine yielded no segments" note branch.
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'editing.ocr.bottom.2fps.v2.json'),
        JSON.stringify([], null, 2),
        'utf-8'
      );
      // Center-crop overlays OCR cache (avoid live Tesseract in tests).
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'editing.ocr.center.4fps.v2.json'),
        JSON.stringify([], null, 2),
        'utf-8'
      );
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'inserted-content.v1.json'),
        JSON.stringify(
          {
            version: 4,
            blocks: [
              {
                id: 'icb-1',
                type: 'generic_screenshot',
                start: 0,
                end: 0.8,
                presentation: 'full_screen',
                keyframes: [{ time: 0.2, text: 'r/AskReddit', confidence: 0.7 }],
                extraction: { ocr: { engine: 'tesseract.js', text: 'r/AskReddit' } },
                confidence: { is_inserted_content: 0.9, type: 0.5, ocr_quality: 0.6 },
              },
            ],
          },
          null,
          2
        ),
        'utf-8'
      );
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'editing.effects.v1.json'),
        JSON.stringify({ cameraMotion: null, jumpCutShotIds: [1] }, null, 2),
        'utf-8'
      );
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'audio.structure.v1.json'),
        JSON.stringify(
          { music_segments: [], sound_effects: [], beat_grid: { bpm: null, beats: [] } },
          null,
          2
        ),
        'utf-8'
      );

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        inputSource: 'test://tiny.mp4',
        cache: true,
        cacheDir,
        pass: 'both',
        ocr: true,
        insertedContent: true,
        asr: true,
        narrative: 'off',
        shotDetector: 'ffmpeg',
        maxSeconds: 1,
      });

      expect(spec.provenance.modules.shot_detection).toBe('cache');
      expect(spec.provenance.modules.asr).toBe('cache');
      expect(spec.provenance.modules.ocr).toBe('cache');
      expect(spec.provenance.modules.ocr_refine).toBe('cache');
      expect(spec.provenance.modules.inserted_content_blocks).toBe('cache');
      expect(spec.provenance.modules.camera_motion).toBe('cache');
      expect(spec.provenance.modules.jump_cut_detection).toBe('cache');
      expect(spec.provenance.modules.music_detection).toBe('cache');
      expect(spec.provenance.modules.beat_tracking).toBe('cache');
      expect(spec.provenance.modules.sfx_detection).toBe('cache');
      expect(spec.provenance.modules.narrative_analysis).toBe('disabled');

      expect(spec.meta.notes).toContain('OCR refine pass yielded no segments');
      expect(spec.editing.other_effects.jump_cuts?.length).toBeGreaterThanOrEqual(1);
      expect(spec.timeline.shots.some((s) => s.jump_cut === true)).toBe(true);
      expect(spec.inserted_content_blocks?.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('applies safe transcript fragment joins without overfitting punctuation/phrases', async () => {
    const dir = join(tmpdir(), `cm-videospec-test-asr-cache-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'tiny.mp4');
    const cacheDir = join(dir, 'cache-root');

    try {
      await makeTinyTwoSceneVideo(videoPath);

      const cacheRoot = resolveVideoSpecCacheDir(cacheDir);
      const stat = await (await import('node:fs/promises')).stat(videoPath);
      const videoHash = await sha256FileHex(videoPath);
      const videoKey = `${videoHash.slice(0, 16)}-${stat.size}`;
      const videoCacheDir = join(cacheRoot, videoKey);
      await mkdir(videoCacheDir, { recursive: true });

      await (
        await import('node:fs/promises')
      ).writeFile(join(videoCacheDir, 'shots.v1.json'), JSON.stringify([0.5]), 'utf-8');
      await (
        await import('node:fs/promises')
      ).writeFile(
        join(videoCacheDir, 'audio.transcript.v1.json'),
        JSON.stringify(
          [
            {
              start: 0,
              end: 0.4,
              speaker: 'Person1',
              text: 'strang est unle ashed vac uums 30 ombas',
              confidence: 0.9,
            },
            {
              start: 0.4,
              end: 0.9,
              speaker: 'Person1',
              text: 'I met my teacher and part she said the wood was charred out',
              confidence: 0.9,
            },
          ],
          null,
          2
        ),
        'utf-8'
      );

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: true,
        cacheDir,
        ocr: false,
        insertedContent: false,
        asr: true,
        narrative: 'off',
        shotDetector: 'ffmpeg',
        maxSeconds: 1,
      });

      expect(spec.audio.transcript[0]?.text).toBe('strangest unleashed vacuums 30 Roombas');
      expect(spec.audio.transcript[1]?.text).toBe(
        'I met my teacher and part she said the wood was charred out'
      );
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
