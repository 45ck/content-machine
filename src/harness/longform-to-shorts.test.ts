import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { TimestampsOutput, WordTimestamp } from '../domain';
import { writeJsonArtifact } from './artifacts';
import { runLongformToShorts } from './longform-to-shorts';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-longform-to-shorts-'));
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

describe('runLongformToShorts', () => {
  it('writes candidates, snapped boundaries, and an approval-gated render handoff', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    const outputDir = join(dir, 'run');
    await writeJsonArtifact(timestampsPath, makeTimestamps(makeWords()));

    const result = await runLongformToShorts({
      timestampsPath,
      outputDir,
      minDuration: 3,
      targetDuration: 9,
      maxDuration: 14,
      maxCandidates: 2,
    });

    expect(result.result.outputDir).toBe(outputDir);
    expect(result.result.candidateCount).toBeGreaterThan(0);
    expect(result.result.status).toBe('needs-approval');
    expect(result.result.approvalPath).toBeNull();
    expect(result.result.renderHandoffPath).toBe(
      join(outputDir, 'handoff', 'render-handoff.v1.json')
    );
    expect(result.warnings).toContain(
      'No highlight approval was written; review candidates before clipping or rendering.'
    );

    const handoff = JSON.parse(await readFile(result.result.renderHandoffPath, 'utf8')) as {
      status: string;
      candidatePlans: Array<{ id: string; snappedStart: number; snappedEnd: number }>;
      renderInputsRequired: string[];
    };
    expect(handoff.status).toBe('needs-approval');
    expect(handoff.candidatePlans.length).toBeGreaterThan(0);
    expect(handoff.candidatePlans[0]?.snappedEnd).toBeGreaterThan(
      handoff.candidatePlans[0]?.snappedStart ?? 0
    );
    expect(handoff.renderInputsRequired).toContain('visualsPath');
  });

  it('writes approval when autoApproveSelected is enabled for smoke tests', async () => {
    const dir = await makeTempDir();
    const timestampsPath = join(dir, 'timestamps.json');
    const outputDir = join(dir, 'approved-run');
    await writeJsonArtifact(timestampsPath, makeTimestamps(makeWords()));

    const result = await runLongformToShorts({
      timestampsPath,
      outputDir,
      minDuration: 3,
      targetDuration: 9,
      maxDuration: 14,
      maxCandidates: 2,
      autoApproveSelected: true,
    });

    expect(result.result.status).toBe('approved-plan');
    expect(result.result.approvalPath).toBe(
      join(outputDir, 'highlights', 'highlight-approval.v1.json')
    );
    expect(result.result.approvedCandidateIds).toEqual([result.result.selectedCandidateId]);
  });
});
