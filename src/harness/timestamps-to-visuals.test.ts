import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { writeJsonArtifact } from './artifacts';
import { runTimestampsToVisuals } from './timestamps-to-visuals';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-harness-visuals-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runTimestampsToVisuals', () => {
  it('writes mock visuals from a timestamps artifact', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    const outputPath = join(dir, 'visuals.json');

    await writeJsonArtifact(timestampsPath, {
      schemaVersion: '1.0.0',
      scenes: [
        {
          sceneId: 'scene-1',
          audioStart: 0,
          audioEnd: 1,
          words: [{ word: 'test', start: 0, end: 0.5 }],
        },
      ],
      allWords: [{ word: 'test', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    });

    const result = await runTimestampsToVisuals({
      timestampsPath,
      outputPath,
      mock: true,
    });

    expect(result.result.outputPath).toBe(outputPath);
    expect(result.result.visualQualityPath).toBe(join(dir, 'visual-quality.json'));
    expect(result.result.visualQualityPassed).toBe(false);
    expect(result.result.visualQualityScore).toBeLessThan(0.85);
    expect(result.result.sceneCount).toBe(1);
    expect(result.result.fallbacks).toBe(1);

    const visuals = JSON.parse(await readFile(outputPath, 'utf8')) as {
      scenes: Array<{ sceneId: string }>;
      fallbacks: number;
    };
    expect(visuals.scenes).toHaveLength(1);
    expect(visuals.scenes[0]?.sceneId).toBe('scene-1');
    expect(visuals.fallbacks).toBe(1);

    const quality = JSON.parse(await readFile(join(dir, 'visual-quality.json'), 'utf8')) as {
      passed: boolean;
      issues: Array<{ type: string }>;
    };
    expect(quality.passed).toBe(false);
    expect(quality.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'fallback-rate' })])
    );
  });
});
