import { resolve, join } from 'node:path';
import { z } from 'zod';
import {
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
]);

function hasReviewBlockingFailures(report: ValidateReport): boolean {
  return report.gates.some((gate) => !gate.passed && REVIEW_BLOCKING_GATE_IDS.has(gate.gateId));
}

export const PublishPrepRequestSchema = z
  .object({
    videoPath: z.string().min(1),
    scriptPath: z.string().min(1),
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
  await writeJsonArtifact(validatePath, ValidateReportSchema.parse(validate));

  const passed = score.passed && validate.passed && !hasReviewBlockingFailures(validate);
  return {
    result: {
      outputDir,
      validatePath,
      scorePath,
      packagingPath: packaging ? packagingPath : null,
      publishPath,
      passed,
    },
    artifacts: [
      artifactFile(validatePath, 'Video validation report'),
      artifactFile(scorePath, 'Script score report'),
      artifactFile(publishPath, 'Publish metadata report'),
      ...(packaging ? [artifactFile(packagingPath, 'Packaging variants artifact')] : []),
    ],
  };
}
