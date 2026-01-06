import type { VideoQualityAnalyzer, VideoQualitySummary } from './types';
import { CMError } from '../../core/errors';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

function runPythonJson(params: {
  pythonPath?: string;
  scriptPath: string;
  args: readonly string[];
  timeoutMs?: number;
}): Promise<unknown> {
  const pythonPath = params.pythonPath ?? 'python';
  const timeoutMs = params.timeoutMs ?? 120_000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(pythonPath, [params.scriptPath, ...params.args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(
        new CMError('VALIDATION_ERROR', `Python timed out after ${timeoutMs}ms`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new CMError('VALIDATION_ERROR', `Failed to start python: ${String(error)}`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout) as unknown;
        if (code === 0) {
          resolvePromise(parsed);
          return;
        }
        reject(
          new CMError(
            'VALIDATION_ERROR',
            `Python script failed with code ${code ?? 'unknown'}`,
            {
              pythonPath,
              scriptPath: params.scriptPath,
              code,
              stderr: stderr.trim() || undefined,
              stdout: stdout.trim() || undefined,
            }
          )
        );
      } catch (error) {
        reject(
          new CMError('VALIDATION_ERROR', 'Python script did not return valid JSON', {
            pythonPath,
            scriptPath: params.scriptPath,
            code,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          })
        );
      }
    });
  });
}

function parseQualityJson(data: unknown): VideoQualitySummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const brisque = obj['brisque'] as Record<string, unknown> | undefined;
  const framesAnalyzed = obj['framesAnalyzed'];

  if (!brisque || typeof brisque !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (missing brisque)');
  }

  const mean = Number(brisque['mean']);
  const min = Number(brisque['min']);
  const max = Number(brisque['max']);
  const frames = Number(framesAnalyzed);

  if (![mean, min, max, frames].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (non-numeric fields)', {
      mean,
      min,
      max,
      frames,
    });
  }

  return {
    brisque: { mean, min, max },
    framesAnalyzed: frames,
  };
}

export class PiqBrisqueAnalyzer implements VideoQualityAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'video_quality.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  async analyze(videoPath: string, options?: { sampleRate?: number }): Promise<VideoQualitySummary> {
    const sampleRate = options?.sampleRate ?? 30;
    const data = await runPythonJson({
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath, '--sample-rate', String(sampleRate)],
      timeoutMs: this.timeoutMs,
    });
    return parseQualityJson(data);
  }
}

