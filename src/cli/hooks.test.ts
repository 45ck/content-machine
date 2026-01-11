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
