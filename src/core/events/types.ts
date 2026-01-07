/**
 * Event Types for Pipeline Observer Pattern
 *
 * Defines all events emitted during pipeline execution.
 */

export type PipelineEventType =
  | 'pipeline:started'
  | 'pipeline:completed'
  | 'pipeline:failed'
  | 'stage:started'
  | 'stage:completed'
  | 'stage:failed'
  | 'stage:progress';

export interface BasePipelineEvent {
  type: PipelineEventType;
  timestamp: number;
  pipelineId: string;
}

export interface PipelineStartedEvent extends BasePipelineEvent {
  type: 'pipeline:started';
  topic: string;
  archetype: string;
}

export interface PipelineCompletedEvent extends BasePipelineEvent {
  type: 'pipeline:completed';
  durationMs: number;
  outputPath?: string;
}

export interface PipelineFailedEvent extends BasePipelineEvent {
  type: 'pipeline:failed';
  error: Error;
  stage?: string;
}

export interface StageStartedEvent extends BasePipelineEvent {
  type: 'stage:started';
  stage: 'script' | 'audio' | 'visuals' | 'render';
  stageIndex: number;
  totalStages: number;
}

export interface StageCompletedEvent extends BasePipelineEvent {
  type: 'stage:completed';
  stage: 'script' | 'audio' | 'visuals' | 'render';
  stageIndex: number;
  totalStages: number;
  durationMs: number;
  cost?: {
    estimatedCost?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface StageFailedEvent extends BasePipelineEvent {
  type: 'stage:failed';
  stage: 'script' | 'audio' | 'visuals' | 'render';
  stageIndex: number;
  totalStages: number;
  error: Error;
}

export interface StageProgressEvent extends BasePipelineEvent {
  type: 'stage:progress';
  stage: 'script' | 'audio' | 'visuals' | 'render';
  stageIndex: number;
  totalStages: number;
  phase?: string;
  progress: number; // 0-1
  message?: string;
}

export type PipelineEvent =
  | PipelineStartedEvent
  | PipelineCompletedEvent
  | PipelineFailedEvent
  | StageStartedEvent
  | StageCompletedEvent
  | StageFailedEvent
  | StageProgressEvent;

/**
 * Observer interface for pipeline events
 */
export interface PipelineObserver {
  onEvent(event: PipelineEvent): void;
}

/**
 * Handler function for specific event types
 */
export type EventHandler = (event: PipelineEvent) => void;

/**
 * Error handler for observer exceptions
 */
export type ErrorHandler = (error: Error, event: PipelineEvent) => void;
