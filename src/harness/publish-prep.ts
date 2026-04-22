import { resolve, join } from 'node:path';
import { z } from 'zod';
import {
  PackageOutputSchema,
  PlatformEnum,
  PublishOutputSchema,
  ScoreOutputSchema,
  ScriptOutputSchema,
  ValidateReportSchema,
  type ScriptOutput,
} from '../domain';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { generatePackage } from '../package/generator';
import { generatePublish } from '../publish/generator';
import { scoreScript } from '../score/scorer';
import { validateVideoPath } from '../validate/validate';

export const PublishPrepRequestSchema = z
  .object({
    videoPath: z.string().min(1),
    scriptPath: z.string().min(1),
    outputDir: z.string().min(1).default('output/harness/publish-prep'),
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
  const script: ScriptOutput = await readJsonArtifact(
    request.scriptPath,
    ScriptOutputSchema,
    'script artifact'
  );
  const outputDir = resolve(request.outputDir);
  const validatePath = join(outputDir, 'validate.json');
  const scorePath = join(outputDir, 'score.json');
  const packagingPath = join(outputDir, 'packaging.json');
  const publishPath = join(outputDir, 'publish.json');

  let packaging;
  if (request.packaging.enabled) {
    packaging = await generatePackage({
      topic: request.packaging.topic ?? script.title ?? script.hook ?? 'Untitled short',
      platform: request.platform,
      variants: request.packaging.variants,
    });
    await writeJsonArtifact(packagingPath, PackageOutputSchema.parse(packaging));
  }

  const score = scoreScript({
    script,
    scriptPath: resolve(request.scriptPath),
    packaging,
    packagePath: packaging ? packagingPath : undefined,
  });
  await writeJsonArtifact(scorePath, ScoreOutputSchema.parse(score));

  const publish = await generatePublish({
    script,
    packaging,
    platform: request.platform,
    mode: request.publish.mode,
  });
  await writeJsonArtifact(publishPath, PublishOutputSchema.parse(publish));

  const validate = await validateVideoPath(resolve(request.videoPath), {
    profile: request.validate.profile,
    probe: { engine: 'ffprobe' },
    cadence: { enabled: false },
    quality: { enabled: false },
  });
  await writeJsonArtifact(validatePath, ValidateReportSchema.parse(validate));

  const passed = score.passed && validate.passed;
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
