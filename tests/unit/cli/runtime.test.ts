import { describe, expect, it, vi } from 'vitest';
import {
  getCliRuntime,
  getElapsedMs,
  resetCliRuntime,
  setCliRuntime,
} from '../../../src/cli/runtime';

describe('cli runtime', () => {
  it('stores and updates runtime options', () => {
    resetCliRuntime();
    setCliRuntime({ json: true, verbose: true, isTty: false, command: 'script' });

    const runtime = getCliRuntime();
    expect(runtime.json).toBe(true);
    expect(runtime.verbose).toBe(true);
    expect(runtime.isTty).toBe(false);
    expect(runtime.command).toBe('script');
  });

  it('tracks elapsed time', () => {
    vi.useFakeTimers();
    resetCliRuntime();
    setCliRuntime({ startTime: 1000 });
    vi.setSystemTime(1500);

    expect(getElapsedMs()).toBe(500);

    vi.useRealTimers();
  });
});
