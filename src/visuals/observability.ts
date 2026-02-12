import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import type { ProviderRoutingPolicy } from './provider-router.js';

const ProviderAttemptTelemetrySchema = z.object({
  provider: z.string(),
  phase: z.enum(['primary', 'fallback']),
  success: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  error: z.string().optional(),
});

export type ProviderAttemptTelemetry = z.infer<typeof ProviderAttemptTelemetrySchema>;

const ProviderSummarySchema = z.object({
  provider: z.string(),
  attempts: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
});

export const VisualsRoutingTelemetryRecordSchema = z.object({
  schemaVersion: z.literal(1),
  recordedAt: z.string(),
  pipelineId: z.string().optional(),
  topic: z.string().optional(),
  routingPolicy: z.enum(['configured', 'balanced', 'cost-first', 'quality-first']),
  providerChain: z.array(z.string()),
  sceneCount: z.number().int().nonnegative(),
  fromGenerated: z.number().int().nonnegative(),
  fallbacks: z.number().int().nonnegative(),
  totalGenerationCostUsd: z.number().nonnegative(),
  providerSummary: z.array(ProviderSummarySchema),
  skippedProviders: z.array(z.object({ provider: z.string(), reason: z.string() })),
});

export type VisualsRoutingTelemetryRecord = z.infer<typeof VisualsRoutingTelemetryRecordSchema>;

export const VisualAssetLineageRecordSchema = z.object({
  schemaVersion: z.literal(1),
  recordedAt: z.string(),
  pipelineId: z.string().optional(),
  topic: z.string().optional(),
  sceneId: z.string(),
  assetPath: z.string(),
  source: z.string(),
  assetType: z.enum(['video', 'image']),
  selectedProvider: z.string().optional(),
  routingPolicy: z.enum(['configured', 'balanced', 'cost-first', 'quality-first']).optional(),
  generationModel: z.string().optional(),
  generationPrompt: z.string().optional(),
  generationCostUsd: z.number().nonnegative().optional(),
  isFallback: z.boolean(),
});

export type VisualAssetLineageRecord = z.infer<typeof VisualAssetLineageRecordSchema>;

async function appendJsonl(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, {
    encoding: 'utf-8',
    flag: 'a',
  });
}

/**
 * Resolve the default visuals routing telemetry JSONL path.
 */
export function defaultVisualsRoutingTelemetryPath(): string {
  const override = process.env.CM_VISUALS_TELEMETRY_PATH;
  if (override && override.trim()) return resolve(override.trim());
  return joinCm('telemetry', 'visuals-routing.jsonl');
}

/**
 * Resolve the default visual asset lineage JSONL path.
 */
export function defaultVisualAssetLineagePath(): string {
  const override = process.env.CM_ASSET_LINEAGE_PATH;
  if (override && override.trim()) return resolve(override.trim());
  return joinCm('assets', 'lineage', 'visual-assets.jsonl');
}

function joinCm(...segments: string[]): string {
  return resolve(homedir(), '.cm', ...segments);
}

/**
 * Determine whether visuals observability writes are enabled.
 */
export function isVisualObservabilityEnabled(): boolean {
  const raw = process.env.CM_VISUALS_OBSERVABILITY;
  if (raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  return process.env.NODE_ENV !== 'test';
}

/**
 * Append one visuals routing telemetry record to JSONL storage.
 */
export async function writeVisualsRoutingTelemetry(params: {
  path?: string;
  pipelineId?: string;
  topic?: string;
  routingPolicy: ProviderRoutingPolicy;
  providerChain: string[];
  sceneCount: number;
  fromGenerated: number;
  fallbacks: number;
  totalGenerationCostUsd: number;
  providerAttempts: ProviderAttemptTelemetry[];
  skippedProviders: Array<{ provider: string; reason: string }>;
}): Promise<void> {
  const providerBuckets = new Map<
    string,
    { attempts: number; successes: number; failures: number; totalLatencyMs: number }
  >();

  for (const attempt of params.providerAttempts) {
    const parsedAttempt = ProviderAttemptTelemetrySchema.parse(attempt);
    const current = providerBuckets.get(parsedAttempt.provider) ?? {
      attempts: 0,
      successes: 0,
      failures: 0,
      totalLatencyMs: 0,
    };
    current.attempts += 1;
    current.successes += parsedAttempt.success ? 1 : 0;
    current.failures += parsedAttempt.success ? 0 : 1;
    current.totalLatencyMs += parsedAttempt.durationMs;
    providerBuckets.set(parsedAttempt.provider, current);
  }

  const providerSummary = Array.from(providerBuckets.entries()).map(([provider, stats]) => ({
    provider,
    attempts: stats.attempts,
    successes: stats.successes,
    failures: stats.failures,
    avgLatencyMs: stats.attempts > 0 ? stats.totalLatencyMs / stats.attempts : 0,
  }));

  const record = VisualsRoutingTelemetryRecordSchema.parse({
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    pipelineId: params.pipelineId,
    topic: params.topic,
    routingPolicy: params.routingPolicy,
    providerChain: params.providerChain,
    sceneCount: params.sceneCount,
    fromGenerated: params.fromGenerated,
    fallbacks: params.fallbacks,
    totalGenerationCostUsd: params.totalGenerationCostUsd,
    providerSummary,
    skippedProviders: params.skippedProviders,
  });

  await appendJsonl(params.path ?? defaultVisualsRoutingTelemetryPath(), record);
}

/**
 * Append visual asset lineage records to JSONL storage.
 */
export async function writeVisualAssetLineage(params: {
  path?: string;
  records: VisualAssetLineageRecord[];
}): Promise<void> {
  const path = params.path ?? defaultVisualAssetLineagePath();
  for (const record of params.records) {
    const parsed = VisualAssetLineageRecordSchema.parse(record);
    await appendJsonl(path, parsed);
  }
}

function isProbablyJson(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

async function readJsonlValidated<T>(params: {
  path: string;
  schema: z.ZodType<T, any, unknown>;
}): Promise<T[]> {
  try {
    const content = await readFile(params.path, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    const records: T[] = [];
    for (const line of lines) {
      if (!isProbablyJson(line)) continue;
      try {
        const raw = JSON.parse(line) as unknown;
        const parsed = params.schema.safeParse(raw);
        if (parsed.success) records.push(parsed.data);
      } catch {
        // Ignore malformed lines in append-only logs.
      }
    }
    return records;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Read and validate visuals routing telemetry records from JSONL.
 */
export async function readVisualsRoutingTelemetry(
  path = defaultVisualsRoutingTelemetryPath()
): Promise<VisualsRoutingTelemetryRecord[]> {
  return readJsonlValidated({
    path,
    schema: VisualsRoutingTelemetryRecordSchema,
  });
}

/**
 * Read and validate visual asset lineage records from JSONL.
 */
export async function readVisualAssetLineage(
  path = defaultVisualAssetLineagePath()
): Promise<VisualAssetLineageRecord[]> {
  return readJsonlValidated({
    path,
    schema: VisualAssetLineageRecordSchema,
  });
}
