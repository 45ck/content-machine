/**
 * Feedback command - Capture human feedback across generations
 *
 * Goal: let users rate multiple runs, then export a single JSON file they can share.
 */
import { Command } from 'commander';
import { stat, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import type { CliRuntime } from '../runtime';
import { getInquirer } from '../inquirer';
import { handleCommandError, readInputFile } from '../utils';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { FeedbackEntrySchema } from '../../domain';
import type { FeedbackEntry, FeedbackRatings } from '../../domain';
import {
  appendFeedbackEntry,
  defaultFeedbackStorePath,
  readFeedbackEntries,
  writeFeedbackExportFile,
} from '../../feedback/store';

function parseOptionalInt0to100(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value));
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 100) return undefined;
  return rounded;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveArtifactsDir(
  input: string
): Promise<{ artifactsDir: string; videoPath?: string }> {
  const abs = resolve(input);
  const info = await stat(abs);
  if (info.isDirectory()) return { artifactsDir: abs };
  if (info.isFile()) return { artifactsDir: dirname(abs), videoPath: abs };
  return { artifactsDir: dirname(abs), videoPath: abs };
}

async function inferTopicFromArtifacts(artifactsDir: string): Promise<string | undefined> {
  const scriptPath = join(artifactsDir, 'script.json');
  if (!(await pathExists(scriptPath))) return undefined;

  try {
    const raw = await readInputFile<Record<string, unknown>>(scriptPath);
    const meta = (raw.meta ?? raw.metadata) as Record<string, unknown> | undefined;
    const topic = meta && typeof meta.topic === 'string' ? meta.topic : undefined;
    if (topic && topic.trim()) return topic.trim();
    const title = typeof raw.title === 'string' ? raw.title : undefined;
    return title && title.trim() ? title.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function findReportPaths(artifactsDir: string): Promise<{
  syncReportPath?: string;
  captionReportPath?: string;
  scorePath?: string;
}> {
  const candidates: string[] = await readdir(artifactsDir).catch(() => [] as string[]);

  const pickFirst = (names: string[]): string | undefined => {
    for (const name of names) {
      if (candidates.includes(name)) return join(artifactsDir, name);
    }
    return undefined;
  };

  // Keep intentionally loose; filenames may evolve.
  const syncReportPath =
    pickFirst(['sync-report.json', 'sync-rating.json', 'rate.json', 'sync.json']) ??
    pickFirst(['sync.report.json', 'sync.rating.json']);
  const captionReportPath =
    pickFirst(['caption-quality.json', 'caption-report.json', 'caption.report.json']) ??
    pickFirst(['captionQuality.json']);
  const scorePath = pickFirst(['score.json']);

  return { syncReportPath, captionReportPath, scorePath };
}

async function promptForFeedback(): Promise<{
  ratings: FeedbackRatings;
  notes?: string;
  tags?: string[];
}> {
  const inquirer = await getInquirer();
  const { overall } = await inquirer.prompt<{ overall: number }>({
    type: 'number',
    name: 'overall',
    message: 'Overall quality (0-100)?',
    default: 70,
  });
  const { script } = await inquirer.prompt<{ script: number }>({
    type: 'number',
    name: 'script',
    message: 'Script quality (0-100)?',
    default: 70,
  });
  const { visuals } = await inquirer.prompt<{ visuals: number }>({
    type: 'number',
    name: 'visuals',
    message: 'Visuals relevance (0-100)?',
    default: 70,
  });
  const { captions } = await inquirer.prompt<{ captions: number }>({
    type: 'number',
    name: 'captions',
    message: 'Captions readability (0-100)?',
    default: 70,
  });
  const { sync } = await inquirer.prompt<{ sync: number }>({
    type: 'number',
    name: 'sync',
    message: 'Caption-audio sync (0-100)?',
    default: 70,
  });
  const { notes } = await inquirer.prompt<{ notes: string }>({
    type: 'input',
    name: 'notes',
    message: 'Notes (optional):',
    default: '',
  });
  const { tags } = await inquirer.prompt<{ tags: string }>({
    type: 'input',
    name: 'tags',
    message: 'Tags (comma-separated, optional):',
    default: '',
  });

  const tagList = String(tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    ratings: {
      overall: parseOptionalInt0to100(overall),
      script: parseOptionalInt0to100(script),
      visuals: parseOptionalInt0to100(visuals),
      captions: parseOptionalInt0to100(captions),
      sync: parseOptionalInt0to100(sync),
    },
    notes: String(notes ?? '').trim() || undefined,
    tags: tagList.length > 0 ? tagList : undefined,
  };
}

type ResolvedArtifacts = { artifactsDir: string; videoPath?: string };
type PromptedFeedback = Awaited<ReturnType<typeof promptForFeedback>>;
type ReportPaths = Awaited<ReturnType<typeof findReportPaths>>;

function parseCsvTags(value: string | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

async function resolveArtifactsFromOptions(
  inputPath: string,
  options: FeedbackAddOptions
): Promise<ResolvedArtifacts> {
  if (options.artifacts || options.video) {
    return {
      artifactsDir: options.artifacts
        ? resolve(options.artifacts)
        : dirname(resolve(options.video!)),
      videoPath: options.video ? resolve(options.video) : undefined,
    };
  }
  return resolveArtifactsDir(inputPath);
}

function getRatingsFromFlags(options: FeedbackAddOptions): FeedbackRatings {
  return {
    overall: parseOptionalInt0to100(options.overall),
    script: parseOptionalInt0to100(options.script),
    visuals: parseOptionalInt0to100(options.visuals),
    captions: parseOptionalInt0to100(options.captions),
    sync: parseOptionalInt0to100(options.sync),
  };
}

function hasAnyRating(ratings: FeedbackRatings): boolean {
  return Object.values(ratings).some((v) => typeof v === 'number');
}

function shouldPromptForAdd(
  runtime: CliRuntime,
  options: FeedbackAddOptions,
  flagsHaveAnyRating: boolean
): boolean {
  return Boolean(options.interactive) && !runtime.json && !flagsHaveAnyRating;
}

function resolveTagsFromPromptOrFlags(
  options: FeedbackAddOptions,
  prompted: PromptedFeedback | null
): string[] | undefined {
  const tagList = (prompted?.tags ?? parseCsvTags(options.tags)).filter(Boolean);
  return tagList.length > 0 ? tagList : undefined;
}

async function maybePromptFeedbackAdd(
  runtime: CliRuntime,
  options: FeedbackAddOptions,
  flagsHaveAnyRating: boolean
): Promise<PromptedFeedback | null> {
  if (!shouldPromptForAdd(runtime, options, flagsHaveAnyRating)) return null;
  return promptForFeedback();
}

function resolveTopicFromOptions(
  options: FeedbackAddOptions,
  inferredTopic: string | undefined
): string | undefined {
  const trimmed = options.topic?.trim();
  if (trimmed) return trimmed;
  return inferredTopic;
}

function resolveVideoPathFromOptions(
  options: FeedbackAddOptions,
  resolved: ResolvedArtifacts
): string | undefined {
  if (options.video) return resolve(options.video);
  return resolved.videoPath;
}

function mergeRatingsFromFlagsAndPrompted(
  ratingsFromFlags: FeedbackRatings,
  prompted: PromptedFeedback | null
): FeedbackRatings {
  const merged: FeedbackRatings = { ...ratingsFromFlags };

  if (merged.overall === undefined) merged.overall = prompted?.ratings.overall;
  if (merged.script === undefined) merged.script = prompted?.ratings.script;
  if (merged.visuals === undefined) merged.visuals = prompted?.ratings.visuals;
  if (merged.captions === undefined) merged.captions = prompted?.ratings.captions;
  if (merged.sync === undefined) merged.sync = prompted?.ratings.sync;

  return merged;
}

function resolveNotesFromOptions(
  options: FeedbackAddOptions,
  prompted: PromptedFeedback | null
): string | undefined {
  const trimmed = options.notes?.trim();
  if (trimmed) return trimmed;
  return prompted?.notes;
}

function resolveReportsFromPaths(reports: ReportPaths): ReportPaths | undefined {
  if (reports.syncReportPath) return reports;
  if (reports.captionReportPath) return reports;
  if (reports.scorePath) return reports;
  return undefined;
}

function buildFeedbackEntryForAdd(params: {
  options: FeedbackAddOptions;
  resolved: ResolvedArtifacts;
  inferredTopic: string | undefined;
  ratingsFromFlags: FeedbackRatings;
  prompted: PromptedFeedback | null;
  tags: string[] | undefined;
  reports: ReportPaths;
}): FeedbackEntry {
  const topic = resolveTopicFromOptions(params.options, params.inferredTopic);
  const videoPath = resolveVideoPathFromOptions(params.options, params.resolved);
  const ratings = mergeRatingsFromFlagsAndPrompted(params.ratingsFromFlags, params.prompted);
  const notes = resolveNotesFromOptions(params.options, params.prompted);
  const reports = resolveReportsFromPaths(params.reports);

  return {
    schemaVersion: 1,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    topic,
    videoPath,
    artifactsDir: params.resolved.artifactsDir,
    ratings,
    notes,
    tags: params.tags,
    reports,
  };
}

function writeFeedbackAddJsonOutput(
  runtime: CliRuntime,
  storePath: string,
  parsed: FeedbackEntry
): void {
  const videoPathOrNull = parsed.videoPath === undefined ? null : parsed.videoPath;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'feedback:add',
      args: { storePath, artifactsDir: parsed.artifactsDir, videoPath: videoPathOrNull },
      outputs: { id: parsed.id },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
}

function formatOptionalString(value: string | undefined): string {
  if (!value) return '(none)';
  return value;
}

function formatOptionalNumber(value: number | undefined): string {
  if (value === undefined) return '(none)';
  return String(value);
}

function buildFeedbackAddSummaryRows(
  parsed: FeedbackEntry,
  storePath: string
): Array<[string, string]> {
  return [
    ['ID', parsed.id],
    ['Store', storePath],
    ['Artifacts', formatOptionalString(parsed.artifactsDir)],
    ['Video', formatOptionalString(parsed.videoPath)],
    ['Overall', formatOptionalNumber(parsed.ratings?.overall)],
    ['Script', formatOptionalNumber(parsed.ratings?.script)],
    ['Visuals', formatOptionalNumber(parsed.ratings?.visuals)],
    ['Captions', formatOptionalNumber(parsed.ratings?.captions)],
    ['Sync', formatOptionalNumber(parsed.ratings?.sync)],
  ];
}

async function writeFeedbackAddHumanOutput(
  storePath: string,
  parsed: FeedbackEntry
): Promise<void> {
  const rows = buildFeedbackAddSummaryRows(parsed, storePath);

  await writeSummaryCard({
    title: 'Feedback saved',
    lines: [...formatKeyValueRows(rows)],
    footerLines: ['Next: cm feedback export -o feedback.export.json'],
  });

  writeStdoutLine(parsed.id);
}

async function runFeedbackAdd(params: {
  inputPath: string;
  options: FeedbackAddOptions;
  storePath: string;
  runtime: CliRuntime;
}): Promise<void> {
  const resolved = await resolveArtifactsFromOptions(params.inputPath, params.options);

  if (!(await pathExists(resolved.artifactsDir))) {
    throw new Error(`Artifacts directory not found: ${resolved.artifactsDir}`);
  }

  const reports = await findReportPaths(resolved.artifactsDir);
  const ratingsFromFlags = getRatingsFromFlags(params.options);
  const flagsHaveAnyRating = hasAnyRating(ratingsFromFlags);

  const prompted = await maybePromptFeedbackAdd(params.runtime, params.options, flagsHaveAnyRating);
  const tags = resolveTagsFromPromptOrFlags(params.options, prompted);
  const inferredTopic = await inferTopicFromArtifacts(resolved.artifactsDir);

  const entry = buildFeedbackEntryForAdd({
    options: params.options,
    resolved,
    inferredTopic,
    ratingsFromFlags,
    prompted,
    tags,
    reports,
  });

  const parsed = FeedbackEntrySchema.parse(entry);
  await appendFeedbackEntry(params.storePath, parsed);

  if (params.runtime.json) {
    writeFeedbackAddJsonOutput(params.runtime, params.storePath, parsed);
    return;
  }

  await writeFeedbackAddHumanOutput(params.storePath, parsed);
}

interface FeedbackAddOptions {
  store?: string;
  artifacts?: string;
  video?: string;
  topic?: string;
  overall?: string;
  script?: string;
  visuals?: string;
  captions?: string;
  sync?: string;
  notes?: string;
  tags?: string;
  interactive?: boolean;
}

interface FeedbackExportOptions {
  store?: string;
  output?: string;
  limit?: string;
  since?: string;
}

export const feedbackCommand = new Command('feedback')
  .description('Capture human feedback for generations and export it for iteration')
  .addCommand(
    new Command('add')
      .description('Add a feedback entry for a run (artifacts dir or video path)')
      .argument('<path>', 'Artifacts directory or output video path')
      .option('--store <path>', 'Feedback store path (default: ~/.cm/feedback/feedback.jsonl)')
      .option('--artifacts <dir>', 'Explicit artifacts directory (overrides <path>)')
      .option('--video <path>', 'Explicit video path')
      .option('--topic <topic>', 'Topic (optional)')
      .option('--overall <0-100>', 'Overall rating (0-100)')
      .option('--script <0-100>', 'Script rating (0-100)')
      .option('--visuals <0-100>', 'Visuals rating (0-100)')
      .option('--captions <0-100>', 'Captions rating (0-100)')
      .option('--sync <0-100>', 'Sync rating (0-100)')
      .option('--notes <text>', 'Freeform notes')
      .option('--tags <csv>', 'Comma-separated tags')
      .option('--interactive', 'Prompt for ratings/notes', true)
      .option('--no-interactive', 'Do not prompt; rely on flags only')
      .action(async (inputPath: string, options: FeedbackAddOptions) => {
        const runtime = getCliRuntime();
        const storePath = options.store ? resolve(options.store) : defaultFeedbackStorePath();

        try {
          await runFeedbackAdd({ inputPath, options, storePath, runtime });
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('export')
      .description('Export feedback entries to a single JSON file for sharing')
      .option('--store <path>', 'Feedback store path (default: ~/.cm/feedback/feedback.jsonl)')
      .option('-o, --output <path>', 'Output JSON path', 'feedback.export.json')
      .option('--limit <n>', 'Max entries to export (newest first)')
      .option(
        '--since <iso>',
        'Only include entries created at or after this ISO datetime (e.g. 2026-02-01T00:00:00Z)'
      )
      .action(async (options: FeedbackExportOptions) => {
        const runtime = getCliRuntime();
        const storePath = options.store ? resolve(options.store) : defaultFeedbackStorePath();
        const outputPath = resolve(options.output ?? 'feedback.export.json');

        try {
          const entries = await readFeedbackEntries(storePath);
          const since = options.since ? new Date(options.since).getTime() : null;
          const filtered = entries
            .filter((e) => (since ? new Date(e.createdAt).getTime() >= since : true))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const limit = options.limit ? Number(options.limit) : null;
          const limited =
            limit && Number.isFinite(limit)
              ? filtered.slice(0, Math.max(0, Math.floor(limit)))
              : filtered;

          await writeFeedbackExportFile({
            path: outputPath,
            exportedAt: new Date().toISOString(),
            entries: limited,
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'feedback:export',
                args: { storePath, outputPath },
                outputs: { count: limited.length, path: outputPath },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Exported ${limited.length} entries to: ${outputPath}`);
          writeStdoutLine(outputPath);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List recent feedback entries')
      .option('--store <path>', 'Feedback store path (default: ~/.cm/feedback/feedback.jsonl)')
      .option('--limit <n>', 'Max entries to list', '10')
      .action(async (options: { store?: string; limit?: string }) => {
        const runtime = getCliRuntime();
        const storePath = options.store ? resolve(options.store) : defaultFeedbackStorePath();

        try {
          const entries = (await readFeedbackEntries(storePath)).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const limit = Math.max(0, Math.floor(Number(options.limit ?? 10)));
          const limited = entries.slice(0, limit);

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'feedback:list',
                args: { storePath, limit },
                outputs: { entries: limited },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (limited.length === 0) {
            writeStderrLine(`No feedback entries found in: ${storePath}`);
            return;
          }

          for (const e of limited) {
            const o = e.ratings?.overall ?? null;
            writeStdoutLine(`${e.createdAt}  overall=${o ?? '-'}  id=${e.id}`);
          }
        } catch (error) {
          handleCommandError(error);
        }
      })
  );
