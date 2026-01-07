/**
 * Cost Tracker Observer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostTrackerObserver, PipelineEvent } from '../../../../src/core/events/index.js';

function createStageCompletedEvent(
  stage: 'script' | 'audio' | 'visuals' | 'render',
  overrides = {}
): PipelineEvent {
  return {
    type: 'stage:completed',
    timestamp: Date.now(),
    pipelineId: 'test-123',
    stage,
    stageIndex: 0,
    totalStages: 4,
    durationMs: 1000,
    ...overrides,
  } as PipelineEvent;
}

describe('CostTrackerObserver', () => {
  let tracker: CostTrackerObserver;

  beforeEach(() => {
    tracker = new CostTrackerObserver();
  });

  describe('getTotalCost', () => {
    it('should return 0 for no events', () => {
      expect(tracker.getTotalCost()).toBe(0);
    });

    it('should accumulate costs from stage completions', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { estimatedCost: 0.01, inputTokens: 100, outputTokens: 50 },
        })
      );
      tracker.onEvent(
        createStageCompletedEvent('audio', {
          cost: { estimatedCost: 0.02, inputTokens: 200, outputTokens: 100 },
        })
      );

      expect(tracker.getTotalCost()).toBe(0.03);
    });

    it('should handle stages without cost', () => {
      tracker.onEvent(createStageCompletedEvent('script'));
      tracker.onEvent(
        createStageCompletedEvent('audio', {
          cost: { estimatedCost: 0.02 },
        })
      );

      expect(tracker.getTotalCost()).toBe(0.02);
    });

    it('should handle null estimated cost', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { inputTokens: 100, outputTokens: 50 },
        })
      );

      expect(tracker.getTotalCost()).toBe(0);
    });
  });

  describe('getTotalTokens', () => {
    it('should return zeros for no events', () => {
      const tokens = tracker.getTotalTokens();
      expect(tokens.input).toBe(0);
      expect(tokens.output).toBe(0);
      expect(tokens.total).toBe(0);
    });

    it('should accumulate tokens from all stages', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { inputTokens: 100, outputTokens: 50 },
        })
      );
      tracker.onEvent(
        createStageCompletedEvent('visuals', {
          cost: { inputTokens: 200, outputTokens: 100 },
        })
      );

      const tokens = tracker.getTotalTokens();
      expect(tokens.input).toBe(300);
      expect(tokens.output).toBe(150);
      expect(tokens.total).toBe(450);
    });
  });

  describe('getCostBreakdown', () => {
    it('should return empty object for no events', () => {
      expect(tracker.getCostBreakdown()).toEqual({});
    });

    it('should return breakdown by stage', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { estimatedCost: 0.01 },
        })
      );
      tracker.onEvent(
        createStageCompletedEvent('visuals', {
          cost: { estimatedCost: 0.02 },
        })
      );

      const breakdown = tracker.getCostBreakdown();
      expect(breakdown.script?.estimatedCost).toBe(0.01);
      expect(breakdown.visuals?.estimatedCost).toBe(0.02);
    });

    it('should return a copy (not reference to internal state)', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { estimatedCost: 0.01 },
        })
      );

      const breakdown1 = tracker.getCostBreakdown();
      const breakdown2 = tracker.getCostBreakdown();

      expect(breakdown1).not.toBe(breakdown2);
    });
  });

  describe('getDurationBreakdown', () => {
    it('should return empty object for no events', () => {
      expect(tracker.getDurationBreakdown()).toEqual({});
    });

    it('should track duration per stage', () => {
      tracker.onEvent(createStageCompletedEvent('script', { durationMs: 1000 }));
      tracker.onEvent(createStageCompletedEvent('audio', { durationMs: 2000 }));

      const breakdown = tracker.getDurationBreakdown();
      expect(breakdown.script).toBe(1000);
      expect(breakdown.audio).toBe(2000);
    });
  });

  describe('getTotalDuration', () => {
    it('should return 0 for no events', () => {
      expect(tracker.getTotalDuration()).toBe(0);
    });

    it('should sum all stage durations', () => {
      tracker.onEvent(createStageCompletedEvent('script', { durationMs: 1000 }));
      tracker.onEvent(createStageCompletedEvent('audio', { durationMs: 2000 }));
      tracker.onEvent(createStageCompletedEvent('visuals', { durationMs: 1500 }));

      expect(tracker.getTotalDuration()).toBe(4500);
    });
  });

  describe('reset', () => {
    it('should clear all tracked data', () => {
      tracker.onEvent(
        createStageCompletedEvent('script', {
          cost: { estimatedCost: 0.01 },
          durationMs: 1000,
        })
      );

      tracker.reset();

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getTotalDuration()).toBe(0);
      expect(tracker.getCostBreakdown()).toEqual({});
    });
  });

  describe('event filtering', () => {
    it('should ignore non-stage:completed events', () => {
      tracker.onEvent({
        type: 'stage:started',
        timestamp: Date.now(),
        pipelineId: 'test',
        stage: 'script',
        stageIndex: 0,
        totalStages: 4,
      } as PipelineEvent);

      tracker.onEvent({
        type: 'pipeline:started',
        timestamp: Date.now(),
        pipelineId: 'test',
        topic: 'test',
        archetype: 'listicle',
      } as PipelineEvent);

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getTotalDuration()).toBe(0);
    });
  });
});
