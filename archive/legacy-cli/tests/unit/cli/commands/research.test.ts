import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start: function () {
      return this;
    },
    succeed: function () {
      return this;
    },
    fail: function () {
      return this;
    },
    stop: function () {
      return this;
    },
  })),
}));

vi.mock('../../../../src/cli/utils', () => ({
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

vi.mock('../../../../src/research/orchestrator', () => ({
  createResearchOrchestrator: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const researchResult = {
  output: {
    sources: ['hackernews', 'reddit'],
    totalResults: 3,
    evidence: [],
    suggestedAngles: [
      {
        angle: 'Angle',
        hook: 'Hook',
        archetype: 'listicle',
        targetEmotion: 'curiosity',
        confidence: 0.8,
      },
    ],
  },
  errors: [{ source: 'reddit', error: new Error('fail') }],
  timingMs: { total: 123, sources: { hackernews: 50, reddit: 73 } },
};

describe('cli research command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope on dry run', async () => {
    await configureRuntime({ json: true });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { researchCommand } = await import('../../../../src/cli/commands/research');
    await researchCommand.parseAsync(
      ['--query', 'AI', '--sources', 'hackernews,reddit', '--output', 'out.json', '--dry-run'],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.command).toBe('research');
    expect(payload.outputs.dryRun).toBe(true);
  });

  it('runs research and prints summary in human mode', async () => {
    await configureRuntime({ json: false });

    const { createResearchOrchestrator } = await import('../../../../src/research/orchestrator');
    (createResearchOrchestrator as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      research: vi.fn().mockResolvedValue(researchResult),
    });

    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);
    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);

    const { researchCommand } = await import('../../../../src/cli/commands/research');
    await researchCommand.parseAsync(
      ['--query', 'AI', '--sources', 'hackernews,reddit', '--output', 'out.json', '--mock'],
      { from: 'user' }
    );

    expect(stderrSpy).toHaveBeenCalledWith('Research: "AI"');
    expect(stdoutSpy).toHaveBeenCalledWith('out.json');
  });

  it('rejects invalid sources', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { researchCommand } = await import('../../../../src/cli/commands/research');
    await expect(
      researchCommand.parseAsync(['--query', 'AI', '--sources', 'nope'], { from: 'user' })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('rejects empty sources list', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { researchCommand } = await import('../../../../src/cli/commands/research');
    await expect(
      researchCommand.parseAsync(['--query', 'AI', '--sources', ','], { from: 'user' })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });
});
