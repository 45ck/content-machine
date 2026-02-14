import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';

export interface DnsmosResult {
  ovrlMos: number;
  sigMos: number;
  bakMos: number;
}

export interface DnsmosAnalyzerInterface {
  analyze(videoPath: string): Promise<DnsmosResult>;
}

function parseDnsmosJson(data: unknown): DnsmosResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid DNSMOS JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;

  const ovrlMos = Number(obj['ovrl_mos']);
  const sigMos = Number(obj['sig_mos']);
  const bakMos = Number(obj['bak_mos']);

  if (![ovrlMos, sigMos, bakMos].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid DNSMOS JSON (non-numeric fields)');
  }

  return { ovrlMos, sigMos, bakMos };
}

/** Analyzes DNSMOS speech quality scores for a video's audio track via a Python backend. */
export class DnsmosAnalyzer implements DnsmosAnalyzerInterface {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'dnsmos_score.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  async analyze(videoPath: string): Promise<DnsmosResult> {
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath],
      timeoutMs: this.timeoutMs,
    });
    return parseDnsmosJson(data);
  }
}
