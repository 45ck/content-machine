import { describe, expect, test } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeVideoToVideoSpecV1 } from './analyze';

const execFileAsync = promisify(execFile);

async function makeInsertedContentTestVideo(outPath: string, lines: string[]): Promise<void> {
  // 1s static "reddit-like" frame, then 1s moving testsrc.
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const drawTextFilters = lines.map((text, i) => {
    const y = 26 + i * 56;
    const fontsize = i === 0 ? 36 : 26;
    return `drawtext=fontfile=${font}:text='${text}':x=28:y=${y}:fontsize=${fontsize}:fontcolor=black`;
  });
  const shotFilters = ['drawbox=x=10:y=10:w=620:h=340:color=black@1:t=2', ...drawTextFilters].join(
    ','
  );
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
      'color=c=white:s=640x360:r=30:d=1',
      '-f',
      'lavfi',
      '-i',
      'testsrc=s=640x360:r=30:d=1',
      '-filter_complex',
      [`[0:v]${shotFilters}[shot];`, `[shot][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]`].join(''),
      '-map',
      '[v]',
      outPath,
    ],
    { windowsHide: true, timeout: 60_000 }
  );
}

describe('inserted content blocks', () => {
  test('detects and OCRs a static embedded screenshot-like segment', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-test-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');

    try {
      await makeInsertedContentTestVideo(videoPath, [
        'r/AskReddit',
        'Who is the strangest person you have met?',
      ]);

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: false,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: true,
        ocrFps: 0.5,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(blocks.length).toBeGreaterThanOrEqual(1);

      const b0 = blocks[0]!;
      expect(['reddit_screenshot', 'generic_screenshot']).toContain(b0.type);
      expect(b0.start).toBeGreaterThanOrEqual(0);
      expect(b0.end).toBeGreaterThan(b0.start);
      expect(b0.extraction?.ocr?.engine).toBe('tesseract.js');
      expect((b0.keyframes ?? []).length).toBeGreaterThan(0);
      if (b0.extraction?.ocr?.text) {
        expect(b0.extraction.ocr.text.toLowerCase()).toContain('askreddit');
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90_000);

  test('classifies a browser/page inserted block', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-browser-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');

    try {
      await makeInsertedContentTestVideo(videoPath, [
        'www.example.com',
        'https://example.com',
        'Example headline about a website page',
        'This is body text on a browser page screenshot',
        'Scroll to read more content below',
      ]);

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: false,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: true,
        ocrFps: 0.5,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]!.type).toBe('browser_page');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90_000);

  test('classifies a chat inserted block', async () => {
    const dir = join(tmpdir(), `cm-videospec-icb-chat-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'icb.mp4');

    try {
      await makeInsertedContentTestVideo(videoPath, ['Delivered message', 'Sent at 10:30']);

      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: videoPath,
        cache: false,
        shotDetector: 'ffmpeg',
        maxSeconds: 2,
        ocr: true,
        ocrFps: 0.5,
        insertedContent: true,
        asr: false,
        narrative: 'heuristic',
      });

      const blocks = spec.inserted_content_blocks ?? [];
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]!.type).toBe('chat_screenshot');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90_000);
});
