import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const flowStageMocks = vi.hoisted(() => ({
  runGenerateShort: vi.fn(),
  ingestReferenceVideo: vi.fn(),
}));

vi.mock('./generate-short', () => ({
  runGenerateShort: flowStageMocks.runGenerateShort,
}));

vi.mock('./ingest', () => ({
  ingestReferenceVideo: flowStageMocks.ingestReferenceVideo,
}));

import { runFlowFromManifest } from './flow-runner';

describe('runFlowFromManifest', () => {
  const repoRoot = process.cwd();

  beforeEach(() => {
    Object.values(flowStageMocks).forEach((mock) => mock.mockReset());
  });

  it('binds the default run output directory for generate-short', async () => {
    flowStageMocks.runGenerateShort.mockResolvedValue({
      result: { videoPath: '/tmp/runs/run-123/render/video.mp4' },
      artifacts: [
        {
          path: '/tmp/runs/run-123/render/video.mp4',
          kind: 'file',
          description: 'video',
        },
      ],
    });

    const result = await runFlowFromManifest({
      flow: 'flows/generate-short.flow',
      runId: 'run-123',
      input: {
        topic: 'Redis vs PostgreSQL',
        audio: { mock: true },
        visuals: { mock: true },
        render: { mock: true },
        publishPrep: { enabled: false },
      },
    });

    expect(flowStageMocks.runGenerateShort).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Redis vs PostgreSQL',
        outputDir: resolve(repoRoot, 'runs/run-123'),
      })
    );
    expect(result.result.flow).toBe('generate-short');
    expect(result.result.outputDir).toBe(resolve(repoRoot, 'runs/run-123'));
    expect(result.artifacts).toEqual(
      expect.arrayContaining([
        {
          path: resolve(repoRoot, 'runs/run-123'),
          kind: 'directory',
          description: 'Flow output directory',
        },
      ])
    );
  });

  it('dispatches reverse-engineer-winner to the ingest handler', async () => {
    flowStageMocks.ingestReferenceVideo.mockResolvedValue({
      result: { outputDir: '/tmp/reverse', blueprintPath: '/tmp/reverse/blueprint.v1.json' },
      artifacts: [{ path: '/tmp/reverse', kind: 'directory', description: 'ingest' }],
    });

    const result = await runFlowFromManifest({
      flow: 'flows/reverse-engineer-winner.flow',
      runId: 'winner-1',
      input: { videoPath: '/tmp/video.mp4' },
    });

    expect(flowStageMocks.ingestReferenceVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        videoPath: '/tmp/video.mp4',
        outputDir: resolve(repoRoot, 'runs/winner-1/reverse-engineer'),
      })
    );
    expect(result.result.entrySkill).toBe('reverse-engineer-winner');
  });
});
