import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/visuals/observability', () => ({
  defaultVisualAssetLineagePath: vi.fn(() => '/tmp/lineage.jsonl'),
  defaultVisualsRoutingTelemetryPath: vi.fn(() => '/tmp/routing.jsonl'),
  readVisualsRoutingTelemetry: vi.fn(),
  readVisualAssetLineage: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

async function configureRuntime(update: { json: boolean; isTty?: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({
    json: update.json,
    isTty: update.isTty ?? false,
    verbose: false,
    offline: false,
    yes: false,
  });
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

describe('cli telemetry command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits routing summary in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { readVisualsRoutingTelemetry } = await import('../../../../src/visuals/observability');
    (readVisualsRoutingTelemetry as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        schemaVersion: 1,
        recordedAt: new Date().toISOString(),
        routingPolicy: 'balanced',
        providerChain: ['pexels', 'nanobanana'],
        sceneCount: 2,
        fromGenerated: 1,
        fallbacks: 0,
        totalGenerationCostUsd: 0.04,
        providerSummary: [
          { provider: 'pexels', attempts: 2, successes: 2, failures: 0, avgLatencyMs: 20 },
        ],
        skippedProviders: [],
      },
    ]);

    const { telemetryCommand } = await import('../../../../src/cli/commands/telemetry');
    await telemetryCommand.parseAsync(['routing', '--limit', '10'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('telemetry:routing');
    expect(payload.outputs.records).toBe(1);
  });

  it('emits lineage summary in human mode', async () => {
    await configureRuntime({ json: false, isTty: false });
    const capture = await captureOutput();

    const { readVisualAssetLineage } = await import('../../../../src/visuals/observability');
    (readVisualAssetLineage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        schemaVersion: 1,
        recordedAt: new Date().toISOString(),
        sceneId: 'scene-001',
        assetPath: '/tmp/a.mp4',
        source: 'stock-pexels',
        assetType: 'video',
        isFallback: false,
      },
    ]);

    const { telemetryCommand } = await import('../../../../src/cli/commands/telemetry');
    await telemetryCommand.parseAsync(['lineage'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Visual asset lineage:');
    expect(capture.stdout.join('')).toContain('lineage.jsonl');
  });
});
