import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function expandTilde(inputPath: string): string {
  if (!inputPath.startsWith('~')) return inputPath;
  const home = os.homedir();
  if (inputPath === '~') return home;
  if (inputPath.startsWith('~/')) return path.join(home, inputPath.slice(2));
  return inputPath;
}

export function resolveWhisperDir(cwd: string = process.cwd()): string {
  const env = process.env.CM_WHISPER_DIR;
  if (env && env.trim()) {
    return path.resolve(expandTilde(env.trim()));
  }

  const globalDir = path.resolve(os.homedir(), '.cm', 'assets', 'whisper');
  const legacyDir = path.resolve(cwd, '.cache', 'whisper');

  if (existsSync(globalDir)) return globalDir;
  if (existsSync(legacyDir)) return legacyDir;
  return globalDir;
}

export function resolveWhisperModelFilename(model: string): string {
  const normalized = model === 'large' ? 'large-v3' : model;
  return `ggml-${normalized}.bin`;
}

export function resolveWhisperModelPath(model: string, cwd?: string): string {
  return path.join(resolveWhisperDir(cwd), resolveWhisperModelFilename(model));
}
