import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  readVisualAssetLineage,
  readVisualsRoutingTelemetry,
  writeVisualAssetLineage,
  writeVisualsRoutingTelemetry,
  VisualAssetLineageRecordSchema,
  VisualsRoutingTelemetryRecordSchema,
} from './observability';

describe('visual observability', () => {
  it('writes a routing telemetry JSONL record', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-visuals-telemetry-'));
    const file = join(dir, 'routing.jsonl');

    await writeVisualsRoutingTelemetry({
      path: file,
      pipelineId: 'pipeline-1',
      topic: 'test topic',
      routingPolicy: 'balanced',
      providerChain: ['pexels', 'nanobanana'],
      sceneCount: 2,
      fromGenerated: 1,
      fallbacks: 0,
      totalGenerationCostUsd: 0.04,
      providerAttempts: [
        { provider: 'pexels', phase: 'primary', success: true, durationMs: 20 },
        {
          provider: 'nanobanana',
          phase: 'primary',
          success: false,
          durationMs: 35,
          error: 'HTTP 429',
        },
      ],
      skippedProviders: [{ provider: 'dalle', reason: 'budget' }],
    });

    const lines = (await readFile(file, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    const raw = JSON.parse(lines[0]);
    const parsed = VisualsRoutingTelemetryRecordSchema.parse(raw);
    expect(parsed.providerSummary).toHaveLength(2);
    expect(parsed.routingPolicy).toBe('balanced');
  });

  it('writes validated lineage records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-visuals-lineage-'));
    const file = join(dir, 'lineage.jsonl');

    await writeVisualAssetLineage({
      path: file,
      records: [
        {
          schemaVersion: 1,
          recordedAt: new Date().toISOString(),
          pipelineId: 'pipeline-2',
          topic: 'topic',
          sceneId: 'scene-001',
          assetPath: '/tmp/asset.mp4',
          source: 'stock-pexels',
          assetType: 'video',
          selectedProvider: 'pexels',
          routingPolicy: 'configured',
          isFallback: false,
        },
      ],
    });

    const lines = (await readFile(file, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    const raw = JSON.parse(lines[0]);
    const parsed = VisualAssetLineageRecordSchema.parse(raw);
    expect(parsed.sceneId).toBe('scene-001');
  });

  it('reads telemetry and lineage records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-visuals-read-'));
    const routingPath = join(dir, 'routing.jsonl');
    const lineagePath = join(dir, 'lineage.jsonl');

    await writeVisualsRoutingTelemetry({
      path: routingPath,
      routingPolicy: 'configured',
      providerChain: ['pexels'],
      sceneCount: 1,
      fromGenerated: 0,
      fallbacks: 0,
      totalGenerationCostUsd: 0,
      providerAttempts: [],
      skippedProviders: [],
    });

    await writeVisualAssetLineage({
      path: lineagePath,
      records: [
        {
          schemaVersion: 1,
          recordedAt: new Date().toISOString(),
          sceneId: 'scene-001',
          assetPath: '/tmp/asset.mp4',
          source: 'stock-pexels',
          assetType: 'video',
          isFallback: false,
        },
      ],
    });

    const routing = await readVisualsRoutingTelemetry(routingPath);
    const lineage = await readVisualAssetLineage(lineagePath);

    expect(routing).toHaveLength(1);
    expect(lineage).toHaveLength(1);
  });
});
