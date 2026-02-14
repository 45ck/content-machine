import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';

export interface InternVideoResult {
  similarity: number;
  method: string;
  reason?: string;
}

export interface InternVideoAnalyzer {
  analyze(videoPath: string, text?: string): Promise<InternVideoResult>;
}

function parseInternVideoJson(data: unknown): InternVideoResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid InternVideo JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const similarity = Number(obj['similarity']);
  const method = String(obj['method'] ?? 'unknown');
  const reason = obj['reason'] ? String(obj['reason']) : undefined;

  if (!Number.isFinite(similarity)) {
    throw new CMError('VALIDATION_ERROR', 'Invalid InternVideo JSON (non-numeric similarity)');
  }

  return { similarity, method, reason };
}

/** Computes video-text similarity using the HuggingFace InternVideo model. */
export class HuggingFaceInternVideoAnalyzer implements InternVideoAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'intern_video.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
  }

  async analyze(videoPath: string, text?: string): Promise<InternVideoResult> {
    const args = ['--video', videoPath];
    if (text) {
      args.push('--text', text);
    }

    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args,
      timeoutMs: this.timeoutMs,
    });

    return parseInternVideoJson(data);
  }
}
