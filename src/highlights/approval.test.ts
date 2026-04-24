import { describe, expect, it } from 'vitest';
import { createHighlightApproval } from './approval';
import type { HighlightSelectionOutput } from '../domain';

function selection(): HighlightSelectionOutput {
  return {
    schemaVersion: '1.0.0',
    selectionMethod: 'deterministic-transcript-window-v1',
    source: {
      timestampsPath: 'timestamps.json',
      mediaPath: 'source.mp4',
      sourceDuration: 42,
    },
    params: {
      minDuration: 3,
      targetDuration: 8,
      maxDuration: 12,
      maxCandidates: 2,
      minWords: 4,
      minGapSeconds: 1,
    },
    spacingPolicy: {
      minGapSeconds: 1,
      enforceNonOverlap: true,
    },
    selectedCandidateId: 'highlight-001',
    candidates: [
      {
        id: 'highlight-001',
        rank: 1,
        start: 1,
        end: 9,
        duration: 8,
        text: 'Why this clip works is the payoff.',
        wordStartIndex: 0,
        wordEndIndex: 6,
        scores: {
          hook: 1,
          coherence: 1,
          payoff: 1,
          boundary: 1,
          silenceRisk: 0,
          fillerRisk: 0,
          total: 1,
        },
        signals: {
          wordCount: 7,
          leadingGapSeconds: 0.6,
          trailingGapSeconds: 0.7,
          maxInternalGapSeconds: 0.1,
          fillerWordCount: 0,
          startsAtSentenceBoundary: true,
          endsAtSentenceBoundary: true,
          startsWithHookCue: true,
          endsWithPayoffCue: true,
        },
        sourceSignals: {
          silenceBeforeSeconds: 0.6,
          silenceAfterSeconds: 0.7,
          internalSilenceSeconds: 0.1,
          fillerOnlySegmentCount: 0,
          audioEnergyScore: null,
          sceneChangeScore: null,
          llmNarrativeScore: null,
        },
        rejectionReasons: [],
        approval: 'pending',
        approvalNotes: null,
      },
    ],
    warnings: [],
  };
}

describe('createHighlightApproval', () => {
  it('approves the selected candidate by default and emits a decision artifact', () => {
    const result = createHighlightApproval(selection(), {
      sourceCandidatesPath: 'highlight-candidates.v1.json',
      actor: 'codex',
      decidedAt: '2026-04-24T00:00:00.000Z',
      notesByCandidateId: { 'highlight-001': 'best hook' },
    });

    expect(result.approvedCandidateIds).toEqual(['highlight-001']);
    expect(result.decisions).toEqual([
      {
        candidateId: 'highlight-001',
        approval: 'approved',
        notes: 'best hook',
        renderOrder: 1,
      },
    ]);
    expect(result.candidates[0]?.approval).toBe('approved');
    expect(result.candidates[0]?.approvalNotes).toBe('best hook');
  });
});
