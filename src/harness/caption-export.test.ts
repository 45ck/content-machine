import { mkdtemp, readFile } from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonArtifact } from './artifacts';
import { runCaptionExport } from './caption-export';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-harness-caption-export-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runCaptionExport', () => {
  it('writes portable caption sidecars from word timestamps', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    await writeJsonArtifact(timestampsPath, {
      schemaVersion: '1.0.0',
      allWords: [
        { word: 'Stop', start: 0, end: 0.45 },
        { word: 'scrolling', start: 0.45, end: 1.15 },
      ],
      totalDuration: 2,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    });

    const result = await runCaptionExport({
      timestampsPath,
      outputDir: join(dir, 'captions'),
      captionAssStyle: {
        karaoke: true,
        positionX: 540,
        positionY: 960,
      },
    });

    expect(result.result.captionExportPath).toBe(join(dir, 'captions', 'captions.remotion.json'));
    expect(result.result.captionSrtPath).toBe(join(dir, 'captions', 'captions.srt'));
    expect(result.result.captionAssPath).toBe(join(dir, 'captions', 'captions.ass'));
    expect(result.result.captionQualityPassed).toBe(true);
    expect(result.result.segmentCount).toBeGreaterThan(0);
    expect(result.artifacts).toEqual([
      {
        path: join(dir, 'captions', 'captions.remotion.json'),
        kind: 'file',
        description: 'Remotion-compatible caption JSON artifact',
      },
      {
        path: join(dir, 'captions', 'captions.srt'),
        kind: 'file',
        description: 'SRT caption artifact',
      },
      {
        path: join(dir, 'captions', 'captions.ass'),
        kind: 'file',
        description: 'ASS caption artifact',
      },
    ]);

    const captionExport = JSON.parse(
      await readFile(join(dir, 'captions', 'captions.remotion.json'), 'utf8')
    ) as {
      captions: Array<{ text: string; startMs: number; endMs: number }>;
    };
    expect(captionExport.captions).toEqual([
      expect.objectContaining({ text: 'Stop scrolling', startMs: 0, endMs: 1050 }),
    ]);
    await expect(readFile(join(dir, 'captions', 'captions.srt'), 'utf8')).resolves.toContain(
      '00:00:00,000 --> 00:00:01,050'
    );
    await expect(readFile(join(dir, 'captions', 'captions.ass'), 'utf8')).resolves.toContain(
      '{\\pos(540,960)}'
    );
  });
});
