import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonArtifact } from './artifacts';
import { runLongformHighlightSelect } from './longform-highlight-select';
import type { TimestampsOutput, WordTimestamp } from '../domain';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-highlight-select-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function makeWords(): WordTimestamp[] {
  let cursor = 0;
  return [
    'Okay',
    'here',
    'is',
    'the',
    'setup.',
    'Why',
    'do',
    'clips',
    'die',
    'after',
    'three',
    'seconds?',
    'Because',
    'the',
    'cut',
    'starts',
    'before',
    'the',
    'real',
    'question.',
    'Fix',
    'that',
    'and',
    'the',
    'same',
    'footage',
    'feels',
    'twice',
    'as',
    'sharp.',
  ].map((word, index) => {
    const start = cursor;
    const end = start + 0.4;
    cursor = end + (index === 4 || index === 19 ? 0.65 : 0.1);
    return { word, start, end, confidence: 0.95 };
  });
}

function makeTimestamps(words: WordTimestamp[]): TimestampsOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      { sceneId: 'scene-1', audioStart: 0, audioEnd: words[words.length - 1]?.end ?? 1, words },
    ],
    allWords: words,
    totalDuration: words[words.length - 1]?.end ?? 1,
    ttsEngine: 'test',
    asrEngine: 'test',
  };
}

describe('runLongformHighlightSelect', () => {
  it('writes highlight candidates and returns the selected candidate summary', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    const outputPath = join(dir, 'highlights', 'highlight-candidates.v1.json');
    await writeJsonArtifact(timestampsPath, makeTimestamps(makeWords()));

    const result = await runLongformHighlightSelect({
      timestampsPath,
      outputPath,
      sourceMediaPath: join(dir, 'source.mp4'),
      minDuration: 3,
      targetDuration: 9,
      maxDuration: 14,
      maxCandidates: 2,
    });

    expect(result.result.outputPath).toBe(outputPath);
    expect(result.result.candidateCount).toBeGreaterThan(0);
    expect(result.result.selectedCandidateId).toBeTruthy();
    expect(result.artifacts).toEqual([
      {
        path: outputPath,
        kind: 'file',
        description: 'Highlight candidate artifact',
      },
    ]);

    const artifact = JSON.parse(await readFile(outputPath, 'utf8')) as {
      candidates: Array<{ text: string; scores: { total: number } }>;
      source: { mediaPath: string | null };
    };
    expect(artifact.source.mediaPath).toBe(join(dir, 'source.mp4'));
    expect(artifact.candidates[0]?.text).toContain('Why do clips die');
    expect(artifact.candidates[0]?.scores.total).toBeGreaterThan(0);
  });
});
