import { createServer } from 'node:http';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CMError } from '../../core/errors';
import { version } from '../../cli/meta';
import {
  defaultFeedbackStorePath,
  appendFeedbackEntry,
  readFeedbackEntries,
} from '../../feedback/store';
import type {
  FeedbackEntry,
  FeedbackRatings,
  LabAutoMetricsSummary,
  LabExperiment,
  LabExport,
  LabIdempotencyRecord,
  LabRun,
} from '../../domain';
import {
  FeedbackEntrySchema,
  LabExperimentSchema,
  LabExportSchema,
  LabIdempotencyRecordSchema,
} from '../../domain';
import {
  labExperimentsStorePath,
  labExportsDir,
  labRunsStorePath,
  labSessionIdempotencyStorePath,
} from '../paths';
import type { LabSession } from '../session/session';
import type { LabTask } from '../session/task';
import type { AllowedRoot } from '../security/path';
import { safeResolveUnderRoot } from '../security/path';
import { assertAllowedArtifactName } from '../security/artifact-allowlist';
import { discoverArtifacts } from '../metrics/discover';
import { extractAutoMetricsSummary } from '../metrics/extract';
import {
  appendExperiment,
  generateExperimentId,
  generateVariantId,
  readExperiments,
} from '../stores/experiments-store';
import { readRuns } from '../stores/runs-store';
import { appendIdempotencyRecord, findIdempotencyRecord } from '../stores/idempotency-store';
import { getLabRunById, importLabRunFromPath } from '../services/runs';
import { readFeedbackSinceCursor } from '../feedback/cursor';
import { handleRouteError, readJsonBody, requireToken, sendJson, getRequestId } from './http';
import { parseByteRange } from './range';
import { tryServeLabStatic } from './static';

export interface LabServerOptions {
  host: string;
  port: number;
  session: LabSession;
  allowedRoots: AllowedRoot[];
  task: LabTask | null;
  exitAfterSubmit: number;
}

export interface StartedLabServer {
  url: string;
  server: HttpServer;
  waitForClose: Promise<void>;
  close: () => Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildOptionalReportsFromDiscovered(
  discovered: Awaited<ReturnType<typeof discoverArtifacts>>
): FeedbackEntry['reports'] {
  const syncReportPath = discovered.syncReportPath ?? undefined;
  const captionReportPath = discovered.captionReportPath ?? undefined;
  const scorePath = discovered.scorePath ?? undefined;
  if (!syncReportPath && !captionReportPath && !scorePath) return undefined;
  return { syncReportPath, captionReportPath, scorePath };
}

function buildAutoMetricsSnapshotFromSummary(
  summary: LabAutoMetricsSummary | undefined
): FeedbackEntry['autoMetricsSnapshot'] {
  if (!summary) return undefined;
  return {
    syncRating: summary.syncRating,
    captionOverall: summary.captionOverall,
    proxyScoreOverall: summary.proxyScoreOverall,
    meanDriftMs: summary.meanDriftMs,
    maxDriftMs: summary.maxDriftMs,
    captionCoverageRatio: summary.captionCoverageRatio,
    ocrConfidenceMean: summary.ocrConfidenceMean,
  };
}

async function deriveRunSnapshotForFeedback(run: LabRun): Promise<{
  videoPath: string | undefined;
  reports: FeedbackEntry['reports'];
  autoMetricsSnapshot: FeedbackEntry['autoMetricsSnapshot'];
}> {
  const discovered = await discoverArtifacts(run.artifactsDir);
  const autoMetricsSummary = await extractAutoMetricsSummary({
    syncReportPath: discovered.syncReportPath,
    captionReportPath: discovered.captionReportPath,
    scorePath: discovered.scorePath,
  });
  return {
    videoPath: discovered.videoPath ?? run.videoPath ?? undefined,
    reports: buildOptionalReportsFromDiscovered(discovered),
    autoMetricsSnapshot: buildAutoMetricsSnapshotFromSummary(autoMetricsSummary),
  };
}

function isPathInside(childPath: string, parentPath: string): boolean {
  const rel = relative(resolve(parentPath), resolve(childPath));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..');
}

function assertExportPathAllowed(exportPath: string): string {
  const root = labExportsDir();
  const abs = resolve(exportPath);
  const rootAbs = resolve(root);
  if (!isPathInside(abs, rootAbs)) {
    throw new CMError('FORBIDDEN', 'Export path must be under the Lab exports directory', {
      fix: `Choose a path under ${rootAbs}`,
      exportRoot: rootAbs,
    });
  }
  return abs;
}

async function listenWithPortFallback(
  server: HttpServer,
  host: string,
  port: number
): Promise<number> {
  const maxTries = port === 0 ? 1 : 20;
  let current = port;
  for (let i = 0; i < maxTries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(current, host, () => {
          server.off('error', reject);
          resolve();
        });
      });
      const address = server.address();
      if (!address || typeof address === 'string') return current;
      return address.port;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE' && port !== 0) {
        current += 1;
        continue;
      }
      throw error;
    }
  }
  throw new CMError('INTERNAL', 'Failed to bind Lab server port', { host, port });
}

async function getExperimentById(experimentId: string): Promise<LabExperiment> {
  const experiments = await readExperiments(labExperimentsStorePath());
  const exp = experiments.find((e) => e.experimentId === experimentId);
  if (!exp)
    throw new CMError('NOT_FOUND', `Experiment not found: ${experimentId}`, { experimentId });
  return exp;
}

async function appendFeedback(params: {
  session: LabSession;
  requestId: string | null;
  idempotencyStorePath: string;
  entry: FeedbackEntry;
}): Promise<{ feedbackId: string; deduped: boolean }> {
  if (params.requestId) {
    const existing = await findIdempotencyRecord({
      storePath: params.idempotencyStorePath,
      requestId: params.requestId,
      type: 'feedback',
    });
    if (existing) {
      const existingId = String(existing.response.feedbackId ?? '');
      if (existingId) return { feedbackId: existingId, deduped: true };
    }
  }

  const parsed = FeedbackEntrySchema.parse(params.entry);
  const storePath = defaultFeedbackStorePath();
  await appendFeedbackEntry(storePath, parsed);

  const response = { feedbackId: parsed.id };
  if (params.requestId) {
    const record: LabIdempotencyRecord = LabIdempotencyRecordSchema.parse({
      requestId: params.requestId,
      type: 'feedback',
      response,
      createdAt: nowIso(),
    });
    await appendIdempotencyRecord(params.idempotencyStorePath, record);
  }

  return { feedbackId: parsed.id, deduped: false };
}

function parseOptionalLimit(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 500);
}

function validateRatings(input: unknown): FeedbackRatings | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const ratings = input as Record<string, unknown>;
  const out: FeedbackRatings = {};
  const keys: Array<keyof FeedbackRatings> = [
    'overall',
    'hook',
    'pacing',
    'script',
    'visuals',
    'motion',
    'captions',
    'sync',
  ];
  for (const key of keys) {
    const value = ratings[key as string];
    if (value === undefined || value === null || value === '') continue;
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const rounded = Math.round(n);
    if (rounded < 0 || rounded > 100) continue;
    out[key] = rounded;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

type LabSubmissionHooks = {
  onReviewSubmitted: (runId: string) => void;
  onCompareSubmitted: (experimentId: string) => void;
};

async function handleConfigRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
}): Promise<boolean> {
  if (params.req.method !== 'GET' || params.url.pathname !== '/api/config') return false;
  sendJson(params.res, 200, {
    sessionId: params.options.session.sessionId,
    token: params.options.session.token,
    version,
    runnerEnabled: false,
    runnerAllowNetwork: false,
    runnerAllowWorkflowExec: false,
    allowedRoots: params.options.allowedRoots.map((r) => r.path),
    ui: { blindMetricsDefault: true, revealMetricsEnabled: true },
    task: params.options.task,
    exitAfterSubmit: params.options.exitAfterSubmit,
  });
  return true;
}

async function handleRunsImportRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
}): Promise<boolean> {
  const { req, res, url, options } = params;
  if (req.method !== 'POST' || url.pathname !== '/api/runs/import') return false;

  requireToken(req, options.session.token);
  const body = await readJsonBody<{ path?: string }>(req);
  const path = String(body.path ?? '').trim();
  if (!path) {
    throw new CMError('INVALID_ARGUMENT', 'Missing path', {
      fix: 'Send { "path": "/abs/path/to/artifacts-or-video" }',
    });
  }
  const { run } = await importLabRunFromPath({
    session: options.session,
    allowedRoots: options.allowedRoots,
    inputPath: path,
  });
  sendJson(res, 200, { runId: run.runId });
  return true;
}

async function handleRunsListRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  if (req.method !== 'GET' || url.pathname !== '/api/runs') return false;

  const runs = await readRuns(labRunsStorePath());
  const items = runs
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((r) => ({
      runId: r.runId,
      sessionId: r.sessionId,
      createdAt: r.createdAt,
      topic: r.topic ?? null,
      artifactsDir: r.artifactsDir,
      videoPath: r.videoPath ?? null,
      autoMetricsSummary: r.autoMetricsSummary ?? {
        syncRating: null,
        captionOverall: null,
        proxyScoreOverall: null,
      },
    }));
  sendJson(res, 200, { items, nextCursor: null });
  return true;
}

async function handleRunDetailRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (req.method !== 'GET' || !match) return false;

  const runId = decodeURIComponent(match[1]);
  const run = await getLabRunById(runId);
  const discovered = await discoverArtifacts(run.artifactsDir);
  const autoMetricsSummary = await extractAutoMetricsSummary({
    syncReportPath: discovered.syncReportPath,
    captionReportPath: discovered.captionReportPath,
    scorePath: discovered.scorePath,
  });
  sendJson(res, 200, {
    runId: run.runId,
    sessionId: run.sessionId,
    createdAt: run.createdAt,
    topic: run.topic ?? null,
    artifactsDir: run.artifactsDir,
    videoPath: discovered.videoPath ?? run.videoPath ?? null,
    artifacts: {
      script: Boolean(discovered.scriptPath),
      timestamps: Boolean(discovered.timestampsPath),
      visuals: Boolean(discovered.visualsPath),
      score: Boolean(discovered.scorePath),
      reports: {
        sync: Boolean(discovered.syncReportPath),
        caption: Boolean(discovered.captionReportPath),
      },
    },
    autoMetricsSummary,
  });
  return true;
}

async function handleRunVideoRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/video$/);
  if (!match) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const runId = decodeURIComponent(match[1]);
  const run = await getLabRunById(runId);
  const discovered = await discoverArtifacts(run.artifactsDir);
  const videoPath = run.videoPath ?? discovered.videoPath;
  if (!videoPath) {
    throw new CMError('NOT_FOUND', 'Video not found for run', {
      runId,
      fix: 'Render a video or import a .mp4 file path.',
    });
  }
  await safeResolveUnderRoot({ rootRealpath: run.artifactsDirRealpath, candidatePath: videoPath });

  const info = await stat(videoPath);
  const size = info.size;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Cache-Control', 'no-store');

  const rangeHeader = req.headers.range;
  if (rangeHeader && typeof rangeHeader === 'string') {
    try {
      const range = parseByteRange({ rangeHeader, sizeBytes: size });
      if (range) {
        const start = range.start;
        const end = range.end;
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        res.setHeader('Content-Length', String(end - start + 1));
        if (req.method === 'HEAD') {
          res.end();
          return true;
        }
        createReadStream(videoPath, { start, end }).pipe(res);
        return true;
      }
    } catch {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${size}`);
      res.end();
      return true;
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', String(size));
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(videoPath).pipe(res);
  return true;
}

async function handleRunArtifactRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/artifact\/([^/]+)$/);
  if (req.method !== 'GET' || !match) return false;

  const runId = decodeURIComponent(match[1]);
  const name = decodeURIComponent(match[2]);
  assertAllowedArtifactName(name);

  const run = await getLabRunById(runId);
  const abs = join(run.artifactsDir, name);
  const info = await stat(abs).catch(() => null);
  if (!info || !info.isFile()) {
    throw new CMError('NOT_FOUND', `Artifact not found: ${name}`, { runId, name });
  }

  const real = await safeResolveUnderRoot({
    rootRealpath: run.artifactsDirRealpath,
    candidatePath: abs,
  });
  const raw = await readFile(real, 'utf-8');
  const json = JSON.parse(raw) as unknown;
  sendJson(res, 200, json);
  return true;
}

async function handleRunsRoutes(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
}): Promise<boolean> {
  if (await handleRunsImportRoute(params)) return true;
  if (await handleRunsListRoute(params)) return true;
  if (await handleRunDetailRoute(params)) return true;
  if (await handleRunVideoRoute(params)) return true;
  if (await handleRunArtifactRoute(params)) return true;
  return false;
}

function parseWinnerVariantId(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function parseOptionalNotes(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function parseOptionalTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tags = raw.filter((t: unknown) => typeof t === 'string' && t.trim());
  return tags.length > 0 ? (tags as string[]) : undefined;
}

type NormalizedExperimentPerRun = {
  runId: string;
  variantId: string;
  ratings: unknown;
  notes: unknown;
  tags: unknown;
};

function assertExperimentNotSubmitted(exp: LabExperiment): void {
  if (exp.status !== 'done') return;
  throw new CMError('INVALID_ARGUMENT', 'Experiment already submitted', {
    experimentId: exp.experimentId,
    fix: 'Create a new experiment (new experimentId) for another rating pass.',
  });
}

function normalizeExperimentPerRunEntry(params: {
  exp: LabExperiment;
  pr: any;
  variantByRunId: Map<string, { variantId: string; label: string; runId: string }>;
  allowedRunIds: Set<string>;
  seenRunIds: Set<string>;
}): NormalizedExperimentPerRun | null {
  const runId = String(params.pr?.runId ?? '').trim();
  if (!runId) return null;

  if (!params.allowedRunIds.has(runId)) {
    throw new CMError('INVALID_ARGUMENT', `RunId is not part of this experiment: ${runId}`, {
      experimentId: params.exp.experimentId,
      runId,
      fix: 'Only submit perRun ratings for the baseline and variant runIds in the experiment.',
    });
  }
  if (params.seenRunIds.has(runId)) {
    throw new CMError('INVALID_ARGUMENT', `Duplicate perRun entry for runId: ${runId}`, {
      experimentId: params.exp.experimentId,
      runId,
      fix: 'Provide at most one perRun entry per runId.',
    });
  }
  params.seenRunIds.add(runId);

  const expectedVariant = params.variantByRunId.get(runId);
  const providedVariantId =
    typeof params.pr?.variantId === 'string' && params.pr.variantId.trim()
      ? params.pr.variantId.trim()
      : undefined;
  if (expectedVariant) {
    if (providedVariantId && providedVariantId !== expectedVariant.variantId) {
      throw new CMError('INVALID_ARGUMENT', 'VariantId does not match experiment variant', {
        experimentId: params.exp.experimentId,
        runId,
        expectedVariantId: expectedVariant.variantId,
        variantId: providedVariantId,
        fix: 'Use the variantId from GET /api/experiments/:id for that runId.',
      });
    }
    return {
      runId,
      variantId: expectedVariant.variantId,
      ratings: params.pr?.ratings,
      notes: params.pr?.notes,
      tags: params.pr?.tags,
    };
  }

  if (providedVariantId && providedVariantId !== 'baseline') {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Baseline perRun entry must use variantId "baseline" (or omit it)',
      {
        experimentId: params.exp.experimentId,
        runId,
        variantId: providedVariantId,
      }
    );
  }

  return {
    runId,
    variantId: 'baseline',
    ratings: params.pr?.ratings,
    notes: params.pr?.notes,
    tags: params.pr?.tags,
  };
}

function normalizeExperimentPerRun(exp: LabExperiment, body: any): NormalizedExperimentPerRun[] {
  const perRunInput = Array.isArray(body.perRun) ? body.perRun : [];
  if (perRunInput.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'Missing perRun ratings', {
      fix: 'Send { perRun: [{ runId, ratings, notes, tags }] }',
    });
  }

  const variantByRunId = new Map(exp.variants.map((v) => [v.runId, v] as const));
  const allowedRunIds = new Set<string>([exp.baselineRunId, ...exp.variants.map((v) => v.runId)]);
  const seenRunIds = new Set<string>();

  const normalized: NormalizedExperimentPerRun[] = [];
  for (const pr of perRunInput) {
    const entry = normalizeExperimentPerRunEntry({
      exp,
      pr,
      variantByRunId,
      allowedRunIds,
      seenRunIds,
    });
    if (entry) normalized.push(entry);
  }

  if (normalized.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'No valid perRun entries provided', {
      fix: 'Send { perRun: [{ runId, ratings, notes, tags }] }',
    });
  }
  if (!seenRunIds.has(exp.baselineRunId)) {
    throw new CMError('INVALID_ARGUMENT', 'Missing baseline perRun entry', {
      experimentId: exp.experimentId,
      baselineRunId: exp.baselineRunId,
      fix: 'Include a perRun entry for the baselineRunId.',
    });
  }
  if (!exp.variants.some((v) => seenRunIds.has(v.runId))) {
    throw new CMError('INVALID_ARGUMENT', 'Missing variant perRun entry', {
      experimentId: exp.experimentId,
      fix: 'Include at least one perRun entry for a variant runId.',
    });
  }

  return normalized;
}

function parseExperimentSubmitMeta(
  exp: LabExperiment,
  body: any
): {
  winnerVariantId: string | undefined;
  reason: string | undefined;
  answers: Record<string, unknown> | undefined;
} {
  const winnerVariantId = parseWinnerVariantId(body.winnerVariantId);
  const allowedWinnerVariantIds = new Set<string>([
    'baseline',
    ...exp.variants.map((v) => v.variantId),
  ]);
  if (winnerVariantId && !allowedWinnerVariantIds.has(winnerVariantId)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid winnerVariantId: ${winnerVariantId}`, {
      experimentId: exp.experimentId,
      fix: 'Use "baseline" or a variantId from GET /api/experiments/:id.',
    });
  }
  const reason =
    typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : undefined;
  const answers =
    body.answers && typeof body.answers === 'object'
      ? (body.answers as Record<string, unknown>)
      : undefined;
  return { winnerVariantId, reason, answers };
}

function parseExperimentSubmitInput(params: { exp: LabExperiment; body: any }): {
  perRun: NormalizedExperimentPerRun[];
  winnerVariantId: string | undefined;
  reason: string | undefined;
  answers: Record<string, unknown> | undefined;
} {
  assertExperimentNotSubmitted(params.exp);
  const perRun = normalizeExperimentPerRun(params.exp, params.body);
  const meta = parseExperimentSubmitMeta(params.exp, params.body);
  return { perRun, ...meta };
}

async function handleExperimentsCreateRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
}): Promise<boolean> {
  const { req, res, url, options } = params;
  if (req.method !== 'POST' || url.pathname !== '/api/experiments') return false;

  requireToken(req, options.session.token);
  const body = await readJsonBody<any>(req);
  const baselineRunId = String(body.baselineRunId ?? '').trim();
  if (!baselineRunId) {
    throw new CMError('INVALID_ARGUMENT', 'Missing baselineRunId', {
      fix: 'Send { baselineRunId, variants: [{ label, runId }] }',
    });
  }
  await getLabRunById(baselineRunId);

  const variantsInput = Array.isArray(body.variants) ? body.variants : [];
  if (variantsInput.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'Missing variants', {
      fix: 'Provide at least one variant runId.',
    });
  }

  const variants = [];
  for (const v of variantsInput) {
    const runId = String(v?.runId ?? '').trim();
    const label = String(v?.label ?? '').trim() || 'B';
    if (!runId) continue;
    await getLabRunById(runId);
    variants.push({ variantId: generateVariantId(), label, runId });
  }

  if (variants.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'No valid variants provided', {
      fix: 'Provide variants as [{ label, runId }].',
    });
  }

  const experiment: LabExperiment = LabExperimentSchema.parse({
    schemaVersion: 1,
    experimentId: generateExperimentId(),
    sessionId: options.session.sessionId,
    createdAt: nowIso(),
    name: String(body.name ?? 'A/B Compare').trim() || 'A/B Compare',
    hypothesis:
      typeof body.hypothesis === 'string' && body.hypothesis.trim()
        ? body.hypothesis.trim()
        : undefined,
    topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : undefined,
    baselineRunId,
    variants,
    status: 'queued',
    questions: Array.isArray(body.questions) ? body.questions : undefined,
  });

  await appendExperiment(labExperimentsStorePath(), experiment);
  sendJson(res, 200, { experimentId: experiment.experimentId });
  return true;
}

async function handleExperimentsListRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  if (req.method !== 'GET' || url.pathname !== '/api/experiments') return false;

  const experiments = await readExperiments(labExperimentsStorePath());
  const items = experiments
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((e) => ({
      experimentId: e.experimentId,
      sessionId: e.sessionId,
      createdAt: e.createdAt,
      name: e.name,
      topic: e.topic ?? null,
      status: e.status,
    }));
  sendJson(res, 200, { items, nextCursor: null });
  return true;
}

async function handleExperimentSubmitRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
  hooks: LabSubmissionHooks;
}): Promise<boolean> {
  const { req, res, url, options, hooks } = params;
  const match = url.pathname.match(/^\/api\/experiments\/([^/]+)\/submit$/);
  if (req.method !== 'POST' || !match) return false;

  requireToken(req, options.session.token);
  const experimentId = decodeURIComponent(match[1]);
  const exp = await getExperimentById(experimentId);
  const body = await readJsonBody<any>(req);
  const requestId = getRequestId(req, body.requestId);

  const idempotencyPath = labSessionIdempotencyStorePath(options.session.sessionId);
  if (requestId) {
    const existing = await findIdempotencyRecord({
      storePath: idempotencyPath,
      requestId,
      type: 'experiment_submit',
    });
    if (existing) {
      sendJson(res, 200, existing.response);
      return true;
    }
  }

  const submit = parseExperimentSubmitInput({ exp, body });

  const feedbackIds: string[] = [];
  for (const pr of submit.perRun) {
    const run = await getLabRunById(pr.runId);
    const derived = await deriveRunSnapshotForFeedback(run);
    const feedbackId = randomUUID();
    const entry: FeedbackEntry = {
      schemaVersion: 1,
      id: feedbackId,
      createdAt: nowIso(),
      sessionId: options.session.sessionId,
      runId: pr.runId,
      experimentId: exp.experimentId,
      variantId: pr.variantId,
      topic: run.topic,
      videoPath: derived.videoPath,
      artifactsDir: run.artifactsDir,
      ratings: validateRatings(pr.ratings),
      notes: parseOptionalNotes(pr.notes),
      tags: parseOptionalTags(pr.tags),
      reports: derived.reports,
      autoMetricsSnapshot: derived.autoMetricsSnapshot,
      answers: submit.answers,
    };

    const appended = await appendFeedback({
      session: options.session,
      requestId: null,
      idempotencyStorePath: idempotencyPath,
      entry,
    });
    feedbackIds.push(appended.feedbackId);
  }

  const updated: LabExperiment = LabExperimentSchema.parse({
    ...exp,
    winner: submit.winnerVariantId
      ? { variantId: submit.winnerVariantId, reason: submit.reason }
      : exp.winner,
    answers: submit.answers ?? exp.answers,
    status: 'done',
    updatedAt: nowIso(),
  });
  await appendExperiment(labExperimentsStorePath(), updated);

  const response = { experimentId: exp.experimentId, feedbackIds };
  if (requestId) {
    const record: LabIdempotencyRecord = LabIdempotencyRecordSchema.parse({
      requestId,
      type: 'experiment_submit',
      response,
      createdAt: nowIso(),
    });
    await appendIdempotencyRecord(idempotencyPath, record);
  }

  sendJson(res, 200, response);
  hooks.onCompareSubmitted(exp.experimentId);
  return true;
}

async function handleExperimentGetRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}): Promise<boolean> {
  const { req, res, url } = params;
  const match = url.pathname.match(/^\/api\/experiments\/([^/]+)$/);
  if (req.method !== 'GET' || !match) return false;

  const experimentId = decodeURIComponent(match[1]);
  const exp = await getExperimentById(experimentId);
  sendJson(res, 200, exp);
  return true;
}

async function handleExperimentsRoutes(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
  hooks: LabSubmissionHooks;
}): Promise<boolean> {
  if (await handleExperimentsCreateRoute(params)) return true;
  if (await handleExperimentsListRoute(params)) return true;
  if (await handleExperimentSubmitRoute(params)) return true;
  if (await handleExperimentGetRoute(params)) return true;
  return false;
}

async function handleFeedbackRoutes(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
  hooks: LabSubmissionHooks;
}): Promise<boolean> {
  const { req, res, url, options, hooks } = params;

  if (req.method === 'POST' && url.pathname === '/api/feedback') {
    requireToken(req, options.session.token);
    const body = await readJsonBody<any>(req);

    const requestId = getRequestId(req, body.requestId);
    const idempotencyPath = labSessionIdempotencyStorePath(options.session.sessionId);

    const runId =
      typeof body.runId === 'string' && body.runId.trim() ? body.runId.trim() : undefined;
    const run = runId ? await getLabRunById(runId) : null;
    const derived = run ? await deriveRunSnapshotForFeedback(run) : null;

    const feedbackId = randomUUID();
    const entry: FeedbackEntry = {
      schemaVersion: 1,
      id: feedbackId,
      createdAt: nowIso(),
      sessionId: options.session.sessionId,
      runId: runId,
      experimentId:
        typeof body.experimentId === 'string' && body.experimentId.trim()
          ? body.experimentId.trim()
          : undefined,
      variantId:
        typeof body.variantId === 'string' && body.variantId.trim()
          ? body.variantId.trim()
          : undefined,
      topic: run?.topic ?? (typeof body.topic === 'string' ? body.topic : undefined),
      videoPath: derived?.videoPath,
      artifactsDir: run?.artifactsDir,
      ratings: validateRatings(body.ratings),
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t: unknown) => typeof t === 'string' && t.trim())
        : undefined,
      reports: derived?.reports,
      autoMetricsSnapshot: derived?.autoMetricsSnapshot,
      answers:
        body.answers && typeof body.answers === 'object'
          ? (body.answers as Record<string, unknown>)
          : undefined,
    };

    const appended = await appendFeedback({
      session: options.session,
      requestId,
      idempotencyStorePath: idempotencyPath,
      entry,
    });

    sendJson(res, 200, { feedbackId: appended.feedbackId });
    if (runId) hooks.onReviewSubmitted(runId);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/feedback') {
    const since = url.searchParams.get('since') ?? '0';
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseOptionalLimit(url.searchParams.get('limit'));
    const result = await readFeedbackSinceCursor({
      storePath: defaultFeedbackStorePath(),
      since,
      sessionId,
      limit,
    });
    sendJson(res, 200, result);
    return true;
  }

  return false;
}

async function handleExportRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  options: LabServerOptions;
}): Promise<boolean> {
  const { req, res, url, options } = params;
  if (req.method !== 'POST' || url.pathname !== '/api/export') return false;

  requireToken(req, options.session.token);
  const body = await readJsonBody<{ sessionId?: string; path?: string }>(req);
  const sessionId = String(body.sessionId ?? '').trim();
  if (!sessionId) {
    throw new CMError('INVALID_ARGUMENT', 'Missing sessionId', {
      fix: 'Send { "sessionId": "lab_..." }',
    });
  }

  const exportRoot = labExportsDir();
  await mkdir(exportRoot, { recursive: true });

  const defaultPath = join(exportRoot, `export-${sessionId}-${Date.now()}.json`);
  const requested = body.path ? assertExportPathAllowed(body.path) : defaultPath;

  const allRuns = await readRuns(labRunsStorePath());
  const runsById = new Map(allRuns.map((r) => [r.runId, r] as const));

  const allExperiments = await readExperiments(labExperimentsStorePath());
  const experiments = allExperiments.filter((e) => e.sessionId === sessionId);

  const allFeedback = await readFeedbackEntries(defaultFeedbackStorePath());
  const feedback = allFeedback.filter((f) => f.sessionId === sessionId);

  const runIds = new Set<string>();
  for (const run of allRuns) {
    if (run.sessionId === sessionId) runIds.add(run.runId);
  }
  for (const exp of experiments) {
    runIds.add(exp.baselineRunId);
    for (const variant of exp.variants) runIds.add(variant.runId);
  }
  for (const fb of feedback) {
    if (fb.runId) runIds.add(fb.runId);
  }

  const runs = Array.from(runIds)
    .map((id) => runsById.get(id))
    .filter((r): r is (typeof allRuns)[number] => Boolean(r))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const exportPayload: LabExport = LabExportSchema.parse({
    schemaVersion: 1,
    exportedAt: nowIso(),
    sessionId,
    runs,
    experiments,
    feedback,
  });

  await writeFile(requested, JSON.stringify(exportPayload, null, 2), 'utf-8');
  sendJson(res, 200, { path: requested, count: feedback.length });
  return true;
}

async function handleLabRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  options: LabServerOptions;
  hooks: LabSubmissionHooks;
}): Promise<void> {
  const { req, res, options, hooks } = params;
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (!url.pathname.startsWith('/api/')) {
    const served = await tryServeLabStatic(req, res);
    if (served) return;
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  if (await handleConfigRoute({ req, res, url, options })) return;
  if (await handleRunsRoutes({ req, res, url, options })) return;
  if (await handleExperimentsRoutes({ req, res, url, options, hooks })) return;
  if (await handleFeedbackRoutes({ req, res, url, options, hooks })) return;
  if (await handleExportRoute({ req, res, url, options })) return;

  res.statusCode = 404;
  res.end('Not found');
}

/**
 * Start the Experiment Lab HTTP server.
 *
 * The CLI uses this in "one-shot" modes (review/compare) where the process should
 * block until the user submits feedback, then exit promptly.
 */
export async function startLabServer(options: LabServerOptions): Promise<StartedLabServer> {
  await mkdir(dirname(labRunsStorePath()), { recursive: true });
  await mkdir(labExportsDir(), { recursive: true });
  await mkdir(dirname(labSessionIdempotencyStorePath(options.session.sessionId)), {
    recursive: true,
  });

  let submissions = 0;
  let server: HttpServer;
  let closing = false;
  let closeResolver: (() => void) | null = null;
  const waitForClose = new Promise<void>((resolve) => {
    closeResolver = resolve;
  });
  const closeSoon = () => {
    if (closing) return;
    closing = true;
    setTimeout(() => {
      // Ensure one-shot flows actually exit promptly even when clients (e.g. fetch/undici)
      // keep connections alive.
      try {
        server.closeIdleConnections();
        server.closeAllConnections();
      } catch {
        // Best-effort; we'll still call `server.close()` below.
      }
      server.close();
    }, 50);
  };

  const hooks: LabSubmissionHooks = {
    onReviewSubmitted: (runId) => {
      if (options.task?.type !== 'review') return;
      if (options.task.runId !== runId) return;
      submissions += 1;
      if (options.exitAfterSubmit > 0 && submissions >= options.exitAfterSubmit) {
        closeSoon();
      }
    },
    onCompareSubmitted: (experimentId) => {
      if (options.task?.type !== 'compare') return;
      if (options.task.experimentId !== experimentId) return;
      submissions += 1;
      if (options.exitAfterSubmit > 0 && submissions >= options.exitAfterSubmit) {
        closeSoon();
      }
    },
  };

  server = createServer((req, res) => {
    handleLabRequest({ req, res, options, hooks }).catch((error) => {
      handleRouteError(res, error);
    });
  });
  server.on('close', () => {
    if (closeResolver) {
      const resolve = closeResolver;
      closeResolver = null;
      resolve();
    }
  });

  const actualPort = await listenWithPortFallback(server, options.host, options.port);
  const url = `http://${options.host}:${actualPort}/`;

  return {
    url,
    server,
    waitForClose,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
