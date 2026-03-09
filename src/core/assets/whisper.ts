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

/** Resolve the effective Whisper asset directory for the current runtime. */
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

/** Map a Whisper model id to the packaged ggml model filename. */
export function resolveWhisperModelFilename(model: string): string {
  const normalized = model === 'large' ? 'large-v3' : model;
  return `ggml-${normalized}.bin`;
}

/** Resolve the full path to a Whisper model file for the selected model. */
export function resolveWhisperModelPath(model: string, cwd?: string): string {
  return path.join(resolveWhisperDir(cwd), resolveWhisperModelFilename(model));
}

/** Return the supported Whisper executable paths for the current platform. */
export function resolveWhisperExecutableCandidates(dir: string): string[] {
  return [
    path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main'),
    path.join(
      dir,
      'build',
      'bin',
      process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
    ),
  ];
}

/** Return the first runnable Whisper executable path, if present. */
export function resolveWhisperExecutablePath(dir: string): string | null {
  const candidates = resolveWhisperExecutableCandidates(dir);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/** Build the canonical `cm setup whisper ...` fix command for missing runtime assets. */
export function buildWhisperInstallFix(params: {
  model: string;
  dir?: string;
  version?: string;
  cwd?: string;
}): string {
  const dir = params.dir ? path.resolve(params.dir) : resolveWhisperDir(params.cwd);
  const version = params.version ?? '1.5.5';
  return `Run: cm setup whisper --model ${params.model} --dir ${dir} --version ${version}`;
}

export interface WhisperRuntimeStatus {
  dir: string;
  version: string;
  model: string;
  modelPath: string;
  modelPresent: boolean;
  executableCandidates: string[];
  executablePath: string | null;
  binaryPresent: boolean;
  ready: boolean;
  fix: string;
}

/** Inspect the local Whisper runtime and report whether the model and binary are ready. */
export function getWhisperRuntimeStatus(params: {
  model: string;
  dir?: string;
  version?: string;
  cwd?: string;
}): WhisperRuntimeStatus {
  const dir = params.dir ? path.resolve(params.dir) : resolveWhisperDir(params.cwd);
  const model = params.model;
  const version = params.version ?? '1.5.5';
  const modelPath = path.join(dir, resolveWhisperModelFilename(model));
  const executableCandidates = resolveWhisperExecutableCandidates(dir);
  const executablePath = resolveWhisperExecutablePath(dir);

  return {
    dir,
    version,
    model,
    modelPath,
    modelPresent: existsSync(modelPath),
    executableCandidates,
    executablePath,
    binaryPresent: executablePath !== null,
    ready: existsSync(modelPath) && executablePath !== null,
    fix: buildWhisperInstallFix({ model, dir, version, cwd: params.cwd }),
  };
}
