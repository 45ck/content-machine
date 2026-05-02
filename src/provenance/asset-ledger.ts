import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  AssetLedgerSchema,
  type AssetLedger,
  type AssetLedgerEntry,
  type AssetLedgerInput,
  type AudioMixOutput,
  type GameplayClip,
  type VisualAsset,
  type VisualsOutput,
} from '../domain';

type NullablePath = string | null | undefined;

export type GenerateShortAssetLedgerInput = {
  topic: string;
  archetype?: string | null;
  laneId?: string | null;
  llmProvider: string;
  scriptPath: string;
  audio: {
    audioPath: string;
    timestampsPath: string;
    outputMetadataPath: string;
    voice: string;
    ttsEngine: string;
    asrEngine: string;
    audioMix?: AudioMixOutput | null;
  };
  visualsPath: string;
  visuals: VisualsOutput;
  render: {
    outputPath: string;
    outputMetadataPath: string;
    captionExportPath?: NullablePath;
    captionSrtPath?: NullablePath;
    captionAssPath?: NullablePath;
  };
  qualitySummaryPath: string;
  createdAt?: string;
};

function isRemotePath(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isSyntheticPath(path: string): boolean {
  return path.startsWith('#') || path.startsWith('mock://');
}

async function fileHash(path: NullablePath): Promise<string | undefined> {
  if (!path || isRemotePath(path) || isSyntheticPath(path) || !existsSync(path)) return undefined;
  const buffer = await readFile(path);
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function generatedEntry(params: {
  assetId: string;
  assetType: string;
  kind: string;
  stage: string;
  path: string;
  provider: string;
  workflow: string;
  prompt: string;
  model?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}): AssetLedgerEntry {
  return {
    assetId: params.assetId,
    assetType: params.assetType,
    kind: params.kind,
    stage: params.stage,
    path: params.path,
    localPath: isRemotePath(params.path) || isSyntheticPath(params.path) ? undefined : params.path,
    provider: params.provider,
    model: params.model,
    prompt: params.prompt,
    workflow: params.workflow,
    usageMode: 'generated-asset',
    reviewStatus: 'generated-local',
    rightsStatus: 'generated-local',
    licenseName: 'repo-generated',
    createdAt: params.createdAt,
    metadata: params.metadata ?? {},
  };
}

function visualProvider(source: string): string {
  if (source === 'stock-pexels') return 'pexels';
  if (source === 'stock-pixabay') return 'pixabay';
  if (source === 'stock-unsplash') return 'unsplash';
  if (source === 'generated-nanobanana') return 'nanobanana';
  if (source === 'generated-dalle') return 'dalle';
  if (source === 'fallback-color' || source === 'mock') return 'content-machine';
  if (source === 'user-footage') return 'user-supplied';
  return source;
}

function visualUsageMode(source: string): string {
  if (source.startsWith('generated-') || source === 'fallback-color' || source === 'mock') {
    return 'generated-asset';
  }
  if (source.startsWith('stock-')) return 'downloaded-asset';
  if (source === 'user-footage') return 'user-supplied';
  return 'needs-classification';
}

function visualReviewStatus(source: string): string {
  if (source.startsWith('generated-') || source === 'fallback-color' || source === 'mock') {
    return 'generated-local';
  }
  return 'needs-review';
}

function visualEntry(params: {
  scene: VisualAsset;
  topic: string;
  createdAt: string;
}): AssetLedgerEntry {
  const { scene, topic, createdAt } = params;
  const remote = isRemotePath(scene.assetPath);
  const synthetic = isSyntheticPath(scene.assetPath);
  const generated = scene.source.startsWith('generated-') || scene.source === 'fallback-color';
  const prompt = scene.generationPrompt ?? scene.visualCue ?? topic;
  return {
    assetId: `visual:${scene.sceneId}`,
    assetType: scene.assetType ?? 'video',
    kind: 'visual-scene',
    stage: 'timestamps-to-visuals',
    path: scene.assetPath,
    localPath: remote || synthetic ? undefined : scene.assetPath,
    sourceUrl: remote ? scene.assetPath : undefined,
    provider: visualProvider(scene.source),
    model: scene.generationModel,
    prompt: generated ? prompt : undefined,
    generationPrompt: scene.generationPrompt,
    workflow: generated ? 'content-machine/timestamps-to-visuals' : undefined,
    usageMode: visualUsageMode(scene.source),
    reviewStatus: visualReviewStatus(scene.source),
    rightsStatus: visualReviewStatus(scene.source),
    licenseName: generated ? 'repo-generated' : undefined,
    createdAt,
    metadata: {
      sceneId: scene.sceneId,
      source: scene.source,
      duration: scene.duration,
      motionStrategy: scene.motionStrategy,
      motionApplied: scene.motionApplied,
      generationCost: scene.generationCost,
      matchReasoning: scene.matchReasoning,
    },
  };
}

function gameplayEntry(gameplayClip: GameplayClip, createdAt: string): AssetLedgerEntry {
  const remote = isRemotePath(gameplayClip.path);
  return {
    assetId: 'gameplay:background',
    assetType: 'video',
    kind: 'gameplay-background',
    stage: 'timestamps-to-visuals',
    path: gameplayClip.path,
    localPath: remote ? undefined : gameplayClip.path,
    sourceUrl: remote ? gameplayClip.path : undefined,
    provider: 'user-supplied',
    usageMode: 'user-supplied',
    reviewStatus: 'needs-review',
    rightsStatus: 'needs-review',
    createdAt,
    metadata: {
      duration: gameplayClip.duration,
      width: gameplayClip.width,
      height: gameplayClip.height,
      style: gameplayClip.style,
    },
  };
}

function audioMixEntries(
  audioMix: AudioMixOutput | null | undefined,
  createdAt: string
): AssetLedgerEntry[] {
  if (!audioMix) return [];
  return audioMix.layers.map((layer, index) => ({
    assetId: `audio-mix:${layer.type}:${index + 1}`,
    assetType: layer.type === 'music' ? 'music' : layer.type,
    kind: 'audio-mix-layer',
    stage: 'script-to-audio',
    path: layer.path,
    localPath: isRemotePath(layer.path) ? undefined : layer.path,
    sourceUrl: isRemotePath(layer.path) ? layer.path : undefined,
    provider: 'user-supplied',
    usageMode: 'user-supplied',
    reviewStatus: 'needs-review',
    rightsStatus: 'needs-review',
    contentIdRisk: 'unknown',
    mixRole: layer.type,
    createdAt,
    metadata: layer,
  }));
}

/** Normalize supported asset-ledger input shapes into asset entries. */
export function normalizeAssetLedgerInput(input: AssetLedgerInput): AssetLedgerEntry[] {
  if (Array.isArray(input)) return input as AssetLedgerEntry[];
  const record = input as { assets?: AssetLedgerEntry[]; items?: AssetLedgerEntry[] };
  return record.assets ?? record.items ?? [];
}

/** Add SHA-256 file hashes to ledger entries that reference readable local files. */
export async function hashAssetLedgerEntries(
  entries: AssetLedgerEntry[]
): Promise<AssetLedgerEntry[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      fileHash: entry.fileHash ?? (await fileHash(entry.localPath ?? entry.path)),
    }))
  );
}

/** Summarize generated, external, review-risk, and audio-like asset counts. */
export function summarizeAssetLedgerEntries(entries: AssetLedgerEntry[]): AssetLedger['summary'] {
  return {
    assetCount: entries.length,
    generatedCount: entries.filter((entry) => entry.usageMode === 'generated-asset').length,
    externalCount: entries.filter((entry) =>
      ['downloaded-asset', 'user-supplied', 'reference-provider'].includes(entry.usageMode ?? '')
    ).length,
    needsReviewCount: entries.filter((entry) => entry.reviewStatus === 'needs-review').length,
    audioCount: entries.filter((entry) =>
      ['audio', 'music', 'sfx', 'ambience', 'voiceover'].includes(entry.assetType ?? '')
    ).length,
  };
}

/** Build a validated asset-ledger artifact from normalized entries. */
export async function buildAssetLedgerFromEntries(params: {
  assets: AssetLedgerEntry[];
  warnings?: string[];
  createdAt?: string;
  addFileHashes?: boolean;
}): Promise<AssetLedger> {
  const assets =
    params.addFileHashes === false ? params.assets : await hashAssetLedgerEntries(params.assets);
  return AssetLedgerSchema.parse({
    assets,
    summary: summarizeAssetLedgerEntries(assets),
    warnings: params.warnings ?? [],
    createdAt: params.createdAt ?? new Date().toISOString(),
  });
}

/** Build the default asset ledger emitted by a generate-short run. */
export async function buildGenerateShortAssetLedger(
  input: GenerateShortAssetLedgerInput
): Promise<AssetLedger> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const prompt = input.topic;
  const captionArtifacts: Array<{ assetId: string; path: NullablePath; kind: string }> = [
    {
      assetId: 'captions:remotion',
      path: input.render.captionExportPath,
      kind: 'caption-export-json',
    },
    { assetId: 'captions:srt', path: input.render.captionSrtPath, kind: 'caption-srt' },
    { assetId: 'captions:ass', path: input.render.captionAssPath, kind: 'caption-ass' },
  ];
  const entries: AssetLedgerEntry[] = [
    generatedEntry({
      assetId: 'script:main',
      assetType: 'script',
      kind: 'script-artifact',
      stage: 'brief-to-script',
      path: input.scriptPath,
      provider: input.llmProvider,
      workflow: 'content-machine/brief-to-script',
      prompt,
      createdAt,
      metadata: {
        archetype: input.archetype,
        laneId: input.laneId,
      },
    }),
    {
      ...generatedEntry({
        assetId: 'audio:voiceover',
        assetType: 'voiceover',
        kind: 'voiceover-audio',
        stage: 'script-to-audio',
        path: input.audio.audioPath,
        provider: input.audio.ttsEngine,
        workflow: 'content-machine/script-to-audio',
        prompt,
        model: input.audio.voice,
        createdAt,
        metadata: {
          voice: input.audio.voice,
          ttsEngine: input.audio.ttsEngine,
          asrEngine: input.audio.asrEngine,
        },
      }),
      contentIdRisk: 'none-known',
      mixRole: 'voiceover',
    },
    generatedEntry({
      assetId: 'timestamps:main',
      assetType: 'metadata',
      kind: 'timestamps-artifact',
      stage: 'script-to-audio',
      path: input.audio.timestampsPath,
      provider: input.audio.asrEngine,
      workflow: 'content-machine/script-to-audio',
      prompt,
      createdAt,
    }),
    generatedEntry({
      assetId: 'audio:metadata',
      assetType: 'metadata',
      kind: 'audio-stage-metadata',
      stage: 'script-to-audio',
      path: input.audio.outputMetadataPath,
      provider: 'content-machine',
      workflow: 'content-machine/script-to-audio',
      prompt,
      createdAt,
    }),
    generatedEntry({
      assetId: 'visuals:plan',
      assetType: 'metadata',
      kind: 'visuals-artifact',
      stage: 'timestamps-to-visuals',
      path: input.visualsPath,
      provider: 'content-machine',
      workflow: 'content-machine/timestamps-to-visuals',
      prompt,
      createdAt,
    }),
    ...input.visuals.scenes.map((scene) => visualEntry({ scene, topic: input.topic, createdAt })),
    ...(input.visuals.gameplayClip ? [gameplayEntry(input.visuals.gameplayClip, createdAt)] : []),
    ...audioMixEntries(input.audio.audioMix, createdAt),
    generatedEntry({
      assetId: 'render:video',
      assetType: 'video',
      kind: 'final-render',
      stage: 'video-render',
      path: input.render.outputPath,
      provider: 'content-machine',
      workflow: 'content-machine/video-render',
      prompt,
      createdAt,
    }),
    generatedEntry({
      assetId: 'render:metadata',
      assetType: 'metadata',
      kind: 'render-metadata',
      stage: 'video-render',
      path: input.render.outputMetadataPath,
      provider: 'content-machine',
      workflow: 'content-machine/video-render',
      prompt,
      createdAt,
    }),
    ...captionArtifacts.flatMap(({ assetId, path, kind }) =>
      typeof path === 'string'
        ? [
            generatedEntry({
              assetId,
              assetType: 'caption',
              kind,
              stage: 'video-render',
              path,
              provider: 'content-machine',
              workflow: 'content-machine/video-render',
              prompt,
              createdAt,
            }),
          ]
        : []
    ),
    generatedEntry({
      assetId: 'quality:summary',
      assetType: 'metadata',
      kind: 'quality-summary',
      stage: 'generate-short',
      path: input.qualitySummaryPath,
      provider: 'content-machine',
      workflow: 'content-machine/generate-short',
      prompt,
      createdAt,
    }),
  ];
  const assets = await hashAssetLedgerEntries(entries);
  return AssetLedgerSchema.parse({
    assets,
    summary: summarizeAssetLedgerEntries(assets),
    warnings: [],
    createdAt,
  });
}
