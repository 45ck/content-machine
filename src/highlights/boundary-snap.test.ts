import { describe, expect, it } from 'vitest';
import { selectHighlightCandidates } from './selector';
import { snapHighlightBoundaries } from './boundary-snap';
import type { TimestampsOutput, WordTimestamp } from '../domain';

function words(): WordTimestamp[] {
  let cursor = 0;
  return [
    'Lead',
    'in.',
    'Why',
    'does',
    'this',
    'moment',
    'work?',
    'Because',
    'it',
    'lands',
    'cleanly.',
  ].map((word, index) => {
    const start = cursor;
    const end = start + 0.35;
    cursor = end + (index === 1 ? 0.7 : 0.1);
    return { word, start, end, confidence: 0.95 };
  });
}

function timestamps(allWords: WordTimestamp[]): TimestampsOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [{ sceneId: 'scene-1', audioStart: 0, audioEnd: 5, words: allWords }],
    allWords,
    totalDuration: 5,
    ttsEngine: 'test',
    asrEngine: 'test',
  };
}

describe('snapHighlightBoundaries', () => {
  it('returns snapped boundary metadata for selected candidates', () => {
    const source = timestamps(words());
    const candidates = selectHighlightCandidates(source, {
      minDuration: 1,
      targetDuration: 3,
      maxDuration: 5,
      maxCandidates: 1,
      minWords: 4,
    });

    const result = snapHighlightBoundaries(source, candidates, {
      sourceCandidatesPath: 'candidates.json',
      sourceTimestampsPath: 'timestamps.json',
      snappedAt: '2026-04-24T00:00:00.000Z',
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.id).toBe('highlight-001');
    expect(result.candidates[0]?.snappedStart).toBeLessThanOrEqual(
      candidates.candidates[0]?.start ?? 0
    );
    expect(result.candidates[0]?.reasons.length).toBeGreaterThan(0);
  });
});
