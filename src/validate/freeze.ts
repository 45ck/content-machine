import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface FreezeSummary {
  freezeEvents: number;
  blackFrames: number;
  freezeRatio: number;
  blackRatio: number;
  totalFrames: number;
}

export interface FreezeAnalyzerInterface {
  analyze(videoPath: string): Promise<FreezeSummary>;
}

export interface FreezeGateResult {
  gateId: 'freeze';
  passed: boolean;
  severity: 'warning' | 'error' | 'info';
  fix: string;
  message: string;
  details: {
    freezeRatio: number;
    blackRatio: number;
    freezeEvents: number;
    blackFrames: number;
    totalFrames: number;
    maxFreezeRatio: number;
    maxBlackRatio: number;
  };
}

/** Runs the freeze/black-frame detection gate, failing if ratios exceed thresholds. */
export function runFreezeGate(
  summary: FreezeSummary,
  options?: { maxFreezeRatio?: number; maxBlackRatio?: number }
): FreezeGateResult {
  const maxFreezeRatio = options?.maxFreezeRatio ?? 0.15;
  const maxBlackRatio = options?.maxBlackRatio ?? 0.05;

  const issues: string[] = [];
  if (summary.freezeRatio > maxFreezeRatio) {
    issues.push(
      `freeze ratio ${(summary.freezeRatio * 100).toFixed(1)}% > ${(maxFreezeRatio * 100).toFixed(1)}%`
    );
  }
  if (summary.blackRatio > maxBlackRatio) {
    issues.push(
      `black ratio ${(summary.blackRatio * 100).toFixed(1)}% > ${(maxBlackRatio * 100).toFixed(1)}%`
    );
  }

  const passed = issues.length === 0;

  return {
    gateId: 'freeze',
    passed,
    severity: 'warning',
    fix: passed ? 'none' : 'regenerate-video',
    message: passed
      ? `Freeze detection OK (freeze ${(summary.freezeRatio * 100).toFixed(1)}%, black ${(summary.blackRatio * 100).toFixed(1)}%)`
      : `Freeze issues: ${issues.join('; ')}`,
    details: {
      freezeRatio: summary.freezeRatio,
      blackRatio: summary.blackRatio,
      freezeEvents: summary.freezeEvents,
      blackFrames: summary.blackFrames,
      totalFrames: summary.totalFrames,
      maxFreezeRatio,
      maxBlackRatio,
    },
  };
}

function parseFreezeJson(data: unknown): FreezeSummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid freeze detection JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;

  const freezeEvents = Number(obj['freezeEvents']);
  const blackFrames = Number(obj['blackFrames']);
  const freezeRatio = Number(obj['freezeRatio']);
  const blackRatio = Number(obj['blackRatio']);
  const totalFrames = Number(obj['totalFrames']);

  if (
    ![freezeEvents, blackFrames, freezeRatio, blackRatio, totalFrames].every((n) =>
      Number.isFinite(n)
    )
  ) {
    throw new CMError('VALIDATION_ERROR', 'Invalid freeze detection JSON (non-numeric fields)');
  }

  return { freezeEvents, blackFrames, freezeRatio, blackRatio, totalFrames };
}

/** Detects frozen and black frames in a video using a Python backend. */
export class FreezeAnalyzer implements FreezeAnalyzerInterface {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'freeze_detect.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  async analyze(videoPath: string): Promise<FreezeSummary> {
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath],
      timeoutMs: this.timeoutMs,
    });
    return parseFreezeJson(data);
  }
}
