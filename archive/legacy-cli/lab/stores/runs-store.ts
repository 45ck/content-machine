import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { CMError } from '../../core/errors';
import { LabRunSchema, type LabRun, type LabRunFingerprint } from '../../domain';
import { appendJsonl, readJsonl } from './jsonl';
import { DEFAULT_ARTIFACT_FILENAMES } from '../../domain/repo-facts.generated';

/**
 * Read all persisted lab runs from the JSONL store.
 */
export async function readRuns(storePath: string): Promise<LabRun[]> {
  // runId is unique, so we keep append-only history but read all for now.
  return readJsonl({ path: storePath, schema: LabRunSchema });
}

/**
 * Append a run entry to the JSONL store.
 */
export async function appendRun(storePath: string, run: LabRun): Promise<LabRun> {
  return appendJsonl({ path: storePath, value: run, schema: LabRunSchema });
}

/**
 * Generate a stable unique run identifier.
 */
export function generateRunId(): string {
  return `run_${randomUUID()}`;
}

async function statIfExists(path: string): Promise<{ sizeBytes: number; mtimeMs: number } | null> {
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return { sizeBytes: info.size, mtimeMs: info.mtimeMs };
  } catch {
    return null;
  }
}

/**
 * Compute a lightweight artifact fingerprint for de-duplication.
 */
export async function computeRunFingerprint(params: {
  artifactsDir: string;
  videoPath?: string;
}): Promise<LabRunFingerprint | undefined> {
  const artifactsDir = resolve(params.artifactsDir);
  const videoPath = params.videoPath
    ? resolve(params.videoPath)
    : join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.video);
  const scriptPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script);

  const video = await statIfExists(videoPath);
  const script = await statIfExists(scriptPath);

  if (!video && !script) return undefined;

  const fp: LabRunFingerprint = {};
  if (video) fp.video = { path: videoPath, ...video };
  if (script) fp.script = { path: scriptPath, ...script };
  return fp;
}

/**
 * Lookup a run by id.
 */
export function findRunById(runs: LabRun[], runId: string): LabRun | undefined {
  return runs.find((r) => r.runId === runId);
}

function fingerprintsEqual(
  a: LabRunFingerprint | undefined,
  b: LabRunFingerprint | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keys = ['video', 'script'] as const;
  for (const key of keys) {
    const av = a[key];
    const bv = b[key];
    if (!av && !bv) continue;
    if (!av || !bv) return false;
    if (av.sizeBytes !== bv.sizeBytes) return false;
    if (av.mtimeMs !== bv.mtimeMs) return false;
    // path is informative only; do not include it in equality.
  }
  return true;
}

/**
 * Find an imported run by artifacts directory and fingerprint.
 */
export function findImportedRun(params: {
  runs: LabRun[];
  artifactsDirRealpath: string;
  fingerprint: LabRunFingerprint | undefined;
}): { run: LabRun; fingerprintMatches: boolean } | null {
  // Latest-first: if there are multiple for the same directory, prefer the most recent by createdAt.
  const candidates = params.runs
    .filter((r) => r.artifactsDirRealpath === params.artifactsDirRealpath)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  for (const run of candidates) {
    if (fingerprintsEqual(run.fingerprint, params.fingerprint)) {
      return { run, fingerprintMatches: true };
    }
  }

  if (candidates[0]) {
    return { run: candidates[0], fingerprintMatches: false };
  }

  return null;
}

/**
 * Infer artifacts/video paths from a user-provided input.
 */
export function inferArtifactsDirFromInputPath(inputPath: string): {
  artifactsDir: string;
  videoPath?: string;
} {
  const abs = resolve(inputPath);
  // Heuristic: if the input ends with .mp4, treat it as the video file.
  // Otherwise assume the input is a directory (or a file inside the artifacts dir).
  if (abs.toLowerCase().endsWith('.mp4')) {
    return { artifactsDir: dirname(abs), videoPath: abs };
  }
  return { artifactsDir: abs };
}

/**
 * Assert that a run exists, otherwise throw a not-found error.
 */
export function assertRunExists(run: LabRun | undefined, runId: string): LabRun {
  if (run) return run;
  throw new CMError('NOT_FOUND', `Run not found: ${runId}`, { runId });
}
