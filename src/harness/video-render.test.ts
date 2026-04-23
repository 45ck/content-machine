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
    ]);

    const metadata = JSON.parse(await readFile(join(dir, 'render.json'), 'utf8')) as {
      outputPath: string;
      fps: number;
    };
    expect(metadata.outputPath).toBe(outputPath);
    expect(metadata.fps).toBe(30);
  });
});
