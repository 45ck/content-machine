/**
 * CLI Progress Observer Tests
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PipelineEvent } from '../../../../src/core/events/index.js';
import { CliProgressObserver } from '../../../../src/core/events/index.js';

function createEvent(
  type: PipelineEvent['type'],
  overrides: Record<string, unknown> = {}
): PipelineEvent {
  return {
    type,
    timestamp: Date.now(),
    pipelineId: 'test-123',
    ...overrides,
  } as PipelineEvent;
}

describe('CliProgressObserver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to stderr by default (stdout reserved for artifacts)', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

    const observer = new CliProgressObserver();
    observer.onEvent(
      createEvent('pipeline:started', { topic: 'Test topic', archetype: 'listicle' })
    );

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('emits ASCII-only UI output (no unicode icons)', () => {
    let output = '';
    const stream = {
      isTTY: false,
      write: (text: string) => {
        output += text;
      },
    };

    const observer = new CliProgressObserver(stream);
    observer.onEvent(createEvent('pipeline:started', { topic: 'Test', archetype: 'listicle' }));
    observer.onEvent(
      createEvent('stage:started', { stage: 'script', stageIndex: 0, totalStages: 4 })
    );
    observer.onEvent(
      createEvent('stage:completed', {
        stage: 'script',
        stageIndex: 0,
        totalStages: 4,
        durationMs: 1234,
      })
    );

    expect(output.length).toBeGreaterThan(0);
    for (const ch of output) {
      expect(ch.charCodeAt(0)).toBeLessThan(128);
    }
  });

  it('prints coarse progress lines in non-TTY mode', () => {
    let output = '';
    const stream = {
      isTTY: false,
      write: (text: string) => {
        output += text;
      },
    };

    const observer = new CliProgressObserver(stream);
    observer.onEvent(
      createEvent('stage:started', { stage: 'render', stageIndex: 3, totalStages: 4 })
    );
    observer.onEvent(
      createEvent('stage:progress', {
        stage: 'render',
        stageIndex: 3,
        totalStages: 4,
        progress: 0.5,
        message: 'Rendering',
      })
    );

    expect(output).toContain('50%');
    expect(output).not.toContain('\r');
  });
});
