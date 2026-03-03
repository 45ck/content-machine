import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('ClipSafetyAnalyzer', () => {
  it('parses safety check results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      visualSafety: { passed: true, flags: [], method: 'clip-zero-shot' },
      textSafety: { passed: true, flags: [] },
    });

    const { ClipSafetyAnalyzer } = await import('../../../src/validate/safety');
    const analyzer = new ClipSafetyAnalyzer({ scriptPath: '/tmp/safety.py' });
    const result = await analyzer.analyze('video.mp4', 'script.json');

    expect(result.visualSafety.passed).toBe(true);
    expect(result.textSafety.passed).toBe(true);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--script', 'script.json'],
      })
    );
  });

  it('rejects invalid safety JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { ClipSafetyAnalyzer } = await import('../../../src/validate/safety');
    const analyzer = new ClipSafetyAnalyzer({ scriptPath: '/tmp/safety.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runSafetyGate', () => {
  it('passes when both visual and text are safe', async () => {
    const { runSafetyGate } = await import('../../../src/validate/safety');
    const result = runSafetyGate({
      visualSafety: { passed: true, flags: [], method: 'clip-zero-shot' },
      textSafety: { passed: true, flags: [] },
    });

    expect(result.passed).toBe(true);
    expect(result.gateId).toBe('safety');
    expect(result.severity).toBe('error');
  });

  it('fails when visual safety fails', async () => {
    const { runSafetyGate } = await import('../../../src/validate/safety');
    const result = runSafetyGate({
      visualSafety: {
        passed: false,
        flags: ['frame_0:violent content:0.45'],
        method: 'clip-zero-shot',
      },
      textSafety: { passed: true, flags: [] },
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('visual:');
  });

  it('fails when text safety fails', async () => {
    const { runSafetyGate } = await import('../../../src/validate/safety');
    const result = runSafetyGate({
      visualSafety: { passed: true, flags: [] },
      textSafety: { passed: false, flags: ['kill'] },
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('text:');
  });
});
