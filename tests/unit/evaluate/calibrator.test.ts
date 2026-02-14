import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileSyncMock = vi.fn();

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: readFileSyncMock,
  };
});

describe('applyCalibrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFileSyncMock.mockImplementation(() => {
      throw new Error('File not found');
    });
  });
  it('applies hand-tuned weights when no calibrator file exists', async () => {
    const { applyCalibrator } = await import('../../../src/evaluate/calibrator');

    const checks = [
      {
        checkId: 'validate' as const,
        passed: true,
        skipped: false,
        summary: 'OK',
        durationMs: 100,
      },
      {
        checkId: 'rate' as const,
        passed: true,
        skipped: false,
        summary: 'OK',
        durationMs: 200,
      },
      {
        checkId: 'captionQuality' as const,
        passed: false,
        skipped: false,
        summary: 'Failed',
        durationMs: 150,
      },
    ];

    const result = applyCalibrator(checks, '/nonexistent/calibrator.json');

    expect(result).toBeDefined();
    expect(result!.method).toBe('hand-tuned');
    expect(result!.score).toBeGreaterThan(0);
    expect(result!.score).toBeLessThanOrEqual(1);
  });

  it('applies calibrator weights when file exists', async () => {
    const mockCalibrator = {
      weights: [0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.05],
      intercept: 0.0,
      accuracy: 0.85,
      trainingSize: 100,
    };

    readFileSyncMock.mockReturnValue(JSON.stringify(mockCalibrator));

    const { applyCalibrator } = await import('../../../src/evaluate/calibrator');

    const checks = [
      {
        checkId: 'validate' as const,
        passed: true,
        skipped: false,
        summary: 'OK',
        durationMs: 100,
      },
      {
        checkId: 'rate' as const,
        passed: true,
        skipped: false,
        summary: 'OK',
        durationMs: 200,
      },
    ];

    const result = applyCalibrator(checks, '/tmp/calibrator.json');

    expect(result).toBeDefined();
    expect(result!.method).toBe('calibrated');
    expect(result!.calibratorAccuracy).toBe(0.85);
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(1);
  });

  it('handles skipped checks with neutral score', async () => {
    const { applyCalibrator } = await import('../../../src/evaluate/calibrator');

    const checks = [
      {
        checkId: 'validate' as const,
        passed: true,
        skipped: false,
        summary: 'OK',
        durationMs: 100,
      },
      {
        checkId: 'rate' as const,
        passed: false,
        skipped: true,
        summary: 'Skipped',
        durationMs: 0,
      },
    ];

    const result = applyCalibrator(checks, '/nonexistent/calibrator.json');

    expect(result).toBeDefined();
    expect(result!.score).toBeGreaterThan(0);
    expect(result!.score).toBeLessThanOrEqual(1);
  });
});
