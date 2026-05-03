import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const flowStageMocks = vi.hoisted(() => ({
  runDoctorReport: vi.fn(),
  runGenerateShort: vi.fn(),
  ingestReferenceVideo: vi.fn(),
  runLongformToShorts: vi.fn(),
}));

vi.mock('./doctor-report', () => ({
  runDoctorReport: flowStageMocks.runDoctorReport,
}));

vi.mock('./generate-short', () => ({
  runGenerateShort: flowStageMocks.runGenerateShort,
}));

vi.mock('./ingest', () => ({
  ingestReferenceVideo: flowStageMocks.ingestReferenceVideo,
}));

vi.mock('./longform-to-shorts', () => ({
  runLongformToShorts: flowStageMocks.runLongformToShorts,
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

  it('binds the default run output directory for doctor-report', async () => {
    flowStageMocks.runDoctorReport.mockResolvedValue({
      result: { outputPath: '/tmp/runs/doctor-1/doctor/report.json', ok: true },
      artifacts: [
        {
          path: '/tmp/runs/doctor-1/doctor/report.json',
          kind: 'file',
          description: 'doctor',
        },
      ],
    });

    const result = await runFlowFromManifest({
      flow: 'flows/doctor.flow',
      runId: 'doctor-1',
      input: { strict: false },
    });

    expect(flowStageMocks.runDoctorReport).toHaveBeenCalledWith(
      expect.objectContaining({
        strict: false,
        outputDir: resolve(repoRoot, 'runs/doctor-1/doctor'),
      })
    );
    expect(result.result.entrySkill).toBe('doctor-report');
    expect(result.result.outputDir).toBe(resolve(repoRoot, 'runs/doctor-1/doctor'));
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

  it('dispatches longform-to-shorts to the longform handler', async () => {
    flowStageMocks.runLongformToShorts.mockResolvedValue({
      result: {
        outputDir: '/tmp/runs/longform-1/longform-to-shorts',
        candidatesPath:
          '/tmp/runs/longform-1/longform-to-shorts/highlights/highlight-candidates.v1.json',
        renderHandoffPath: '/tmp/runs/longform-1/longform-to-shorts/handoff/render-handoff.v1.json',
        candidateCount: 2,
        selectedCandidateId: 'highlight-001',
      },
      artifacts: [
        {
          path: '/tmp/runs/longform-1/longform-to-shorts/handoff/render-handoff.v1.json',
          kind: 'file',
          description: 'handoff',
        },
      ],
    });

    const result = await runFlowFromManifest({
      flow: 'flows/longform-to-shorts.flow',
      runId: 'longform-1',
      input: { timestampsPath: '/tmp/source/timestamps.json', maxCandidates: 3 },
    });

    expect(flowStageMocks.runLongformToShorts).toHaveBeenCalledWith(
      expect.objectContaining({
        timestampsPath: '/tmp/source/timestamps.json',
        maxCandidates: 3,
        outputDir: resolve(repoRoot, 'runs/longform-1/longform-to-shorts'),
      })
    );
    expect(result.result.entrySkill).toBe('longform-to-shorts');
    expect(result.result.outputDir).toBe(resolve(repoRoot, 'runs/longform-1/longform-to-shorts'));
  });
});
