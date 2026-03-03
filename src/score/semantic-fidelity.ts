import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';

export interface SemanticFidelityResult {
  clipScore: { mean: number; min: number; p10: number };
  scenesEvaluated: number;
  framesAnalyzed: number;
}

export interface SemanticFidelityAnalyzer {
  analyze(videoPath: string, scriptPath: string): Promise<SemanticFidelityResult>;
}

function parseSemanticJson(data: unknown): SemanticFidelityResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid semantic fidelity JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const clipScore = obj['clipScore'] as Record<string, unknown> | undefined;
  const scenesEvaluated = obj['scenesEvaluated'];
  const framesAnalyzed = obj['framesAnalyzed'];

  if (!clipScore || typeof clipScore !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid semantic fidelity JSON (missing clipScore)');
  }

  const mean = Number(clipScore['mean']);
  const min = Number(clipScore['min']);
  const p10 = Number(clipScore['p10']);
  const scenes = Number(scenesEvaluated);
  const frames = Number(framesAnalyzed);

  if (![mean, min, p10, scenes, frames].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid semantic fidelity JSON (non-numeric fields)');
  }

  return {
    clipScore: { mean, min, p10 },
    scenesEvaluated: scenes,
    framesAnalyzed: frames,
  };
}

/** Measures CLIP-based semantic similarity between video frames and script scene descriptions. */
export class ClipSemanticAnalyzer implements SemanticFidelityAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;
  readonly maxFrames: number;

  constructor(options?: {
    pythonPath?: string;
    scriptPath?: string;
    timeoutMs?: number;
    maxFrames?: number;
  }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath =
      options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'semantic_similarity.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
    this.maxFrames = options?.maxFrames ?? 16;
  }

  async analyze(videoPath: string, contentScriptPath: string): Promise<SemanticFidelityResult> {
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: [
        '--video',
        videoPath,
        '--script',
        contentScriptPath,
        '--max-frames',
        String(this.maxFrames),
      ],
      timeoutMs: this.timeoutMs,
    });
    return parseSemanticJson(data);
  }
}
