/**
 * Event Emitter Tests
 *
 * Tests for Observer pattern implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PipelineEventEmitter,
  PipelineObserver,
  PipelineEvent,
} from '../../../../src/core/events/index.js';

function createMockEvent(type: string, overrides = {}): PipelineEvent {
  return {
    type,
    timestamp: Date.now(),
    pipelineId: 'test-123',
    ...overrides,
  } as PipelineEvent;
}

describe('PipelineEventEmitter', () => {
  let emitter: PipelineEventEmitter;

  beforeEach(() => {
    emitter = new PipelineEventEmitter();
  });

  describe('subscribe', () => {
    it('should notify subscribed observers', () => {
      const observer: PipelineObserver = { onEvent: vi.fn() };
      emitter.subscribe(observer);

      const event = createMockEvent('pipeline:started', {
        topic: 'test',
        archetype: 'listicle',
      });
      emitter.emit(event);

      expect(observer.onEvent).toHaveBeenCalledWith(event);
    });

    it('should return unsubscribe function', () => {
      const observer: PipelineObserver = { onEvent: vi.fn() };
      const unsubscribe = emitter.subscribe(observer);

      unsubscribe();

      emitter.emit(createMockEvent('pipeline:started'));
      expect(observer.onEvent).not.toHaveBeenCalled();
    });

    it('should support multiple observers', () => {
      const observer1: PipelineObserver = { onEvent: vi.fn() };
      const observer2: PipelineObserver = { onEvent: vi.fn() };

      emitter.subscribe(observer1);
      emitter.subscribe(observer2);

      const event = createMockEvent('pipeline:started');
      emitter.emit(event);

      expect(observer1.onEvent).toHaveBeenCalledWith(event);
      expect(observer2.onEvent).toHaveBeenCalledWith(event);
    });

    it('should not add duplicate observers', () => {
      const observer: PipelineObserver = { onEvent: vi.fn() };

      emitter.subscribe(observer);
      emitter.subscribe(observer);

      emitter.emit(createMockEvent('pipeline:started'));

      // Set should prevent duplicates
      expect(observer.onEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('on', () => {
    it('should notify handlers for exact event type', () => {
      const handler = vi.fn();
      emitter.on('stage:completed', handler);

      const event = createMockEvent('stage:completed', {
        stage: 'script',
        durationMs: 1000,
      });
      emitter.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not notify handlers for different event type', () => {
      const handler = vi.fn();
      emitter.on('stage:completed', handler);

      emitter.emit(createMockEvent('stage:started'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support wildcard pattern stage:*', () => {
      const handler = vi.fn();
      emitter.on('stage:*', handler);

      emitter.emit(createMockEvent('stage:started'));
      emitter.emit(createMockEvent('stage:completed'));
      emitter.emit(createMockEvent('stage:failed'));

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should support wildcard pattern pipeline:*', () => {
      const handler = vi.fn();
      emitter.on('pipeline:*', handler);

      emitter.emit(createMockEvent('pipeline:started'));
      emitter.emit(createMockEvent('pipeline:completed'));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support catch-all wildcard *', () => {
      const handler = vi.fn();
      emitter.on('*', handler);

      emitter.emit(createMockEvent('pipeline:started'));
      emitter.emit(createMockEvent('stage:completed'));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on('stage:completed', handler);

      unsubscribe();

      emitter.emit(createMockEvent('stage:completed'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('stage:completed', handler1);
      emitter.on('stage:completed', handler2);

      emitter.emit(createMockEvent('stage:completed'));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('error isolation', () => {
    it('should catch observer errors and continue', () => {
      const badObserver: PipelineObserver = {
        onEvent: vi.fn(() => {
          throw new Error('observer error');
        }),
      };
      const goodObserver: PipelineObserver = { onEvent: vi.fn() };

      emitter.subscribe(badObserver);
      emitter.subscribe(goodObserver);

      emitter.emit(createMockEvent('pipeline:started'));

      expect(goodObserver.onEvent).toHaveBeenCalled();
    });

    it('should call error handlers when observer throws', () => {
      const errorHandler = vi.fn();
      emitter.onError(errorHandler);

      const badObserver: PipelineObserver = {
        onEvent: () => {
          throw new Error('test error');
        },
      };
      emitter.subscribe(badObserver);

      const event = createMockEvent('pipeline:started');
      emitter.emit(event);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test error' }),
        event
      );
    });

    it('should catch error handler exceptions', () => {
      const badErrorHandler = vi.fn(() => {
        throw new Error('error handler error');
      });
      emitter.onError(badErrorHandler);

      const badObserver: PipelineObserver = {
        onEvent: () => {
          throw new Error('observer error');
        },
      };
      emitter.subscribe(badObserver);

      // Should not throw
      expect(() => emitter.emit(createMockEvent('pipeline:started'))).not.toThrow();
    });

    it('should convert non-Error throws to Error', () => {
      const errorHandler = vi.fn();
      emitter.onError(errorHandler);

      const badObserver: PipelineObserver = {
        onEvent: () => {
          throw 'string error'; // Non-Error throw
        },
      };
      emitter.subscribe(badObserver);

      emitter.emit(createMockEvent('pipeline:started'));

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' }),
        expect.any(Object)
      );
    });
  });

  describe('clear', () => {
    it('should remove all observers and handlers', () => {
      const observer: PipelineObserver = { onEvent: vi.fn() };
      const handler = vi.fn();

      emitter.subscribe(observer);
      emitter.on('stage:completed', handler);

      emitter.clear();

      emitter.emit(createMockEvent('stage:completed'));

      expect(observer.onEvent).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove error handlers', () => {
      const errorHandler = vi.fn();
      emitter.onError(errorHandler);

      emitter.clear();

      const badObserver: PipelineObserver = {
        onEvent: () => {
          throw new Error('test');
        },
      };
      emitter.subscribe(badObserver);
      emitter.emit(createMockEvent('pipeline:started'));

      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for empty emitter', () => {
      expect(emitter.listenerCount).toBe(0);
    });

    it('should count observers and handlers', () => {
      emitter.subscribe({ onEvent: vi.fn() });
      expect(emitter.listenerCount).toBe(1);

      emitter.on('stage:completed', vi.fn());
      expect(emitter.listenerCount).toBe(2);

      emitter.on('stage:*', vi.fn());
      expect(emitter.listenerCount).toBe(3);
    });

    it('should decrease when unsubscribed', () => {
      const observer: PipelineObserver = { onEvent: vi.fn() };
      const unsubscribe = emitter.subscribe(observer);

      expect(emitter.listenerCount).toBe(1);

      unsubscribe();

      expect(emitter.listenerCount).toBe(0);
    });
  });

  describe('onError', () => {
    it('should return unsubscribe function', () => {
      const errorHandler = vi.fn();
      const unsubscribe = emitter.onError(errorHandler);

      unsubscribe();

      const badObserver: PipelineObserver = {
        onEvent: () => {
          throw new Error('test');
        },
      };
      emitter.subscribe(badObserver);
      emitter.emit(createMockEvent('pipeline:started'));

      expect(errorHandler).not.toHaveBeenCalled();
    });
  });
});
