import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface FlowConsistencySummary {
  meanWarpError: number;
  maxWarpError: number;
  frameErrors: number[];
  framesAnalyzed: number;
}

export interface FlowConsistencyAnalyzerInterface {
  analyze(videoPath: string): Promise<FlowConsistencySummary>;
}

export interface FlowConsistencyGateResult {
  gateId: 'flow-consistency';
  passed: boolean;
  severity: 'warning' | 'error' | 'info';
  fix: string;
  message: string;
  details: {
    meanWarpError: number;
    maxWarpError: number;
    framesAnalyzed: number;
    maxMeanWarpError: number;
  };
}

/** Runs the optical-flow consistency gate, failing if mean warp error exceeds the threshold. */
export function runFlowConsistencyGate(
  summary: FlowConsistencySummary,
  options?: { maxMeanWarpError?: number }
): FlowConsistencyGateResult {
  const maxMeanWarpError = options?.maxMeanWarpError ?? 0.15;

  const passed = summary.meanWarpError <= maxMeanWarpError;

  return {
    gateId: 'flow-consistency',
    passed,
    severity: 'warning',
    fix: passed ? 'none' : 'regenerate-video',
    message: passed
      ? `Flow consistency OK (mean error ${summary.meanWarpError.toFixed(4)})`
      : `Flow consistency issue: mean warp error ${summary.meanWarpError.toFixed(4)} > ${maxMeanWarpError}`,
    details: {
      meanWarpError: summary.meanWarpError,
      maxWarpError: summary.maxWarpError,
      framesAnalyzed: summary.framesAnalyzed,
      maxMeanWarpError,
    },
  };
}

function parseFlowJson(data: unknown): FlowConsistencySummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid flow consistency JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;

  const meanWarpError = Number(obj['meanWarpError']);
  const maxWarpError = Number(obj['maxWarpError']);
  const framesAnalyzed = Number(obj['framesAnalyzed']);
  const frameErrors = Array.isArray(obj['frameErrors'])
    ? (obj['frameErrors'] as unknown[]).map(Number)
    : [];

  if (![meanWarpError, maxWarpError, framesAnalyzed].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid flow consistency JSON (non-numeric fields)');
  }

  return { meanWarpError, maxWarpError, frameErrors, framesAnalyzed };
}

/** Computes optical-flow warp error metrics for a video using a Python backend. */
export class FlowConsistencyAnalyzer implements FlowConsistencyAnalyzerInterface {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath =
      options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'flow_warp_error.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
  }

  async analyze(videoPath: string): Promise<FlowConsistencySummary> {
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath],
      timeoutMs: this.timeoutMs,
    });
    return parseFlowJson(data);
  }
}
