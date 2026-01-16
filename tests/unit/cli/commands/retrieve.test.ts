import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

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

vi.mock('../../../../src/research/indexer', () => ({
  parseResearchIndexFile: vi.fn(),
  queryResearchEvidenceIndex: vi.fn(),
}));

vi.mock('../../../../src/core/embeddings/hash-embedder', () => ({
  HashEmbeddingProvider: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const indexData = {
  version: '1.0.0',
  dimensions: 8,
  items: [],
};

const results = [
  {
    score: 0.9,
    evidence: { title: 'Redis', url: 'https://example.com' },
  },
];

describe('cli retrieve command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope with result metadata', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { parseResearchIndexFile, queryResearchEvidenceIndex } =
      await import('../../../../src/research/indexer');
    (parseResearchIndexFile as unknown as ReturnType<typeof vi.fn>).mockReturnValue(indexData);
    (queryResearchEvidenceIndex as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(results);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { retrieveCommand } = await import('../../../../src/cli/commands/retrieve');
    await retrieveCommand.parseAsync(
      ['--index', 'index.json', '--query', 'redis', '--k', '5', '--output', 'out.json'],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.outputs.results).toBe(1);
    expect(payload.outputs.topScore).toBe(0.9);
  });

  it('prints summary in human mode', async () => {
    await configureRuntime({ json: false });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { parseResearchIndexFile, queryResearchEvidenceIndex } =
      await import('../../../../src/research/indexer');
    (parseResearchIndexFile as unknown as ReturnType<typeof vi.fn>).mockReturnValue(indexData);
    (queryResearchEvidenceIndex as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(results);

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);
    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { retrieveCommand } = await import('../../../../src/cli/commands/retrieve');
    await retrieveCommand.parseAsync(['--index', 'index.json', '--query', 'redis', '--k', '5'], {
      from: 'user',
    });

    expect(stderrSpy).toHaveBeenCalledWith('Query: "redis"');
    expect(stderrSpy).toHaveBeenCalledWith('Results: 1');
    expect(stdoutSpy).toHaveBeenCalledWith('retrieve.json');
  });

  it('rejects invalid k', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError, readInputFile } = await import('../../../../src/cli/utils');

    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { parseResearchIndexFile } = await import('../../../../src/research/indexer');
    (parseResearchIndexFile as unknown as ReturnType<typeof vi.fn>).mockReturnValue(indexData);

    const { retrieveCommand } = await import('../../../../src/cli/commands/retrieve');
    await expect(
      retrieveCommand.parseAsync(['--index', 'index.json', '--query', 'redis', '--k', '0'], {
        from: 'user',
      })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });
});
