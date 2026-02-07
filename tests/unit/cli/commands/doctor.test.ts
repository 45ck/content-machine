import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/core/doctor', () => ({
  runDoctor: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stdout,
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli doctor command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { runDoctor } = await import('../../../../src/core/doctor');
    (runDoctor as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: 1,
      ok: true,
      strict: false,
      checks: [{ id: 'config', label: 'Config', status: 'ok' }],
    });

    const { doctorCommand } = await import('../../../../src/cli/commands/doctor');
    await doctorCommand.parseAsync([], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('doctor');
    expect(payload.outputs.ok).toBe(true);
    expect(payload.outputs.checks.length).toBeGreaterThan(0);
  });
});
