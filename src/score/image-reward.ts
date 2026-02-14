import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';

export interface ImageRewardResult {
  meanScore: number;
  minScore: number;
  maxScore: number;
  framesScored: number;
  method: string;
  reason?: string;
}

export interface ImageRewardAnalyzer {
  analyze(videoPath: string, prompt?: string): Promise<ImageRewardResult>;
}

function parseImageRewardJson(data: unknown): ImageRewardResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid image reward JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const meanScore = Number(obj['meanScore']);
  const minScore = Number(obj['minScore']);
  const maxScore = Number(obj['maxScore']);
  const framesScored = Number(obj['framesScored']);
  const method = String(obj['method'] ?? 'unknown');
  const reason = obj['reason'] ? String(obj['reason']) : undefined;

  if (![meanScore, minScore, maxScore, framesScored].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid image reward JSON (non-numeric fields)');
  }

  return { meanScore, minScore, maxScore, framesScored, method, reason };
}

/** Scores sampled video frames using the HuggingFace ImageReward model. */
export class HuggingFaceImageRewardAnalyzer implements ImageRewardAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;
  readonly numFrames: number;

  constructor(options?: {
    pythonPath?: string;
    scriptPath?: string;
    timeoutMs?: number;
    numFrames?: number;
  }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'image_reward.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
    this.numFrames = options?.numFrames ?? 8;
  }

  async analyze(videoPath: string, prompt?: string): Promise<ImageRewardResult> {
    const args = ['--video', videoPath, '--num-frames', String(this.numFrames)];
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

    return parseImageRewardJson(data);
  }
}
