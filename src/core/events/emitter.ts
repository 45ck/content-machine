/**
 * Pipeline Event Emitter - Observer Pattern Implementation
 *
 * Central event bus for pipeline events with support for:
 * - Observer pattern (subscribe/unsubscribe)
 * - Event-type handlers with wildcards
 * - Error isolation (one observer failure doesn't affect others)
 */

import type { PipelineEvent, PipelineObserver, EventHandler, ErrorHandler } from './types.js';

export class PipelineEventEmitter {
  private observers: Set<PipelineObserver> = new Set();
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private errorHandlers: Set<ErrorHandler> = new Set();

  /**
   * Subscribe an observer to receive all events
   * @returns Unsubscribe function
   */
  subscribe(observer: PipelineObserver): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  /**
   * Subscribe to specific event types with optional wildcards
   * @param eventType - Event type or pattern ('stage:*', 'pipeline:*', '*')
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
      if (this.handlers.get(eventType)?.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Register error handler for observer exceptions
   * @returns Unsubscribe function
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Emit an event to all observers and matching handlers
   */
  emit(event: PipelineEvent): void {
    // Notify observers
    for (const observer of this.observers) {
      this.safeCall(() => observer.onEvent(event), event);
    }

    // Notify exact match handlers
    const exactHandlers = this.handlers.get(event.type);
    if (exactHandlers) {
      for (const handler of exactHandlers) {
        this.safeCall(() => handler(event), event);
      }
    }

    // Notify wildcard handlers
    const prefix = event.type.split(':')[0];
    const wildcardPattern = `${prefix}:*`;
    const wildcardHandlers = this.handlers.get(wildcardPattern);
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        this.safeCall(() => handler(event), event);
      }
    }

    // Notify catch-all handlers
    const catchAllHandlers = this.handlers.get('*');
    if (catchAllHandlers) {
      for (const handler of catchAllHandlers) {
        this.safeCall(() => handler(event), event);
      }
    }
  }

  /**
   * Clear all observers, handlers, and error handlers
   */
  clear(): void {
    this.observers.clear();
    this.handlers.clear();
    this.errorHandlers.clear();
  }

  /**
   * Get the total number of listeners (observers + handlers)
   */
  get listenerCount(): number {
    let count = this.observers.size;
    for (const handlers of this.handlers.values()) {
      count += handlers.size;
    }
    return count;
  }

  /**
   * Safely call a function, catching and reporting errors
   */
  private safeCall(fn: () => void, event: PipelineEvent): void {
    try {
      fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.notifyErrorHandlers(error, event);
    }
  }

  /**
   * Notify error handlers, catching their exceptions too
   */
  private notifyErrorHandlers(error: Error, event: PipelineEvent): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error, event);
      } catch {
        // Swallow error handler exceptions
      }
    }
  }
}
