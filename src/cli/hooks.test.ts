import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCliRuntime, setCliRuntime } from './runtime';

const resolveHookSelectionMock = vi.fn();

vi.mock('../hooks/resolve', () => ({
  resolveHookSelection: resolveHookSelectionMock,
}));

describe('cli hook resolution', () => {
  beforeEach(() => {
    resetCliRuntime();
    resolveHookSelectionMock.mockReset();
    resolveHookSelectionMock.mockResolvedValue(null);
  });

  it('returns null when --hook none is passed', async () => {
    setCliRuntime({ yes: false });
    const { resolveHookFromCli } = await import('./hooks');

    const result = await resolveHookFromCli({ hook: 'none' });

    expect(result).toBeNull();
    expect(resolveHookSelectionMock).not.toHaveBeenCalled();
  });

  it('returns null when --no-hook is passed (hook=false)', async () => {
    setCliRuntime({ yes: false });
    const { resolveHookFromCli } = await import('./hooks');

    const result = await resolveHookFromCli({ hook: false as any });

    expect(result).toBeNull();
    expect(resolveHookSelectionMock).not.toHaveBeenCalled();
  });

  it('returns null when no default hook is configured', async () => {
    setCliRuntime({ yes: false });
    const { resolveHookFromCli } = await import('./hooks');

    // With no --hook flag and no defaultHook in config (now undefined by default),
    // should return null
    const result = await resolveHookFromCli({});

    expect(result).toBeNull();
    expect(resolveHookSelectionMock).not.toHaveBeenCalled();
  });

  it('treats --yes as permission to auto-download hook clips', async () => {
    setCliRuntime({ yes: true });
    const { resolveHookFromCli } = await import('./hooks');

    await resolveHookFromCli({
      hook: 'no-crunch',
      hookLibrary: 'transitionalhooks',
      hooksDir: '/tmp/hooks',
    });

    expect(resolveHookSelectionMock).toHaveBeenCalledTimes(1);
    const args = resolveHookSelectionMock.mock.calls[0][0] as any;
    expect(args.downloadMissing).toBe(true);
  });
});
