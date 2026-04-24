import { describe, expect, it } from 'vitest';
import { selectHighlightCandidates } from './selector';
import type { TimestampsOutput, WordTimestamp } from '../domain';

function timedWords(text: string, gapAfter: Record<number, number> = {}): WordTimestamp[] {
  let cursor = 0;
  return text.split(/\s+/).map((word, index) => {
    const start = cursor;
    const end = start + 0.36;
    cursor = end + (gapAfter[index] ?? 0.12);
    return { word, start, end, confidence: 0.95 };
  });
}

function timestamps(words: WordTimestamp[]): TimestampsOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      {
        sceneId: 'scene-1',
        audioStart: words[0]?.start ?? 0,
        audioEnd: words[words.length - 1]?.end ?? 1,
        words,
      },
    ],
    allWords: words,
    totalDuration: words[words.length - 1]?.end ?? 1,
    ttsEngine: 'test',
    asrEngine: 'test',
  };
}

describe('selectHighlightCandidates', () => {
  it('prefers a hook-led, boundary-clean span over filler-heavy lead-in', () => {
    const words = timedWords(
      [
        'um',
        'like',
        'before',
        'we',
        'start',
        'this',
        'is',
        'context.',
        'Why',
        'do',
        'most',
        'AI',
        'videos',
        'fail?',
        'They',
        'start',
        'with',
        'tools',
        'instead',
        'of',
        'a',
        'real',
        'moment.',
        'That',
        'means',
        'the',
        'edit',
        'looks',
        'polished',
        'but',
        'still',
        'feels',
        'empty.',
      ].join(' '),
      { 7: 0.7, 22: 0.6 }
    );

    const result = selectHighlightCandidates(timestamps(words), {
      minDuration: 2,
      targetDuration: 7,
      maxDuration: 10,
      maxCandidates: 3,
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.text).toContain('Why do most AI videos fail');
    expect(result.candidates[0]?.text).not.toMatch(/^um like/);
    expect(result.candidates[0]?.scores.hook).toBeGreaterThan(0.7);
    expect(result.candidates[0]?.approval).toBe('pending');
  });

  it('returns no candidates when there are too few timed words', () => {
    const result = selectHighlightCandidates(timestamps(timedWords('too short')), {
      minDuration: 5,
      targetDuration: 8,
      maxDuration: 12,
    });

    expect(result.candidates).toEqual([]);
    expect(result.warnings).toContain('No candidate spans met the duration and word-count limits');
  });
});
