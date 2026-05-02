import { resolve } from 'node:path';
import { z } from 'zod';
import { AssetLedgerEntrySchema, AssetLedgerInputSchema, type AssetLedgerEntry } from '../domain';
import { buildAssetLedgerFromEntries, normalizeAssetLedgerInput } from '../provenance';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const ArtifactPathsSchema = z
  .object({
    scriptPath: z.string().min(1).optional(),
    audioPath: z.string().min(1).optional(),
    timestampsPath: z.string().min(1).optional(),
    audioMetadataPath: z.string().min(1).optional(),
    visualsPath: z.string().min(1).optional(),
    renderPath: z.string().min(1).optional(),
    renderMetadataPath: z.string().min(1).optional(),
    captionExportPath: z.string().min(1).optional(),
    captionSrtPath: z.string().min(1).optional(),
    captionAssPath: z.string().min(1).optional(),
    qualitySummaryPath: z.string().min(1).optional(),
  })
  .strict()
  .default({});

const GeneratedDefaultsSchema = z
  .object({
    topic: z.string().min(1).default('Manual asset ledger'),
    provider: z.string().min(1).default('content-machine'),
    workflow: z.string().min(1).default('content-machine/asset-ledger'),
    usageMode: z.string().min(1).default('generated-asset'),
    reviewStatus: z.string().min(1).default('generated-local'),
    rightsStatus: z.string().min(1).default('generated-local'),
    licenseName: z.string().min(1).default('repo-generated'),
  })
  .strict()
  .default({});

export const AssetLedgerRequestSchema = z
  .object({
    outputPath: z.string().min(1).default('output/content-machine/provenance/asset-ledger.json'),
    existingLedgerPath: z.string().min(1).optional(),
    assets: z.array(AssetLedgerEntrySchema).default([]),
    artifacts: ArtifactPathsSchema,
    generatedDefaults: GeneratedDefaultsSchema,
    mergeStrategy: z.enum(['append', 'upsert-by-asset-id']).default('upsert-by-asset-id'),
    addFileHashes: z.boolean().default(true),
    createdAt: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasArtifacts = Object.values(value.artifacts).some(
      (artifactPath) => typeof artifactPath === 'string' && artifactPath.length > 0
    );
    if (!value.existingLedgerPath && value.assets.length === 0 && !hasArtifacts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide existingLedgerPath, at least one asset, or at least one artifacts.* path.',
      });
    }
  });

export type AssetLedgerRequest = z.input<typeof AssetLedgerRequestSchema>;

type NormalizedAssetLedgerRequest = z.output<typeof AssetLedgerRequestSchema>;

const artifactDefinitions: Array<{
  field: keyof z.output<typeof ArtifactPathsSchema>;
  assetId: string;
  assetType: string;
  kind: string;
  stage: string;
  extra?: Partial<AssetLedgerEntry>;
}> = [
  {
    field: 'scriptPath',
    assetId: 'script:main',
    assetType: 'script',
    kind: 'script-artifact',
    stage: 'brief-to-script',
  },
  {
    field: 'audioPath',
    assetId: 'audio:voiceover',
    assetType: 'voiceover',
    kind: 'voiceover-audio',
    stage: 'script-to-audio',
    extra: { contentIdRisk: 'none-known', mixRole: 'voiceover' },
  },
  {
    field: 'timestampsPath',
    assetId: 'timestamps:main',
    assetType: 'metadata',
    kind: 'timestamps-artifact',
    stage: 'script-to-audio',
  },
  {
    field: 'audioMetadataPath',
    assetId: 'audio:metadata',
    assetType: 'metadata',
    kind: 'audio-stage-metadata',
    stage: 'script-to-audio',
  },
  {
    field: 'visualsPath',
    assetId: 'visuals:plan',
    assetType: 'metadata',
    kind: 'visuals-artifact',
    stage: 'timestamps-to-visuals',
  },
  {
    field: 'renderPath',
    assetId: 'render:video',
    assetType: 'video',
    kind: 'final-render',
    stage: 'video-render',
  },
  {
    field: 'renderMetadataPath',
    assetId: 'render:metadata',
    assetType: 'metadata',
    kind: 'render-metadata',
    stage: 'video-render',
  },
  {
    field: 'captionExportPath',
    assetId: 'captions:remotion',
    assetType: 'caption',
    kind: 'caption-export-json',
    stage: 'video-render',
  },
  {
    field: 'captionSrtPath',
    assetId: 'captions:srt',
    assetType: 'caption',
    kind: 'caption-srt',
    stage: 'video-render',
  },
  {
    field: 'captionAssPath',
    assetId: 'captions:ass',
    assetType: 'caption',
    kind: 'caption-ass',
    stage: 'video-render',
  },
  {
    field: 'qualitySummaryPath',
    assetId: 'quality:summary',
    assetType: 'metadata',
    kind: 'quality-summary',
    stage: 'generate-short',
  },
];

function isRemotePath(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isSyntheticPath(path: string): boolean {
  return path.startsWith('#') || path.startsWith('mock://');
}

function fillPathFields(entry: AssetLedgerEntry): AssetLedgerEntry {
  const candidatePath = entry.localPath ?? entry.path;
  if (!candidatePath || isRemotePath(candidatePath) || isSyntheticPath(candidatePath)) {
    return entry;
  }
  return {
    ...entry,
    localPath: entry.localPath ?? resolve(candidatePath),
  };
}

function normalizeAsset(entry: AssetLedgerEntry): AssetLedgerEntry {
  const withPath = fillPathFields(entry);
  const sourcePath = withPath.path ?? withPath.localPath;
  return {
    ...withPath,
    sourceUrl:
      withPath.sourceUrl ?? (sourcePath && isRemotePath(sourcePath) ? sourcePath : undefined),
  };
}

function generatedArtifactEntries(request: NormalizedAssetLedgerRequest): AssetLedgerEntry[] {
  return artifactDefinitions.flatMap((definition) => {
    const path = request.artifacts[definition.field];
    if (!path) return [];

    return [
      normalizeAsset({
        assetId: definition.assetId,
        assetType: definition.assetType,
        kind: definition.kind,
        stage: definition.stage,
        path,
        provider: request.generatedDefaults.provider,
        workflow: request.generatedDefaults.workflow,
        usageMode: request.generatedDefaults.usageMode,
        reviewStatus: request.generatedDefaults.reviewStatus,
        rightsStatus: request.generatedDefaults.rightsStatus,
        licenseName: request.generatedDefaults.licenseName,
        prompt: request.generatedDefaults.topic,
        createdAt: request.createdAt,
        metadata: { source: 'asset-ledger-harness' },
        ...definition.extra,
      }),
    ];
  });
}

function mergeAssets(params: {
  existing: AssetLedgerEntry[];
  next: AssetLedgerEntry[];
  mergeStrategy: NormalizedAssetLedgerRequest['mergeStrategy'];
}): AssetLedgerEntry[] {
  if (params.mergeStrategy === 'append') return [...params.existing, ...params.next];

  const merged = new Map<string, AssetLedgerEntry>();
  [...params.existing, ...params.next].forEach((asset, index) => {
    const key =
      asset.assetId ?? `${asset.kind ?? 'asset'}:${asset.path ?? asset.localPath ?? index}`;
    merged.set(key, asset);
  });
  return [...merged.values()];
}

function assetRef(asset: AssetLedgerEntry, index: number): string {
  return asset.assetId ?? asset.localPath ?? asset.path ?? `asset-${index + 1}`;
}

function isAudioAsset(asset: AssetLedgerEntry): boolean {
  const blob = [asset.assetType, asset.kind, asset.mixRole, asset.path, asset.localPath]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return /\b(audio|music|sfx|sound|ambience|voice|voiceover)\b/.test(blob);
}

function hasLicenseEvidence(asset: AssetLedgerEntry): boolean {
  return Boolean(
    asset.licenseName ||
    asset.licenseUrl ||
    asset.licenseCertificatePath ||
    asset.permissionEvidencePath ||
    asset.evidenceFiles?.length
  );
}

function buildWarnings(assets: AssetLedgerEntry[]): string[] {
  const warnings: string[] = [];
  assets.forEach((asset, index) => {
    const ref = assetRef(asset, index);
    if (!asset.assetId) warnings.push(`${ref} is missing assetId.`);
    if (!asset.usageMode) warnings.push(`${ref} is missing usageMode.`);
    if (!asset.reviewStatus) warnings.push(`${ref} is missing reviewStatus.`);
    if (isAudioAsset(asset) && !asset.contentIdRisk) {
      warnings.push(`${ref} is audio-like but missing contentIdRisk.`);
    }
    if (asset.usageMode === 'downloaded-asset' && !hasLicenseEvidence(asset)) {
      warnings.push(`${ref} is downloaded-asset but missing license or permission evidence.`);
    }
  });
  return warnings;
}

/** Run the asset-ledger harness and write a provenance ledger JSON artifact. */
export async function runAssetLedger(request: AssetLedgerRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    assetCount: number;
    generatedCount: number;
    externalCount: number;
    needsReviewCount: number;
    audioCount: number;
  }>
> {
  const normalized = AssetLedgerRequestSchema.parse(request);
  const outputPath = resolve(normalized.outputPath);
  const existing = normalized.existingLedgerPath
    ? normalizeAssetLedgerInput(
        await readJsonArtifact(
          resolve(normalized.existingLedgerPath),
          AssetLedgerInputSchema,
          'asset ledger'
        )
      )
    : [];
  const next = [...normalized.assets.map(normalizeAsset), ...generatedArtifactEntries(normalized)];
  const assets = mergeAssets({
    existing,
    next,
    mergeStrategy: normalized.mergeStrategy,
  });
  const ledger = await buildAssetLedgerFromEntries({
    assets,
    warnings: buildWarnings(assets),
    createdAt: normalized.createdAt,
    addFileHashes: normalized.addFileHashes,
  });

  await writeJsonArtifact(outputPath, ledger);

  return {
    result: {
      outputPath,
      assetCount: ledger.summary?.assetCount ?? ledger.assets.length,
      generatedCount: ledger.summary?.generatedCount ?? 0,
      externalCount: ledger.summary?.externalCount ?? 0,
      needsReviewCount: ledger.summary?.needsReviewCount ?? 0,
      audioCount: ledger.summary?.audioCount ?? 0,
    },
    artifacts: [artifactFile(outputPath, 'Asset provenance ledger artifact')],
    warnings: ledger.warnings,
  };
}
