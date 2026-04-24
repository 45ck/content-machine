import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { writeJsonArtifact } from './artifacts';
import { runVideoRender } from './video-render';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-harness-render-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runVideoRender', () => {
  it('writes render metadata alongside a mock render', async () => {
    const dir = await makeTempDir();
    const visualsPath = join(dir, 'visuals.json');
    const timestampsPath = join(dir, 'timestamps.json');
    const audioPath = join(dir, 'audio.wav');
    const outputPath = join(dir, 'render.mp4');

    await writeJsonArtifact(visualsPath, {
      schemaVersion: '1.0.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'mock://asset', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fromGenerated: 0,
      fallbacks: 0,
    });
    await writeJsonArtifact(timestampsPath, {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'test', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    });
    await writeFile(audioPath, Buffer.alloc(0));

    const result = await runVideoRender({
      visualsPath,
      timestampsPath,
      audioPath,
      outputPath,
      mock: true,
    });

    expect(result.result.outputPath).toBe(outputPath);
    expect(result.result.outputMetadataPath).toBe(join(dir, 'render.json'));
    expect(result.result.captionExportPath).toBe(join(dir, 'captions.remotion.json'));
    expect(result.result.captionSrtPath).toBe(join(dir, 'captions.srt'));
    expect(result.result.captionAssPath).toBe(join(dir, 'captions.ass'));
    expect(result.result.captionQualityPassed).toBe(true);
    expect(result.result.captionQualityScore).toBeGreaterThanOrEqual(0.85);
    expect(result.artifacts).toEqual([
      {
        path: outputPath,
        kind: 'file',
        description: 'Rendered video artifact',
      },
      {
        path: join(dir, 'render.json'),
        kind: 'file',
        description: 'Render metadata artifact',
      },
      {
        path: join(dir, 'captions.remotion.json'),
        kind: 'file',
        description: 'Remotion-compatible caption JSON artifact',
      },
      {
        path: join(dir, 'captions.srt'),
        kind: 'file',
        description: 'SRT caption artifact',
      },
      {
        path: join(dir, 'captions.ass'),
        kind: 'file',
        description: 'ASS caption artifact',
      },
    ]);

    const metadata = JSON.parse(await readFile(join(dir, 'render.json'), 'utf8')) as {
      outputPath: string;
      fps: number;
    };
    expect(metadata.outputPath).toBe(outputPath);
    expect(metadata.fps).toBe(30);

    const captionExport = JSON.parse(
      await readFile(join(dir, 'captions.remotion.json'), 'utf8')
    ) as {
      captions: Array<{ text: string; startMs: number; endMs: number }>;
      quality: { passed: boolean; score: number };
    };
    expect(captionExport.captions).toEqual([
      expect.objectContaining({ text: 'test', startMs: 0, endMs: 500 }),
    ]);
    expect(captionExport.quality).toEqual(
      expect.objectContaining({ passed: true, score: result.result.captionQualityScore })
    );
    await expect(readFile(join(dir, 'captions.srt'), 'utf8')).resolves.toContain(
      '00:00:00,000 --> 00:00:00,500'
    );
    await expect(readFile(join(dir, 'captions.ass'), 'utf8')).resolves.toContain(
      'Dialogue: 0,0:00:00.00,0:00:00.50,Default,test'
    );
  });
});
