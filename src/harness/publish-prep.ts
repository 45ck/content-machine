import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { z } from 'zod';
import {
  AssetLedgerInputSchema,
  CaptionExportSchema,
  type GateResult,
  MediaIndexSchema,
  PackageOutputSchema,
  PlatformEnum,
  PublishOutputSchema,
  ScoreOutputSchema,
  ScriptOutputSchema,
  ValidateReportSchema,
  type AssetLedgerInput,
  type MediaIndex,
  type MediaIndexItem,
  type ScriptOutput,
  type ValidateReport,
} from '../domain';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { generatePackage } from '../package/generator';
import { generatePublish } from '../publish/generator';
import { scoreScript } from '../score/scorer';
import { analyzeRenderedCaptionSync, runCaptionSyncGate } from '../validate/caption-sync';
import { validateVideoPath } from '../validate/validate';

// cspell:ignore unreviewed youtu

const REVIEW_BLOCKING_GATE_IDS = new Set<GateResult['gateId']>([
  'resolution',
  'duration',
  'format',
  'cadence',
  'visual-quality',
  'temporal-quality',
  'audio-signal',
  'freeze',
  'flow-consistency',
  'caption-sync',
]);

type ProvenanceSeverity = 'error' | 'warning';
type ProvenanceCheck = {
  checkId: string;
  passed: boolean;
  severity: ProvenanceSeverity;
  assetRef: string;
  message: string;
  fix: string;
  details?: Record<string, unknown>;
};
type ProvenanceReview = {
  schemaVersion: '1.0.0';
  passed: boolean;
  summary: {
    assetLedgerPath: string | null;
    mediaIndexPath: string | null;
    assetCount: number;
    errorCount: number;
    warningCount: number;
  };
  checks: ProvenanceCheck[];
  createdAt: string;
};

const PASSING_REVIEW_STATUSES = new Set([
  'approved',
  'verified',
  'cleared',
  'pass',
  'passed',
  'documented',
  'documented-local',
  'licensed',
  'permissioned',
  'owned',
  'owned-or-permissioned',
  'generated',
  'generated-local',
]);

const FAILING_REVIEW_STATUSES = new Set([
  'rejected',
  'blocked',
  'reference-only',
  'inspiration-only',
  'needs-review',
  'unknown',
  'unclear',
  'unreviewed',
  'pending',
  'todo',
]);

const PASSING_CONTENT_ID_STATUSES = new Set([
  'none',
  'none-known',
  'no-known-risk',
  'low',
  'cleared',
  'licensed',
  'permissioned',
  'owned',
  'not-applicable',
  'n/a',
]);

const FAILING_CONTENT_ID_STATUSES = new Set([
  'unknown',
  'unclear',
  'unreviewed',
  'needs-review',
  'likely',
  'high',
  'claim-risk',
  'claimed',
  'blocked',
]);

const PROHIBITED_RIGHTS_FLAGS = [
  'editorial-only',
  'non-commercial',
  'no-derivatives',
  'watermark',
  'watermarked',
  'scraper-only',
  'unlicensed',
  'copyright-unclear',
  'rights-unclear',
];

function hasReviewBlockingFailures(report: ValidateReport): boolean {
  return report.gates.some((gate) => !gate.passed && REVIEW_BLOCKING_GATE_IDS.has(gate.gateId));
}

function inferCaptionExportPath(videoPath: string): string | null {
  const candidate = join(dirname(videoPath), 'captions.remotion.json');
  return existsSync(candidate) ? candidate : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(asset: Record<string, unknown>, key: string): string | null {
  const value = asset[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(asset: Record<string, unknown>, key: string): boolean {
  return asset[key] === true;
}

function statusValue(asset: Record<string, unknown>, key: string): string | null {
  return textValue(asset, key)?.toLowerCase() ?? null;
}

function nonEmptyStringList(asset: Record<string, unknown>, key: string): string[] {
  const value = asset[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function rightsFlags(asset: Record<string, unknown>): string[] {
  const value = asset.rightsFlags;
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.toLowerCase());
  }

  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record)
    .filter(([, flagValue]) => flagValue === true || flagValue === 'true' || flagValue === 'yes')
    .map(([key]) => key.toLowerCase());
}

function textBlob(asset: Record<string, unknown>, keys: string[]): string {
  return keys
    .map((key) => textValue(asset, key) ?? '')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function assetRef(asset: Record<string, unknown>, fallback: string): string {
  return (
    textValue(asset, 'assetId') ??
    textValue(asset, 'localPath') ??
    textValue(asset, 'path') ??
    textValue(asset, 'sourceUrl') ??
    fallback
  );
}

function hasAnyText(asset: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => Boolean(textValue(asset, key)));
}

function hasLicenseEvidence(asset: Record<string, unknown>): boolean {
  return (
    hasAnyText(asset, [
      'licenseName',
      'licenseUrl',
      'licenseCertificatePath',
      'permissionEvidencePath',
    ]) || nonEmptyStringList(asset, 'evidenceFiles').length > 0
  );
}

function addProvenanceCheck(
  checks: ProvenanceCheck[],
  params: {
    checkId: string;
    passed: boolean;
    severity?: ProvenanceSeverity;
    assetRef: string;
    message: string;
    fix: string;
    details?: Record<string, unknown>;
  }
): void {
  checks.push({
    checkId: params.checkId,
    passed: params.passed,
    severity: params.severity ?? 'error',
    assetRef: params.assetRef,
    message: params.message,
    fix: params.fix,
    ...(params.details ? { details: params.details } : {}),
  });
}

function assessStatus(
  checks: ProvenanceCheck[],
  asset: Record<string, unknown>,
  ref: string,
  field: 'reviewStatus' | 'licenseStatus' | 'rightsStatus'
): void {
  const status = statusValue(asset, field);
  if (!status) {
    addProvenanceCheck(checks, {
      checkId: `${field}-present`,
      passed: false,
      assetRef: ref,
      message: `${field} is missing.`,
      fix: `Add ${field}: approved, verified, owned, licensed, permissioned, or generated-local after reviewing the asset evidence.`,
    });
    return;
  }

  const passed = PASSING_REVIEW_STATUSES.has(status) && !FAILING_REVIEW_STATUSES.has(status);
  addProvenanceCheck(checks, {
    checkId: `${field}-approved`,
    passed,
    assetRef: ref,
    message: passed ? `${field} is ${status}.` : `${field} is not publish-ready: ${status}.`,
    fix: passed
      ? 'No fix required.'
      : `Resolve the asset evidence and update ${field}, or replace the asset before publish review.`,
    details: { status },
  });
}

function isAudioAsset(asset: Record<string, unknown>): boolean {
  const blob = textBlob(asset, [
    'assetType',
    'kind',
    'type',
    'mixRole',
    'platformSource',
    'usageMode',
    'path',
    'localPath',
  ]);
  return /\b(audio|music|sfx|sound|ambience|ambient|voice|voiceover|extracted-audio)\b/.test(blob);
}

function isGeneratedAsset(asset: Record<string, unknown>): boolean {
  const usageMode = statusValue(asset, 'usageMode');
  return (
    usageMode === 'generated-asset' ||
    usageMode === 'generated' ||
    hasAnyText(asset, ['model', 'prompt', 'jobId', 'workflow', 'outputHash'])
  );
}

function isExternalAsset(asset: Record<string, unknown>): boolean {
  const usageMode = statusValue(asset, 'usageMode');
  return (
    usageMode === 'downloaded-asset' ||
    usageMode === 'external' ||
    usageMode === 'stock' ||
    usageMode === 'reference-provider' ||
    usageMode === 'youtube-download' ||
    usageMode === 'extracted-audio' ||
    hasAnyText(asset, ['sourceUrl', 'originalVideoUrl'])
  );
}

function isReferenceOnly(asset: Record<string, unknown>): boolean {
  const usageMode = statusValue(asset, 'usageMode');
  return usageMode === 'reference-only' || usageMode === 'inspiration-only';
}

function isYouTubeOrigin(asset: Record<string, unknown>): boolean {
  const sourceText = textBlob(asset, [
    'sourceUrl',
    'originalVideoUrl',
    'platformSource',
    'provider',
  ]);
  return (
    sourceText.includes('youtube.com') ||
    sourceText.includes('youtu.be') ||
    sourceText.includes('youtube')
  );
}

function assessContentIdRisk(
  checks: ProvenanceCheck[],
  asset: Record<string, unknown>,
  ref: string
): void {
  if (!isAudioAsset(asset)) return;

  const risk = statusValue(asset, 'contentIdRisk');
  if (!risk) {
    addProvenanceCheck(checks, {
      checkId: 'content-id-risk-present',
      passed: false,
      assetRef: ref,
      message: 'Audio asset is missing contentIdRisk.',
      fix: 'Add a Content ID risk note such as none-known, low, cleared, licensed, owned, or permissioned.',
    });
    return;
  }

  const passed = PASSING_CONTENT_ID_STATUSES.has(risk);
  const knownFail = FAILING_CONTENT_ID_STATUSES.has(risk);
  addProvenanceCheck(checks, {
    checkId: 'content-id-risk-cleared',
    passed,
    severity: knownFail ? 'error' : 'warning',
    assetRef: ref,
    message: passed ? `Content ID risk is ${risk}.` : `Content ID risk needs review: ${risk}.`,
    fix: passed
      ? 'No fix required.'
      : 'Replace the audio, add permission/license evidence, or mark the Content ID risk as cleared before public publish.',
    details: { contentIdRisk: risk },
  });
}

function assessAssetProvenance(
  asset: Record<string, unknown>,
  fallbackRef: string
): ProvenanceCheck[] {
  const checks: ProvenanceCheck[] = [];
  const ref = assetRef(asset, fallbackRef);
  const flags = rightsFlags(asset);
  const prohibitedFlags = flags.filter((flag) =>
    PROHIBITED_RIGHTS_FLAGS.some((blocked) => flag.includes(blocked))
  );

  assessStatus(checks, asset, ref, 'reviewStatus');

  if (textValue(asset, 'licenseStatus')) assessStatus(checks, asset, ref, 'licenseStatus');
  if (textValue(asset, 'rightsStatus')) assessStatus(checks, asset, ref, 'rightsStatus');

  addProvenanceCheck(checks, {
    checkId: 'usage-mode-publishable',
    passed: !isReferenceOnly(asset),
    assetRef: ref,
    message: isReferenceOnly(asset)
      ? 'Asset is marked reference-only or inspiration-only.'
      : 'Asset usage mode is not reference-only.',
    fix: isReferenceOnly(asset)
      ? 'Use this source only as creative reference, or replace it with a publishable owned/licensed/generated asset.'
      : 'No fix required.',
  });

  addProvenanceCheck(checks, {
    checkId: 'rights-flags-allowed',
    passed: prohibitedFlags.length === 0,
    assetRef: ref,
    message:
      prohibitedFlags.length === 0
        ? 'No prohibited rights flags are present.'
        : `Prohibited rights flags are present: ${prohibitedFlags.join(', ')}.`,
    fix:
      prohibitedFlags.length === 0
        ? 'No fix required.'
        : 'Replace the asset or provide new rights evidence that removes the prohibited flag before publishing.',
    details: { rightsFlags: flags },
  });

  if (isExternalAsset(asset)) {
    addProvenanceCheck(checks, {
      checkId: 'external-source-evidence',
      passed: hasAnyText(asset, ['sourceUrl', 'originalVideoUrl', 'provider']),
      assetRef: ref,
      message: hasAnyText(asset, ['sourceUrl', 'originalVideoUrl', 'provider'])
        ? 'External asset source evidence is present.'
        : 'External asset source evidence is missing.',
      fix: 'Add sourceUrl, originalVideoUrl, or provider evidence for the external asset.',
    });
    addProvenanceCheck(checks, {
      checkId: 'external-license-evidence',
      passed: hasLicenseEvidence(asset),
      assetRef: ref,
      message: hasLicenseEvidence(asset)
        ? 'External asset license or permission evidence is present.'
        : 'External asset license or permission evidence is missing.',
      fix: 'Add licenseName/licenseUrl, a license certificate, permission evidence, or evidenceFiles.',
    });
  }

  const attributionNeeded =
    boolValue(asset, 'attributionRequired') ||
    flags.some((flag) => flag.includes('attribution')) ||
    (textValue(asset, 'licenseName')?.toLowerCase().includes('cc by') ?? false);
  if (attributionNeeded) {
    addProvenanceCheck(checks, {
      checkId: 'attribution-present',
      passed: hasAnyText(asset, ['attributionText', 'attributionPlacement']),
      assetRef: ref,
      message: hasAnyText(asset, ['attributionText', 'attributionPlacement'])
        ? 'Required attribution is documented.'
        : 'Attribution appears required but is missing.',
      fix: 'Add attributionText or attributionPlacement before publishing.',
    });
  }

  if (isYouTubeOrigin(asset)) {
    addProvenanceCheck(checks, {
      checkId: 'youtube-audio-permission',
      passed: hasLicenseEvidence(asset) || hasAnyText(asset, ['permissionEvidencePath']),
      assetRef: ref,
      message:
        hasLicenseEvidence(asset) || hasAnyText(asset, ['permissionEvidencePath'])
          ? 'YouTube-origin asset has license or permission evidence.'
          : 'YouTube-origin asset lacks license or permission evidence.',
      fix: 'Record explicit permission, official download/export evidence, or compatible license evidence before using YouTube-origin media.',
    });
  }

  if (isGeneratedAsset(asset)) {
    addProvenanceCheck(checks, {
      checkId: 'generated-provider-present',
      passed: hasAnyText(asset, ['provider', 'model', 'workflow']),
      assetRef: ref,
      message: hasAnyText(asset, ['provider', 'model', 'workflow'])
        ? 'Generated asset provider/model evidence is present.'
        : 'Generated asset provider/model evidence is missing.',
      fix: 'Add provider plus model or workflow details for generated media.',
    });
    addProvenanceCheck(checks, {
      checkId: 'generated-prompt-trace-present',
      passed: hasAnyText(asset, ['prompt', 'jobId', 'outputHash', 'fileHash']),
      assetRef: ref,
      message: hasAnyText(asset, ['prompt', 'jobId', 'outputHash', 'fileHash'])
        ? 'Generated asset prompt/job/hash trace is present.'
        : 'Generated asset prompt/job/hash trace is missing.',
      fix: 'Add prompt/reference, job id, workflow URL, output hash, or file hash for generated media.',
    });
  }

  assessContentIdRisk(checks, asset, ref);

  return checks;
}

function normalizeAssetLedgerItems(ledger: AssetLedgerInput): Record<string, unknown>[] {
  const ledgerRecord = asRecord(ledger);
  const items: unknown[] = Array.isArray(ledger)
    ? ledger
    : Array.isArray(ledgerRecord?.assets)
      ? ledgerRecord.assets
      : Array.isArray(ledgerRecord?.items)
        ? ledgerRecord.items
        : [];
  return items.map((item) => ({ ...(asRecord(item) ?? {}) }));
}

function mediaIndexAsset(item: MediaIndexItem): Record<string, unknown> {
  const provenance = asRecord(item.metadata.provenance);
  const audioSource = asRecord(item.metadata.audioSource);
  const flatMetadata = Object.fromEntries(
    Object.entries(item.metadata).filter(([, value]) => typeof value !== 'object' || value === null)
  );

  return {
    ...flatMetadata,
    ...(provenance ?? {}),
    ...(audioSource ?? {}),
    assetId: item.path,
    assetType: item.type,
    type: item.type,
    path: item.path,
    localPath: item.path,
  };
}

function mediaIndexHasProvenance(item: MediaIndexItem): boolean {
  return Boolean(asRecord(item.metadata.provenance) || asRecord(item.metadata.audioSource));
}

async function runProvenanceReview(params: {
  assetLedgerPath?: string;
  mediaIndexPath?: string;
  outputDir: string;
}): Promise<{ path: string; review: ProvenanceReview } | null> {
  if (!params.assetLedgerPath && !params.mediaIndexPath) return null;

  const checks: ProvenanceCheck[] = [];
  const assets: Record<string, unknown>[] = [];
  const resolvedAssetLedgerPath = params.assetLedgerPath ? resolve(params.assetLedgerPath) : null;
  const resolvedMediaIndexPath = params.mediaIndexPath ? resolve(params.mediaIndexPath) : null;

  if (resolvedAssetLedgerPath) {
    const ledger = await readJsonArtifact(
      resolvedAssetLedgerPath,
      AssetLedgerInputSchema,
      'asset ledger artifact'
    );
    assets.push(...normalizeAssetLedgerItems(ledger));
  }

  if (resolvedMediaIndexPath) {
    const mediaIndex: MediaIndex = await readJsonArtifact(
      resolvedMediaIndexPath,
      MediaIndexSchema,
      'media index artifact'
    );
    for (const item of mediaIndex.items) {
      if (!mediaIndexHasProvenance(item)) {
        addProvenanceCheck(checks, {
          checkId: 'media-index-provenance-present',
          passed: false,
          assetRef: item.path,
          message: 'Media index item is missing metadata.provenance or metadata.audioSource.',
          fix: 'Add provenance metadata to the media index item before publish review.',
        });
      }
      assets.push(mediaIndexAsset(item));
    }
  }

  if (assets.length === 0) {
    addProvenanceCheck(checks, {
      checkId: 'provenance-assets-present',
      passed: false,
      assetRef: resolvedAssetLedgerPath ?? resolvedMediaIndexPath ?? 'provenance',
      message: 'No assets were found in the provided provenance inputs.',
      fix: 'Add asset entries or remove the empty provenance path from publish-prep.',
    });
  }

  assets.forEach((asset, index) => {
    checks.push(...assessAssetProvenance(asset, `asset-${index + 1}`));
  });

  const errorCount = checks.filter((check) => !check.passed && check.severity === 'error').length;
  const warningCount = checks.filter(
    (check) => !check.passed && check.severity === 'warning'
  ).length;
  const review: ProvenanceReview = {
    schemaVersion: '1.0.0',
    passed: errorCount === 0,
    summary: {
      assetLedgerPath: resolvedAssetLedgerPath,
      mediaIndexPath: resolvedMediaIndexPath,
      assetCount: assets.length,
      errorCount,
      warningCount,
    },
    checks,
    createdAt: new Date().toISOString(),
  };
  const provenancePath = join(params.outputDir, 'provenance.json');
  await writeJsonArtifact(provenancePath, review);
  return { path: provenancePath, review };
}

export const PublishPrepRequestSchema = z
  .object({
    videoPath: z.string().min(1),
    scriptPath: z.string().min(1),
    captionExportPath: z.string().min(1).optional(),
    assetLedgerPath: z.string().min(1).optional(),
    mediaIndexPath: z.string().min(1).optional(),
    outputDir: z.string().min(1).default('output/content-machine/publish-prep'),
    platform: PlatformEnum.default('tiktok'),
    packaging: z
      .object({
        enabled: z.boolean().default(false),
        topic: z.string().min(1).optional(),
        variants: z.number().int().min(1).max(10).default(5),
      })
      .default({}),
    publish: z
      .object({
        mode: z.enum(['deterministic', 'llm']).default('deterministic'),
      })
      .default({}),
    validate: z
      .object({
        profile: z.enum(['portrait', 'landscape']).default('portrait'),
        cadence: z.boolean().default(true),
        quality: z.boolean().default(false),
        temporal: z.boolean().default(false),
        audioSignal: z.boolean().default(true),
        freeze: z.boolean().default(false),
        flowConsistency: z.boolean().default(false),
        captionSync: z.boolean().default(true),
      })
      .default({}),
  })
  .strict();

export type PublishPrepRequest = z.infer<typeof PublishPrepRequestSchema>;

/** Build the publish-prep artifact bundle for a rendered short. */
export async function runPublishPrep(request: PublishPrepRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    validatePath: string;
    scorePath: string;
    captionSyncPath: string | null;
    packagingPath: string | null;
    publishPath: string;
    provenancePath: string | null;
    provenancePassed: boolean | null;
    passed: boolean;
  }>
> {
  const normalized = PublishPrepRequestSchema.parse(request);
  const script: ScriptOutput = await readJsonArtifact(
    normalized.scriptPath,
    ScriptOutputSchema,
    'script artifact'
  );
  const outputDir = resolve(normalized.outputDir);
  const validatePath = join(outputDir, 'validate.json');
  const scorePath = join(outputDir, 'score.json');
  const captionSyncPath = join(outputDir, 'caption-sync.json');
  const packagingPath = join(outputDir, 'packaging.json');
  const publishPath = join(outputDir, 'publish.json');

  let packaging;
  if (normalized.packaging.enabled) {
    packaging = await generatePackage({
      topic: normalized.packaging.topic ?? script.title ?? script.hook ?? 'Untitled short',
      platform: normalized.platform,
      variants: normalized.packaging.variants,
    });
    await writeJsonArtifact(packagingPath, PackageOutputSchema.parse(packaging));
  }

  const score = scoreScript({
    script,
    scriptPath: resolve(normalized.scriptPath),
    packaging,
    packagePath: packaging ? packagingPath : undefined,
  });
  await writeJsonArtifact(scorePath, ScoreOutputSchema.parse(score));

  const publish = await generatePublish({
    script,
    packaging,
    platform: normalized.platform,
    mode: normalized.publish.mode,
  });
  await writeJsonArtifact(publishPath, PublishOutputSchema.parse(publish));

  const validate = await validateVideoPath(resolve(normalized.videoPath), {
    profile: normalized.validate.profile,
    probe: { engine: 'ffprobe' },
    cadence: { enabled: normalized.validate.cadence },
    quality: { enabled: normalized.validate.quality },
    temporal: { enabled: normalized.validate.temporal },
    audioSignal: { enabled: normalized.validate.audioSignal },
    freeze: { enabled: normalized.validate.freeze },
    flowConsistency: { enabled: normalized.validate.flowConsistency },
  });
  let captionSyncArtifactPath: string | null = null;
  if (normalized.validate.captionSync) {
    const resolvedCaptionExportPath = normalized.captionExportPath
      ? resolve(normalized.captionExportPath)
      : inferCaptionExportPath(resolve(normalized.videoPath));

    if (resolvedCaptionExportPath) {
      const captionExport = await readJsonArtifact(
        resolvedCaptionExportPath,
        CaptionExportSchema,
        'caption export artifact'
      );
      const captionSyncReport = await analyzeRenderedCaptionSync({
        videoPath: resolve(normalized.videoPath),
        expected: captionExport,
      });
      validate.gates.push(runCaptionSyncGate(captionSyncReport));
      captionSyncArtifactPath = await writeJsonArtifact(captionSyncPath, captionSyncReport);
    } else {
      validate.gates.push({
        gateId: 'caption-sync',
        passed: false,
        severity: 'error',
        fix: 'Render captions to captions.remotion.json next to the final MP4, or pass captionExportPath into publish-prep so review can verify rendered caption sync automatically.',
        message:
          'Caption sync could not be verified automatically because the caption export artifact was missing.',
        details: {
          expectedSegmentCount: 0,
          observedSegmentCount: 0,
          matchedSegmentCount: 0,
          segmentMatchRatio: 0,
          durationMatchRatio: 0,
          medianStartDriftMs: 0,
          p95StartDriftMs: 0,
          maxStartDriftMs: 0,
          coverageRatio: 0,
          captionQualityScore: 0,
          meanConfidence: 0,
          minSegmentMatchRatio: 0,
          minDurationMatchRatio: 0,
          maxMedianStartDriftMs: 0,
          maxP95StartDriftMs: 0,
        },
      });
    }
  }
  validate.passed = validate.gates.every((gate) => gate.passed || gate.severity !== 'error');
  await writeJsonArtifact(validatePath, ValidateReportSchema.parse(validate));

  const provenanceReview = await runProvenanceReview({
    assetLedgerPath: normalized.assetLedgerPath,
    mediaIndexPath: normalized.mediaIndexPath,
    outputDir,
  });

  const passed =
    score.passed &&
    validate.passed &&
    !hasReviewBlockingFailures(validate) &&
    (provenanceReview?.review.passed ?? true);
  return {
    result: {
      outputDir,
      validatePath,
      scorePath,
      captionSyncPath: captionSyncArtifactPath,
      packagingPath: packaging ? packagingPath : null,
      publishPath,
      provenancePath: provenanceReview?.path ?? null,
      provenancePassed: provenanceReview?.review.passed ?? null,
      passed,
    },
    artifacts: [
      artifactFile(validatePath, 'Video validation report'),
      artifactFile(scorePath, 'Script score report'),
      artifactFile(publishPath, 'Publish metadata report'),
      ...(provenanceReview
        ? [artifactFile(provenanceReview.path, 'Rights and asset provenance review artifact')]
        : []),
      ...(captionSyncArtifactPath
        ? [artifactFile(captionSyncArtifactPath, 'Rendered caption sync review artifact')]
        : []),
      ...(packaging ? [artifactFile(packagingPath, 'Packaging variants artifact')] : []),
    ],
  };
}
