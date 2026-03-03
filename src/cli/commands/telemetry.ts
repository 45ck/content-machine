import { Command } from 'commander';
import { resolve } from 'node:path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import {
  defaultVisualAssetLineagePath,
  defaultVisualsRoutingTelemetryPath,
  readVisualAssetLineage,
  readVisualsRoutingTelemetry,
  type VisualAssetLineageRecord,
  type VisualsRoutingTelemetryRecord,
} from '../../visuals/observability';

function parseSince(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : undefined;
}

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function filterBySince<T extends { recordedAt: string }>(
  items: T[],
  sinceMs: number | undefined
): T[] {
  if (sinceMs === undefined) return items;
  return items.filter((item) => {
    const ts = Date.parse(item.recordedAt);
    return Number.isFinite(ts) && ts >= sinceMs;
  });
}

function summarizeRouting(records: VisualsRoutingTelemetryRecord[]): {
  records: number;
  scenes: number;
  generated: number;
  fallbacks: number;
  costUsd: number;
  providers: Array<{ provider: string; attempts: number; successes: number; failures: number }>;
} {
  const providerMap = new Map<string, { attempts: number; successes: number; failures: number }>();
  let scenes = 0;
  let generated = 0;
  let fallbacks = 0;
  let costUsd = 0;

  for (const record of records) {
    scenes += record.sceneCount;
    generated += record.fromGenerated;
    fallbacks += record.fallbacks;
    costUsd += record.totalGenerationCostUsd;
    for (const provider of record.providerSummary) {
      const current = providerMap.get(provider.provider) ?? {
        attempts: 0,
        successes: 0,
        failures: 0,
      };
      current.attempts += provider.attempts;
      current.successes += provider.successes;
      current.failures += provider.failures;
      providerMap.set(provider.provider, current);
    }
  }

  return {
    records: records.length,
    scenes,
    generated,
    fallbacks,
    costUsd,
    providers: Array.from(providerMap.entries())
      .map(([provider, stats]) => ({ provider, ...stats }))
      .sort((a, b) => b.attempts - a.attempts),
  };
}

function summarizeLineage(records: VisualAssetLineageRecord[]): {
  records: number;
  imageAssets: number;
  videoAssets: number;
  fallbacks: number;
  generatedCostUsd: number;
} {
  let imageAssets = 0;
  let videoAssets = 0;
  let fallbacks = 0;
  let generatedCostUsd = 0;

  for (const record of records) {
    if (record.assetType === 'image') imageAssets += 1;
    if (record.assetType === 'video') videoAssets += 1;
    if (record.isFallback) fallbacks += 1;
    if (typeof record.generationCostUsd === 'number') {
      generatedCostUsd += record.generationCostUsd;
    }
  }

  return {
    records: records.length,
    imageAssets,
    videoAssets,
    fallbacks,
    generatedCostUsd,
  };
}

export const telemetryCommand = new Command('telemetry')
  .description('Inspect visuals routing telemetry and asset lineage')
  .addCommand(
    new Command('routing')
      .description('Show visuals routing telemetry summaries')
      .option('--path <path>', 'Routing telemetry path', defaultVisualsRoutingTelemetryPath())
      .option('--since <iso>', 'Only include records at/after this ISO timestamp')
      .option('--provider <id>', 'Filter to records that include provider id')
      .option('--policy <policy>', 'Filter by routing policy')
      .option('--limit <n>', 'Max records to inspect', '200')
      .action(async (options) => {
        const runtime = getCliRuntime();
        try {
          const path = resolve(String(options.path));
          const sinceMs = parseSince(options.since);
          const limit = parseLimit(options.limit, 200);
          const providerFilter =
            typeof options.provider === 'string' && options.provider.trim()
              ? options.provider.trim()
              : undefined;
          const policyFilter =
            typeof options.policy === 'string' && options.policy.trim()
              ? options.policy.trim()
              : undefined;

          let records = await readVisualsRoutingTelemetry(path);
          records = filterBySince(records, sinceMs);
          if (providerFilter) {
            records = records.filter((record) => record.providerChain.includes(providerFilter));
          }
          if (policyFilter) {
            records = records.filter((record) => record.routingPolicy === policyFilter);
          }
          records = records.slice(-limit);
          const summary = summarizeRouting(records);

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'telemetry:routing',
                args: {
                  path,
                  since: options.since ?? null,
                  provider: providerFilter ?? null,
                  policy: policyFilter ?? null,
                  limit,
                },
                outputs: {
                  ...summary,
                  sample: records.slice(-10),
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Routing telemetry: ${path}`);
          writeStderrLine(`Records: ${summary.records}`);
          writeStderrLine(`Scenes: ${summary.scenes}`);
          writeStderrLine(`Generated: ${summary.generated}`);
          writeStderrLine(`Fallbacks: ${summary.fallbacks}`);
          writeStderrLine(`Generation cost: $${summary.costUsd.toFixed(2)}`);
          if (summary.providers.length > 0) {
            writeStderrLine('Providers:');
            for (const provider of summary.providers.slice(0, 8)) {
              const rate =
                provider.attempts > 0
                  ? ((provider.successes / provider.attempts) * 100).toFixed(1)
                  : '0.0';
              writeStderrLine(
                `- ${provider.provider}: attempts=${provider.attempts} success=${rate}% failures=${provider.failures}`
              );
            }
          }
          writeStdoutLine(path);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('lineage')
      .description('Show visual asset lineage summaries')
      .option('--path <path>', 'Lineage path', defaultVisualAssetLineagePath())
      .option('--since <iso>', 'Only include records at/after this ISO timestamp')
      .option('--provider <id>', 'Filter by selected provider')
      .option('--scene <sceneId>', 'Filter by scene id')
      .option('--limit <n>', 'Max records to inspect', '200')
      .action(async (options) => {
        const runtime = getCliRuntime();
        try {
          const path = resolve(String(options.path));
          const sinceMs = parseSince(options.since);
          const limit = parseLimit(options.limit, 200);
          const providerFilter =
            typeof options.provider === 'string' && options.provider.trim()
              ? options.provider.trim()
              : undefined;
          const sceneFilter =
            typeof options.scene === 'string' && options.scene.trim()
              ? options.scene.trim()
              : undefined;

          let records = await readVisualAssetLineage(path);
          records = filterBySince(records, sinceMs);
          if (providerFilter) {
            records = records.filter((record) => record.selectedProvider === providerFilter);
          }
          if (sceneFilter) {
            records = records.filter((record) => record.sceneId === sceneFilter);
          }
          records = records.slice(-limit);
          const summary = summarizeLineage(records);

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'telemetry:lineage',
                args: {
                  path,
                  since: options.since ?? null,
                  provider: providerFilter ?? null,
                  scene: sceneFilter ?? null,
                  limit,
                },
                outputs: {
                  ...summary,
                  sample: records.slice(-10),
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Visual asset lineage: ${path}`);
          writeStderrLine(`Records: ${summary.records}`);
          writeStderrLine(`Image assets: ${summary.imageAssets}`);
          writeStderrLine(`Video assets: ${summary.videoAssets}`);
          writeStderrLine(`Fallback assets: ${summary.fallbacks}`);
          writeStderrLine(`Generation cost: $${summary.generatedCostUsd.toFixed(2)}`);
          writeStdoutLine(path);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .configureHelp({ sortSubcommands: true });
