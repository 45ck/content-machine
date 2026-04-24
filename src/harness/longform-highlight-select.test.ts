import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonArtifact } from './artifacts';
import { runLongformHighlightSelect } from './longform-highlight-select';
import type { SourceMediaAnalysisOutput, TimestampsOutput, WordTimestamp } from '../domain';

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

function makeSourceAnalysis(mediaPath: string): SourceMediaAnalysisOutput {
  return {
    schemaVersion: '1.0.0',
    mediaPath,
    analyzedAt: '2026-04-24T00:00:00.000Z',
    probe: {
      engine: 'ffprobe',
      durationSeconds: 18,
      width: 1080,
      height: 1920,
      fps: 30,
      hasAudio: true,
      hasVideo: true,
      orientation: 'portrait',
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4',
    },
    sourceSignals: {
      audioEnergyScore: 0.82,
      audioRmsDb: -20,
      audioPeakDb: -2,
      silenceGapCount: 1,
      totalSilenceSeconds: 0.5,
      silenceGaps: [{ start: 8, end: 8.5, duration: 0.5 }],
      sceneChangeScore: 0.7,
      sceneChanges: [6, 9, 12],
      sampledFrameCount: 120,
      estimatedSceneCount: 4,
    },
    warnings: [],
  };
}

describe('runLongformHighlightSelect', () => {
  it('writes highlight candidates and returns the selected candidate summary', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    const outputPath = join(dir, 'highlights', 'highlight-candidates.v1.json');
    const sourceMediaPath = join(dir, 'source.mp4');
    const sourceAnalysisPath = join(dir, 'source-analysis.json');
    await writeJsonArtifact(timestampsPath, makeTimestamps(makeWords()));
    await writeJsonArtifact(sourceAnalysisPath, makeSourceAnalysis(sourceMediaPath));

    const result = await runLongformHighlightSelect({
      timestampsPath,
      outputPath,
      sourceMediaPath,
      sourceAnalysisPath,
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
      candidates: Array<{
        text: string;
        scores: { total: number };
        sourceSignals: { audioEnergyScore: number | null; sceneChangeScore: number | null };
      }>;
      source: { mediaPath: string | null; sourceDuration: number | null };
    };
    expect(artifact.source.mediaPath).toBe(sourceMediaPath);
    expect(artifact.source.sourceDuration).toBe(18);
    expect(artifact.candidates[0]?.text).toContain('Why do clips die');
    expect(artifact.candidates[0]?.scores.total).toBeGreaterThan(0);
    expect(artifact.candidates[0]?.sourceSignals.audioEnergyScore).toBe(0.82);
    expect(artifact.candidates[0]?.sourceSignals.sceneChangeScore).not.toBeNull();
  });
});
