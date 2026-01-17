import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const spawnMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

function createChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: (enc: string) => void };
    stderr: EventEmitter & { setEncoding: (enc: string) => void };
    kill: () => void;
  };
  child.stdout = new EventEmitter() as EventEmitter & { setEncoding: (enc: string) => void };
  child.stderr = new EventEmitter() as EventEmitter & { setEncoding: (enc: string) => void };
  child.stdout.setEncoding = vi.fn();
  child.stderr.setEncoding = vi.fn();
  child.kill = vi.fn();
  return child;
}

describe('runPythonJson', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('resolves parsed JSON on success', async () => {
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const { runPythonJson } = await import('../../../src/validate/python-json');
    const promise = runPythonJson({
      errorCode: 'TEST_ERROR',
      scriptPath: 'script.py',
      args: [],
      timeoutMs: 1000,
    });

    child.stdout.emit('data', '{"ok":true}');
    child.emit('close', 0);

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('rejects when exit code is non-zero', async () => {
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const { runPythonJson } = await import('../../../src/validate/python-json');
    const promise = runPythonJson({
      errorCode: 'TEST_ERROR',
      scriptPath: 'script.py',
      args: [],
      timeoutMs: 1000,
    });

    child.stdout.emit('data', '{"ok":false}');
    child.stderr.emit('data', 'boom');
    child.emit('close', 2);

    await expect(promise).rejects.toMatchObject({
      code: 'TEST_ERROR',
    });
  });

  it('rejects when JSON is invalid', async () => {
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const { runPythonJson } = await import('../../../src/validate/python-json');
    const promise = runPythonJson({
      errorCode: 'TEST_ERROR',
      scriptPath: 'script.py',
      args: [],
      timeoutMs: 1000,
    });

    child.stdout.emit('data', 'not json');
    child.emit('close', 0);

    await expect(promise).rejects.toMatchObject({
      code: 'TEST_ERROR',
    });
  });

  it('times out and kills the process', async () => {
    vi.useFakeTimers();
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const { runPythonJson } = await import('../../../src/validate/python-json');
    const promise = runPythonJson({
      errorCode: 'TEST_ERROR',
      scriptPath: 'script.py',
      args: [],
      timeoutMs: 10,
    });

    vi.advanceTimersByTime(20);

    await expect(promise).rejects.toMatchObject({ code: 'TEST_ERROR' });
    expect(child.kill).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
