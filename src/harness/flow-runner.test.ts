import { beforeEach, describe, expect, it, vi } from 'vitest';

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
        outputDir: '/home/calvin/Documents/GitHub/content-machine/runs/run-123',
      })
    );
    expect(result.result.flow).toBe('generate-short');
    expect(result.result.outputDir).toBe(
      '/home/calvin/Documents/GitHub/content-machine/runs/run-123'
    );
    expect(result.artifacts).toEqual(
      expect.arrayContaining([
        {
          path: '/home/calvin/Documents/GitHub/content-machine/runs/run-123',
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
        outputDir: '/home/calvin/Documents/GitHub/content-machine/runs/winner-1/reverse-engineer',
      })
    );
    expect(result.result.entrySkill).toBe('reverse-engineer-winner');
  });
});
