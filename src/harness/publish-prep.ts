import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { z } from 'zod';
import {
  CaptionExportSchema,
  type GateResult,
  PackageOutputSchema,
  PlatformEnum,
  PublishOutputSchema,
  ScoreOutputSchema,
  ScriptOutputSchema,
  ValidateReportSchema,
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

function hasReviewBlockingFailures(report: ValidateReport): boolean {
  return report.gates.some((gate) => !gate.passed && REVIEW_BLOCKING_GATE_IDS.has(gate.gateId));
}

function inferCaptionExportPath(videoPath: string): string | null {
  const candidate = join(dirname(videoPath), 'captions.remotion.json');
  return existsSync(candidate) ? candidate : null;
}

export const PublishPrepRequestSchema = z
  .object({
    videoPath: z.string().min(1),
    scriptPath: z.string().min(1),
    captionExportPath: z.string().min(1).optional(),
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

  const passed = score.passed && validate.passed && !hasReviewBlockingFailures(validate);
  return {
    result: {
      outputDir,
      validatePath,
      scorePath,
      captionSyncPath: captionSyncArtifactPath,
      packagingPath: packaging ? packagingPath : null,
      publishPath,
      passed,
    },
    artifacts: [
      artifactFile(validatePath, 'Video validation report'),
      artifactFile(scorePath, 'Script score report'),
      artifactFile(publishPath, 'Publish metadata report'),
      ...(captionSyncArtifactPath
        ? [artifactFile(captionSyncArtifactPath, 'Rendered caption sync review artifact')]
        : []),
      ...(packaging ? [artifactFile(packagingPath, 'Packaging variants artifact')] : []),
    ],
  };
}
