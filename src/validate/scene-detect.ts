import { resolve } from 'node:path';
import { CMError } from '../core/errors';
import { runPythonJson } from './python-json';

export interface SceneDetectResult {
  cutTimesSeconds: number[];
  detector: 'pyscenedetect';
}

export function parseSceneDetectJson(data: unknown): SceneDetectResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid scene detect JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const cutTimes = obj['cutTimesSeconds'];
  const detector = obj['detector'];

  if (!Array.isArray(cutTimes)) {
    throw new CMError('VALIDATION_ERROR', 'Invalid scene detect JSON (missing cutTimesSeconds)');
  }
  const parsedTimes = cutTimes.map((t) => Number(t)).filter((t) => Number.isFinite(t) && t >= 0);

  if (typeof detector !== 'string' || detector !== 'pyscenedetect') {
    throw new CMError('VALIDATION_ERROR', 'Invalid scene detect JSON (invalid detector)', {
      detector,
    });
  }

  return { cutTimesSeconds: parsedTimes, detector: 'pyscenedetect' };
}

export async function detectSceneCutsWithPySceneDetect(params: {
  videoPath: string;
  pythonPath?: string;
  scriptPath?: string;
  threshold?: number;
  timeoutMs?: number;
}): Promise<number[]> {
  const threshold = params.threshold ?? 30;
  const scriptPath = params.scriptPath ?? resolve(process.cwd(), 'scripts', 'scene_detect.py');

  const data = await runPythonJson({
    errorCode: 'VALIDATION_ERROR',
    pythonPath: params.pythonPath,
    scriptPath,
    args: ['--video', params.videoPath, '--threshold', String(threshold)],
    timeoutMs: params.timeoutMs ?? 30_000,
  });

  return parseSceneDetectJson(data).cutTimesSeconds;
}

