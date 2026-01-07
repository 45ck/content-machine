/**
 * Cost Tracker Observer
 *
 * Tracks costs and tokens across pipeline stages for budget monitoring.
 */

import type { PipelineEvent, PipelineObserver, StageCompletedEvent } from '../types.js';

export interface StageCost {
  estimatedCost?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export class CostTrackerObserver implements PipelineObserver {
  private costs: Map<string, StageCost> = new Map();
  private durations: Map<string, number> = new Map();

  onEvent(event: PipelineEvent): void {
    if (event.type === 'stage:completed') {
      this.trackStageCompletion(event);
    }
  }

  private trackStageCompletion(event: StageCompletedEvent): void {
    if (event.cost) {
      this.costs.set(event.stage, {
        estimatedCost: event.cost.estimatedCost,
        inputTokens: event.cost.inputTokens,
        outputTokens: event.cost.outputTokens,
      });
    }
    this.durations.set(event.stage, event.durationMs);
  }

  /**
   * Get total estimated cost across all stages
   */
  getTotalCost(): number {
    let total = 0;
    for (const cost of this.costs.values()) {
      total += cost.estimatedCost ?? 0;
    }
    return total;
  }

  /**
   * Get total tokens (input + output) across all stages
   */
  getTotalTokens(): { input: number; output: number; total: number } {
    let input = 0;
    let output = 0;
    for (const cost of this.costs.values()) {
      input += cost.inputTokens ?? 0;
      output += cost.outputTokens ?? 0;
    }
    return { input, output, total: input + output };
  }

  /**
   * Get cost breakdown by stage
   */
  getCostBreakdown(): Record<string, StageCost> {
    const result: Record<string, StageCost> = {};
    for (const [stage, cost] of this.costs) {
      result[stage] = { ...cost };
    }
    return result;
  }

  /**
   * Get duration breakdown by stage
   */
  getDurationBreakdown(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [stage, duration] of this.durations) {
      result[stage] = duration;
    }
    return result;
  }

  /**
   * Get total duration across all stages
   */
  getTotalDuration(): number {
    let total = 0;
    for (const duration of this.durations.values()) {
      total += duration;
    }
    return total;
  }

  /**
   * Reset all tracked data
   */
  reset(): void {
    this.costs.clear();
    this.durations.clear();
  }
}
