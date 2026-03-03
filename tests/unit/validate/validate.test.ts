import { describe, expect, it, vi } from 'vitest';
import type { GateResult } from '../../../src/validate/schema';

vi.mock('../../../src/validate/gates', () => ({
  runResolutionGate: vi.fn(),
  runDurationGate: vi.fn(),
  runFormatGate: vi.fn(),
}));

vi.mock('../../../src/validate/ffprobe', () => ({
  probeVideoWithFfprobe: vi.fn(),
}));

vi.mock('../../../src/validate/python-probe', () => ({
  probeVideoWithPython: vi.fn(),
}));

vi.mock('../../../src/validate/cadence', () => ({
  runCadenceGate: vi.fn(),
}));

vi.mock('../../../src/validate/quality', () => ({
  PiqBrisqueAnalyzer: class {
    analyze = vi.fn().mockResolvedValue({ score: 35, details: [] });
  },
  runVisualQualityGate: vi.fn(),
}));

const okGate: GateResult = {
  gateId: 'gate',
  passed: true,
  severity: 'warn',
  message: 'ok',
};

const failGate: GateResult = {
  gateId: 'fail',
  passed: false,
  severity: 'error',
  message: 'bad',
  fix: 'fix',
};

const baseInfo = {
  path: 'video.mp4',
  width: 1080,
  height: 1920,
  durationSeconds: 10,
  container: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
};

describe('validateVideoInfo', () => {
  it('marks passed when only warnings fail', async () => {
    const gates = await import('../../../src/validate/gates');
    (gates.runResolutionGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);
    (gates.runDurationGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...okGate,
      passed: false,
      severity: 'warn',
    });
    (gates.runFormatGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);

    const { validateVideoInfo } = await import('../../../src/validate/validate');
    const report = validateVideoInfo(baseInfo, { profile: 'portrait' });

    expect(report.passed).toBe(true);
    expect(report.gates).toHaveLength(3);
  });
});

describe('validateVideoPath', () => {
  it('uses python probe, cadence, and quality gates', async () => {
    const gates = await import('../../../src/validate/gates');
    (gates.runResolutionGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);
    (gates.runDurationGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);
    (gates.runFormatGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);

    const { probeVideoWithPython } = await import('../../../src/validate/python-probe');
    (probeVideoWithPython as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseInfo);

    const { runCadenceGate } = await import('../../../src/validate/cadence');
    (runCadenceGate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(failGate);

    const quality = await import('../../../src/validate/quality');
    (quality.runVisualQualityGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);

    const { validateVideoPath } = await import('../../../src/validate/validate');
    const report = await validateVideoPath('video.mp4', {
      profile: 'portrait',
      probe: { engine: 'python', pythonPath: 'python', ffprobePath: 'ffprobe' },
      cadence: { enabled: true, threshold: 0.5, engine: 'pyscenedetect', pythonPath: 'python' },
      quality: { enabled: true, sampleRate: 10 },
    });

    expect(probeVideoWithPython).toHaveBeenCalledWith('video.mp4', {
      pythonPath: 'python',
      ffprobePath: 'ffprobe',
    });
    expect(runCadenceGate).toHaveBeenCalled();
    expect(report.gates.length).toBe(5);
    expect(report.passed).toBe(false);
  });

  it('uses ffprobe when python probe not requested', async () => {
    const gates = await import('../../../src/validate/gates');
    (gates.runResolutionGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);
    (gates.runDurationGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);
    (gates.runFormatGate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(okGate);

    const { probeVideoWithFfprobe } = await import('../../../src/validate/ffprobe');
    (probeVideoWithFfprobe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseInfo);

    const { validateVideoPath } = await import('../../../src/validate/validate');
    const report = await validateVideoPath('video.mp4', { profile: 'portrait' });

    expect(probeVideoWithFfprobe).toHaveBeenCalledWith('video.mp4', { ffprobePath: undefined });
    expect(report.passed).toBe(true);
  });
});
