import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { CMError } from '../../core/errors';
import type { LabSession } from '../session/session';
import type { AllowedRoot } from '../security/path';
import { assertImportPathAllowed } from '../security/path';
import { discoverArtifacts } from '../metrics/discover';
import { extractAutoMetricsSummary } from '../metrics/extract';
import type { LabRun } from '../../domain';
import { LabRunSchema } from '../../domain';
import {
  appendRun,
  computeRunFingerprint,
  findImportedRun,
  generateRunId,
  readRuns,
} from '../stores/runs-store';
import { labRunsStorePath } from '../paths';

function nowIso(): string {
  return new Date().toISOString();
}

function pickTopicFromScript(raw: unknown): string | undefined {
  const obj = raw as any;
  const meta = (obj?.meta ?? obj?.metadata) as any;
  const topic = typeof meta?.topic === 'string' ? meta.topic : undefined;
  if (topic && topic.trim()) return topic.trim();
  const title = typeof obj?.title === 'string' ? obj.title : undefined;
  return title && title.trim() ? title.trim() : undefined;
}

async function inferTopicFromArtifacts(scriptPath: string | null): Promise<string | undefined> {
  if (!scriptPath) return undefined;
  try {
    const raw = JSON.parse(await readFile(scriptPath, 'utf-8')) as unknown;
    return pickTopicFromScript(raw);
  } catch {
    return undefined;
  }
}

export async function importLabRunFromPath(params: {
  session: LabSession;
  allowedRoots: AllowedRoot[];
  inputPath: string;
}): Promise<{ run: LabRun; created: boolean }> {
  const absInput = resolve(params.inputPath);
  const info = await stat(absInput).catch(() => null);
  if (!info) {
    throw new CMError('FILE_NOT_FOUND', `Path not found: ${absInput}`, {
      fix: 'Paste an absolute path to an artifacts directory or a rendered .mp4 file.',
      path: absInput,
    });
  }

  const artifactsDir = info.isDirectory() ? absInput : dirname(absInput);
  const videoPath = info.isFile() && absInput.toLowerCase().endsWith('.mp4') ? absInput : undefined;

  const artifactsInfo = await stat(artifactsDir);
  if (!artifactsInfo.isDirectory()) {
    throw new CMError('INVALID_ARGUMENT', `Not a directory: ${artifactsDir}`, {
      fix: 'Import an artifacts directory or a video file path inside an artifacts directory.',
    });
  }

  const allowed = await assertImportPathAllowed({
    inputPath: artifactsDir,
    allowedRoots: params.allowedRoots,
  });

  const artifactsDirRealpath = allowed.realPath;
  const discovered = await discoverArtifacts(artifactsDir);
  const effectiveVideoPath = videoPath ?? discovered.videoPath ?? undefined;

  const hasAnyRecognizedArtifact = Boolean(
    effectiveVideoPath ||
    discovered.scriptPath ||
    discovered.timestampsPath ||
    discovered.visualsPath ||
    discovered.scorePath ||
    discovered.syncReportPath ||
    discovered.captionReportPath
  );
  if (!hasAnyRecognizedArtifact) {
    throw new CMError('INVALID_ARGUMENT', 'No recognizable artifacts found in directory', {
      artifactsDir,
      fix: 'Import an artifacts directory containing at least video.mp4 or script.json (or import a .mp4 path).',
    });
  }

  const fingerprint = await computeRunFingerprint({
    artifactsDir,
    videoPath: effectiveVideoPath,
  });

  const storePath = labRunsStorePath();
  const existingRuns = await readRuns(storePath);
  const existing = findImportedRun({
    runs: existingRuns,
    artifactsDirRealpath,
    fingerprint,
  });
  if (existing?.fingerprintMatches) {
    return { run: existing.run, created: false };
  }

  const autoMetricsSummary = await extractAutoMetricsSummary({
    syncReportPath: discovered.syncReportPath,
    captionReportPath: discovered.captionReportPath,
    scorePath: discovered.scorePath,
  });

  const topic = await inferTopicFromArtifacts(discovered.scriptPath);

  const run: LabRun = LabRunSchema.parse({
    schemaVersion: 1,
    runId: generateRunId(),
    sessionId: params.session.sessionId,
    createdAt: nowIso(),
    topic,
    artifactsDir,
    artifactsDirRealpath,
    fingerprint,
    supersedesRunId: existing && !existing.fingerprintMatches ? existing.run.runId : undefined,
    videoPath: effectiveVideoPath,
    reports: {
      syncReportPath: discovered.syncReportPath ?? undefined,
      captionReportPath: discovered.captionReportPath ?? undefined,
      scorePath: discovered.scorePath ?? undefined,
    },
    autoMetricsSummary,
  });

  await appendRun(storePath, run);
  return { run, created: true };
}

export async function getLabRunById(runId: string): Promise<LabRun> {
  const runs = await readRuns(labRunsStorePath());
  const run = runs.find((r) => r.runId === runId);
  if (!run) throw new CMError('NOT_FOUND', `Run not found: ${runId}`, { runId });
  return run;
}
