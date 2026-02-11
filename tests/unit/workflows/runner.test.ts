import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const spawned: EventEmitter[] = [];

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => {
    const emitter = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    emitter.kill = vi.fn();
    spawned.push(emitter);
    return emitter;
  }),
}));

describe('workflows runner', () => {
  beforeEach(() => {
    spawned.length = 0;
    vi.clearAllMocks();
    // In coverage mode we may run with a single non-isolated worker, so module caches can
    // persist across files. Reset modules to ensure our `node:child_process` mock applies.
    vi.resetModules();
  });

  it('resolves workflow stage modes', async () => {
    const { resolveWorkflowStageMode } = await import('../../../src/workflows/runner');
    expect(resolveWorkflowStageMode(undefined)).toBe('builtin');
    expect(resolveWorkflowStageMode({ mode: 'external' })).toBe('external');
    expect(resolveWorkflowStageMode({ exec: { command: 'echo' } })).toBe('external');
    expect(resolveWorkflowStageMode({ mode: 'builtin', exec: { command: 'echo' } })).toBe(
      'external'
    );
  });

  it('detects workflow exec usage', async () => {
    const { workflowHasExec } = await import('../../../src/workflows/runner');
    expect(workflowHasExec({ id: 'x', name: 'x', steps: [] })).toBe(false);
    expect(
      workflowHasExec({ id: 'x', name: 'x', steps: [], hooks: { pre: [{ command: 'x' }] } })
    ).toBe(true);
    expect(
      workflowHasExec({
        id: 'x',
        name: 'x',
        steps: [],
        stages: { script: { exec: { command: 'x' } } },
      })
    ).toBe(true);
  });

  it('collects workflow pre/post commands', async () => {
    const { collectWorkflowPreCommands, collectWorkflowPostCommands } =
      await import('../../../src/workflows/runner');

    const workflow = {
      id: 'x',
      name: 'x',
      steps: [],
      hooks: { pre: [{ command: 'a' }], post: [{ command: 'z' }] },
      stages: { audio: { exec: { command: 'b' } } },
    };

    expect(collectWorkflowPreCommands(workflow)).toEqual([{ command: 'a' }, { command: 'b' }]);
    expect(collectWorkflowPostCommands(workflow)).toEqual([{ command: 'z' }]);
  });

  it('runs workflow commands and handles non-zero exit codes', async () => {
    const { CMError } = await import('../../../src/core/errors');
    const { runWorkflowCommands } = await import('../../../src/workflows/runner');
    const runPromise = runWorkflowCommands([{ command: 'echo', args: ['hi'] }], {});

    spawned[0].emit('exit', 0);
    await expect(runPromise).resolves.toBeUndefined();

    const failPromise = runWorkflowCommands([{ command: 'echo' }], {});
    spawned[1].emit('exit', 2);
    await expect(failPromise).rejects.toBeInstanceOf(CMError);
  });

  it('kills commands when timeout expires', async () => {
    vi.useFakeTimers();
    const { runWorkflowCommands } = await import('../../../src/workflows/runner');

    const promise = runWorkflowCommands([{ command: 'sleep', timeoutMs: 5 }], {
      allowOutput: false,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(spawned[0].kill).toHaveBeenCalledWith('SIGTERM');

    spawned[0].emit('exit', 0);
    await expect(promise).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});
