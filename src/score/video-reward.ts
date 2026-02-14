import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';

export interface VideoRewardResult {
  score: number;
  method: string;
  reason?: string;
}

export interface VideoRewardAnalyzer {
  analyze(videoPath: string, prompt?: string): Promise<VideoRewardResult>;
}

function parseVideoRewardJson(data: unknown): VideoRewardResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid video reward JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const score = Number(obj['score']);
  const method = String(obj['method'] ?? 'unknown');
  const reason = obj['reason'] ? String(obj['reason']) : undefined;

  if (!Number.isFinite(score)) {
    throw new CMError('VALIDATION_ERROR', 'Invalid video reward JSON (non-numeric score)');
  }

  return { score, method, reason };
}

/** Scores video quality using the HuggingFace VideoReward model. */
export class HuggingFaceVideoRewardAnalyzer implements VideoRewardAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'video_reward.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
  }

  async analyze(videoPath: string, prompt?: string): Promise<VideoRewardResult> {
    const args = ['--video', videoPath];
    if (prompt) {
      args.push('--prompt', prompt);
    }

    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args,
      timeoutMs: this.timeoutMs,
    });

    return parseVideoRewardJson(data);
  }
}
