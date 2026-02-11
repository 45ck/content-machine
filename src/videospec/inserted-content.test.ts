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
  // 1s black then 1s white; yuv420p for broad compatibility.
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
      'color=c=black:s=320x240:d=1',
      '-f',
      'lavfi',
      '-i',
      'color=c=white:s=320x240:d=1',
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

async function writeVideoSpecCacheArtifacts(params: {
  videoPath: string;
  cacheDir: string;
  insertedBlocks: any[];
}): Promise<void> {
  const { videoPath, cacheDir, insertedBlocks } = params;
  const cacheRoot = resolveVideoSpecCacheDir(cacheDir);
  const stat = await (await import('node:fs/promises')).stat(videoPath);
  const videoHash = await sha256FileHex(videoPath);
  const videoKey = `${videoHash.slice(0, 16)}-${stat.size}`;
  const videoCacheDir = join(cacheRoot, videoKey);
  await mkdir(videoCacheDir, { recursive: true });

  // Keep the analyzer fully offline/deterministic for tests by pre-populating
  // all relevant module caches. We specifically avoid live tesseract OCR here,
  // since CI/pre-push runs from a clean temp dir.
  await (
    await import('node:fs/promises')
  ).writeFile(join(videoCacheDir, 'shots.v1.json'), JSON.stringify([1.0], null, 2), 'utf-8');
  await (
    await import('node:fs/promises')
  ).writeFile(
    join(videoCacheDir, 'editing.effects.v1.json'),
    JSON.stringify({ cameraMotion: [], jumpCutShotIds: [] }, null, 2),
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
  await (
    await import('node:fs/promises')
  ).writeFile(
    join(videoCacheDir, 'inserted-content.v1.json'),
    JSON.stringify(insertedBlocks, null, 2),
    'utf-8'
  );
}

describe('inserted content blocks', () => {
  test('reads cached inserted content blocks (reddit-like)', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-test-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');
    const cacheDir = join(dir, 'cache-root');

    try {
      await makeTinyTwoSceneVideo(videoPath);
      await writeVideoSpecCacheArtifacts({
        videoPath,
        cacheDir,
        insertedBlocks: [
          {
            id: 'icb-1',
            type: 'reddit_screenshot',
            start: 0,
            end: 1.0,
            presentation: 'full_screen',
            region: { x: 0, y: 0, w: 1, h: 1 },
            keyframes: [{ time: 0.5, text: 'r/AskReddit', confidence: 0.7 }],
            extraction: { ocr: { engine: 'tesseract.js', text: 'r/AskReddit' } },
            confidence: { is_inserted_content: 0.9, type: 0.7, ocr_quality: 0.6 },
          },
        ],
      });

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: true,
        cacheDir,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: false,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(spec.provenance.modules.inserted_content_blocks).toBe('cache');
      expect(blocks.length).toBe(1);
      expect(blocks[0]!.type).toBe('reddit_screenshot');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('reads cached inserted content blocks (browser/page)', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-browser-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');
    const cacheDir = join(dir, 'cache-root');

    try {
      await makeTinyTwoSceneVideo(videoPath);
      await writeVideoSpecCacheArtifacts({
        videoPath,
        cacheDir,
        insertedBlocks: [
          {
            id: 'icb-1',
            type: 'browser_page',
            start: 0,
            end: 1.0,
            presentation: 'full_screen',
            region: { x: 0, y: 0, w: 1, h: 1 },
            keyframes: [{ time: 0.5, text: 'https://example.com', confidence: 0.7 }],
            extraction: { ocr: { engine: 'tesseract.js', text: 'https://example.com' } },
            confidence: { is_inserted_content: 0.9, type: 0.7, ocr_quality: 0.6 },
          },
        ],
      });

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: true,
        cacheDir,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: false,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(spec.provenance.modules.inserted_content_blocks).toBe('cache');
      expect(blocks.length).toBe(1);
      expect(blocks[0]!.type).toBe('browser_page');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('reads cached inserted content blocks (chat)', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-chat-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');
    const cacheDir = join(dir, 'cache-root');

    try {
      await makeTinyTwoSceneVideo(videoPath);
      await writeVideoSpecCacheArtifacts({
        videoPath,
        cacheDir,
        insertedBlocks: [
          {
            id: 'icb-1',
            type: 'chat_screenshot',
            start: 0,
            end: 1.0,
            presentation: 'full_screen',
            region: { x: 0, y: 0, w: 1, h: 1 },
            keyframes: [{ time: 0.5, text: 'Delivered message', confidence: 0.7 }],
            extraction: { ocr: { engine: 'tesseract.js', text: 'Delivered message' } },
            confidence: { is_inserted_content: 0.9, type: 0.7, ocr_quality: 0.6 },
          },
        ],
      });

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: true,
        cacheDir,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: false,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(spec.provenance.modules.inserted_content_blocks).toBe('cache');
      expect(blocks.length).toBe(1);
      expect(blocks[0]!.type).toBe('chat_screenshot');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
