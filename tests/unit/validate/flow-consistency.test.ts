import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('FlowConsistencyAnalyzer', () => {
  it('parses flow consistency results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      meanWarpError: 0.08,
      maxWarpError: 0.25,
      frameErrors: [0.05, 0.1, 0.08, 0.12],
      framesAnalyzed: 100,
    });

    const { FlowConsistencyAnalyzer } = await import('../../../src/validate/flow-consistency');
    const analyzer = new FlowConsistencyAnalyzer({ scriptPath: '/tmp/flow_warp_error.py' });
    const summary = await analyzer.analyze('video.mp4');

    expect(summary.meanWarpError).toBe(0.08);
    expect(summary.maxWarpError).toBe(0.25);
    expect(summary.frameErrors).toEqual([0.05, 0.1, 0.08, 0.12]);
    expect(summary.framesAnalyzed).toBe(100);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4'],
      })
    );
  });

  it('rejects invalid flow consistency JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { FlowConsistencyAnalyzer } = await import('../../../src/validate/flow-consistency');
    const analyzer = new FlowConsistencyAnalyzer({ scriptPath: '/tmp/flow_warp_error.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runFlowConsistencyGate', () => {
  it('passes when error is below threshold', async () => {
    const { runFlowConsistencyGate } = await import('../../../src/validate/flow-consistency');
    const result = runFlowConsistencyGate({
      meanWarpError: 0.08,
      maxWarpError: 0.25,
      frameErrors: [0.05, 0.1, 0.08, 0.12],
      framesAnalyzed: 100,
    });

    expect(result.passed).toBe(true);
    expect(result.gateId).toBe('flow-consistency');
    expect(result.severity).toBe('warning');
    expect(result.details.meanWarpError).toBe(0.08);
    expect(result.details.maxWarpError).toBe(0.25);
  });

  it('fails when error is above threshold', async () => {
    const { runFlowConsistencyGate } = await import('../../../src/validate/flow-consistency');
    const result = runFlowConsistencyGate({
      meanWarpError: 0.22,
      maxWarpError: 0.5,
      frameErrors: [0.15, 0.2, 0.25, 0.28],
      framesAnalyzed: 100,
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('mean warp error');
    expect(result.message).toContain('0.2200');
  });

  it('uses default threshold when not provided', async () => {
    const { runFlowConsistencyGate } = await import('../../../src/validate/flow-consistency');
    const result = runFlowConsistencyGate({
      meanWarpError: 0.08,
      maxWarpError: 0.25,
      frameErrors: [0.05, 0.1, 0.08, 0.12],
      framesAnalyzed: 100,
    });

    expect(result.passed).toBe(true);
    expect(result.details.maxMeanWarpError).toBe(0.15);
  });

  it('respects custom threshold', async () => {
    const { runFlowConsistencyGate } = await import('../../../src/validate/flow-consistency');
    const result = runFlowConsistencyGate(
      {
        meanWarpError: 0.08,
        maxWarpError: 0.25,
        frameErrors: [0.05, 0.1, 0.08, 0.12],
        framesAnalyzed: 100,
      },
      {
        maxMeanWarpError: 0.05,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.details.maxMeanWarpError).toBe(0.05);
    expect(result.message).toContain('mean warp error');
  });
});
