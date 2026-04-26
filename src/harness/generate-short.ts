import { join, resolve } from 'node:path';
import { z } from 'zod';
import { ArchetypeEnum } from '../core/config';
import { CMError } from '../core/errors';
import { generateBriefToScript } from './brief-to-script';
import { ingestReferenceVideo, IngestRequestSchema } from './ingest';
import { writeJsonArtifact } from './artifacts';
import {
  artifactDirectory,
  artifactFile,
  type HarnessArtifact,
  type HarnessToolResult,
} from './json-stdio';
import { PublishPrepRequestSchema, runPublishPrep } from './publish-prep';
import { runScriptToAudio, ScriptToAudioRequestSchema } from './script-to-audio';
import { runTimestampsToVisuals, TimestampsToVisualsRequestSchema } from './timestamps-to-visuals';
import { runVideoRender, VideoRenderRequestSchema } from './video-render';

const GenerateShortIngestSchema = IngestRequestSchema.omit({
  videoPath: true,
  outputDir: true,
}).default({});

const GenerateShortAudioSchema = ScriptToAudioRequestSchema.omit({
  scriptPath: true,
  outputDir: true,
  outputPath: true,
  timestampsPath: true,
  outputMetadataPath: true,
}).default({});

const GenerateShortVisualsSchema = TimestampsToVisualsRequestSchema.omit({
  timestampsPath: true,
  outputPath: true,
}).default({});

const GenerateShortRenderSchema = VideoRenderRequestSchema.omit({
  visualsPath: true,
  timestampsPath: true,
  audioPath: true,
  outputPath: true,
  outputMetadataPath: true,
})
  .extend({
    outputPath: z.string().min(1).optional(),
    outputMetadataPath: z.string().min(1).optional(),
  })
  .default({});

const GenerateShortPublishPrepSchema = PublishPrepRequestSchema.omit({
  videoPath: true,
  scriptPath: true,
  outputDir: true,
})
  .extend({
    enabled: z.boolean().default(true),
    requirePass: z.boolean().default(true),
    outputDir: z.string().min(1).optional(),
  })
  .default({});

export const GenerateShortRequestSchema = z
  .object({
    topic: z.string().min(1),
    outputDir: z.string().min(1).default('output/content-machine/generate-short'),
    archetype: ArchetypeEnum.optional(),
    targetDuration: z.number().positive().default(45),
    llmProvider: z.enum(['default', 'openai', 'anthropic', 'gemini']).default('default'),
    referenceVideoPath: z.string().min(1).optional(),
    referenceOutputDir: z.string().min(1).optional(),
    ingest: GenerateShortIngestSchema,
    audio: GenerateShortAudioSchema,
    visuals: GenerateShortVisualsSchema,
    render: GenerateShortRenderSchema,
    publishPrep: GenerateShortPublishPrepSchema,
  })
  .strict();

export type GenerateShortRequest = z.input<typeof GenerateShortRequestSchema>;

function dedupeArtifacts(artifacts: HarnessArtifact[]): HarnessArtifact[] {
  const unique = new Map<string, HarnessArtifact>();
  for (const artifact of artifacts) {
    unique.set(`${artifact.kind}:${artifact.path}`, artifact);
  }
  return [...unique.values()];
}

function collectQualitySummary(params: {
  visualQualityPath?: string | null;
  visualQualityPassed?: boolean | null;
  visualQualityScore?: number | null;
  captionExportPath?: string | null;
  captionSrtPath?: string | null;
  captionAssPath?: string | null;
  captionQualityPassed?: boolean | null;
  captionQualityScore?: number | null;
}): {
  qualityReady: boolean | null;
  visualQualityPath: string | null;
  visualQualityPassed: boolean | null;
  visualQualityScore: number | null;
  captionQualityPassed: boolean | null;
  captionQualityScore: number | null;
  captionExportPath: string | null;
  captionSrtPath: string | null;
  captionAssPath: string | null;
  summary: Record<string, unknown>;
} {
  const visualQualityPath = params.visualQualityPath ?? null;
  const visualQualityPassed = params.visualQualityPassed ?? null;
  const visualQualityScore = params.visualQualityScore ?? null;
  const captionQualityPassed = params.captionQualityPassed ?? null;
  const captionQualityScore = params.captionQualityScore ?? null;
  const captionExportPath = params.captionExportPath ?? null;
  const captionSrtPath = params.captionSrtPath ?? null;
  const captionAssPath = params.captionAssPath ?? null;
  const knownQualitySignals = [visualQualityPassed, captionQualityPassed].filter(
    (value): value is boolean => typeof value === 'boolean'
  );
  const qualityReady =
    knownQualitySignals.length > 0 ? knownQualitySignals.every((value) => value) : null;

  return {
    qualityReady,
    visualQualityPath,
    visualQualityPassed,
    visualQualityScore,
    captionQualityPassed,
    captionQualityScore,
    captionExportPath,
    captionSrtPath,
    captionAssPath,
    summary: {
      schemaVersion: '1.0.0',
      ready: qualityReady,
      visual: {
        passed: visualQualityPassed,
        score: visualQualityScore,
        artifactPath: visualQualityPath,
      },
      captions: {
        passed: captionQualityPassed,
        score: captionQualityScore,
        artifactPath: captionExportPath,
        srtPath: captionSrtPath,
        assPath: captionAssPath,
      },
      createdAt: new Date().toISOString(),
    },
  };
}

/** Run the default skills-first pipeline and return the full artifact chain. */
export async function runGenerateShort(request: GenerateShortRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    referenceOutputDir: string | null;
    scriptPath: string;
    audioPath: string;
    timestampsPath: string;
    visualsPath: string;
    visualQualityPath: string | null;
    videoPath: string;
    renderMetadataPath: string;
    qualitySummaryPath: string;
    qualityReady: boolean | null;
    visualQualityPassed: boolean | null;
    visualQualityScore: number | null;
    captionQualityPassed: boolean | null;
    captionQualityScore: number | null;
    captionExportPath: string | null;
    captionSrtPath: string | null;
    captionAssPath: string | null;
    publishPrepDir: string | null;
    publishReady: boolean | null;
    archetype: string | null;
    referenceArchetype: string | null;
  }>
> {
  const normalized = GenerateShortRequestSchema.parse(request);
  const outputDir = resolve(normalized.outputDir);
  const warnings: string[] = [];
  const artifacts: HarnessArtifact[] = [
    artifactDirectory(outputDir, 'Generate-short output directory'),
  ];

  let blueprintPath: string | undefined;
  let referenceOutputDir: string | null = null;
  let referenceArchetype: string | null = null;
  let effectiveArchetype = normalized.archetype;

  if (normalized.referenceVideoPath) {
    const ingestResult = await ingestReferenceVideo({
      ...normalized.ingest,
      videoPath: normalized.referenceVideoPath,
      outputDir: resolve(normalized.referenceOutputDir ?? join(outputDir, 'ingest')),
    });
    artifacts.push(...(ingestResult.artifacts ?? []));
    referenceOutputDir = ingestResult.result.outputDir;
    referenceArchetype = ingestResult.result.archetype;
    blueprintPath = ingestResult.result.blueprintPath ?? undefined;
    const parsedReferenceArchetype = ingestResult.result.archetype
      ? ArchetypeEnum.safeParse(ingestResult.result.archetype)
      : null;
    if (!effectiveArchetype && parsedReferenceArchetype?.success) {
      effectiveArchetype = parsedReferenceArchetype.data;
    }

    if (!blueprintPath) {
      warnings.push(
        'Reference ingest completed without a blueprint artifact; script generation continued without blueprint guidance.'
      );
    }
  }

  const scriptResult = await generateBriefToScript({
    topic: normalized.topic,
    archetype: effectiveArchetype ?? ArchetypeEnum.parse('listicle'),
    targetDuration: normalized.targetDuration,
    outputPath: join(outputDir, 'script', 'script.json'),
    blueprintPath,
    llmProvider: normalized.llmProvider,
  });
  artifacts.push(...(scriptResult.artifacts ?? []));

  const audioResult = await runScriptToAudio({
    ...normalized.audio,
    scriptPath: scriptResult.result.outputPath,
    outputDir: join(outputDir, 'audio'),
  });
  artifacts.push(...(audioResult.artifacts ?? []));

  const visualsResult = await runTimestampsToVisuals({
    ...normalized.visuals,
    timestampsPath: audioResult.result.timestampsPath,
    outputPath: join(outputDir, 'visuals', 'visuals.json'),
    topic: normalized.visuals.topic ?? normalized.topic,
  });
  artifacts.push(...(visualsResult.artifacts ?? []));

  const renderOutputPath = resolve(
    normalized.render.outputPath ?? join(outputDir, 'render', 'video.mp4')
  );
  const renderMetadataPath = resolve(
    normalized.render.outputMetadataPath ?? join(outputDir, 'render', 'render.json')
  );
  const renderResult = await runVideoRender({
    ...normalized.render,
    visualsPath: visualsResult.result.outputPath,
    timestampsPath: audioResult.result.timestampsPath,
    audioPath: audioResult.result.audioPath,
    outputPath: renderOutputPath,
    outputMetadataPath: renderMetadataPath,
  });
  artifacts.push(...(renderResult.artifacts ?? []));

  const qualitySummary = collectQualitySummary({
    visualQualityPath: visualsResult.result.visualQualityPath,
    visualQualityPassed: visualsResult.result.visualQualityPassed,
    visualQualityScore: visualsResult.result.visualQualityScore,
    captionQualityPassed: renderResult.result.captionQualityPassed,
    captionQualityScore: renderResult.result.captionQualityScore,
    captionExportPath: renderResult.result.captionExportPath,
    captionSrtPath: renderResult.result.captionSrtPath,
    captionAssPath: renderResult.result.captionAssPath,
  });
  const qualitySummaryPath = resolve(join(outputDir, 'quality-summary.json'));
  await writeJsonArtifact(qualitySummaryPath, qualitySummary.summary);
  artifacts.push(artifactFile(qualitySummaryPath, 'Generate-short quality summary artifact'));

  if (
    normalized.publishPrep.enabled &&
    normalized.publishPrep.requirePass &&
    qualitySummary.qualityReady === false
  ) {
    throw new CMError(
      'VALIDATION_ERROR',
      'Visual or caption quality checks failed. Refusing to treat the generated short as ready.',
      {
        outputDir,
        qualitySummaryPath,
      }
    );
  }

  let publishPrepDir: string | null = null;
  let publishReady: boolean | null = null;
  if (normalized.publishPrep.enabled) {
    const publishPrepResult = await runPublishPrep({
      platform: normalized.publishPrep.platform,
      packaging: normalized.publishPrep.packaging,
      publish: normalized.publishPrep.publish,
      validate: normalized.publishPrep.validate,
      videoPath: renderResult.result.outputPath,
      scriptPath: scriptResult.result.outputPath,
      outputDir: resolve(normalized.publishPrep.outputDir ?? join(outputDir, 'publish-prep')),
    });
    artifacts.push(...(publishPrepResult.artifacts ?? []));
    publishPrepDir = publishPrepResult.result.outputDir;
    publishReady = publishPrepResult.result.passed;
    if (!publishPrepResult.result.passed && normalized.publishPrep.requirePass) {
      throw new CMError(
        'VALIDATION_ERROR',
        'Publish-prep review failed. Refusing to treat the generated short as ready.',
        {
          outputDir,
          publishPrepDir,
        }
      );
    }
  }

  return {
    result: {
      outputDir,
      referenceOutputDir,
      scriptPath: scriptResult.result.outputPath,
      audioPath: audioResult.result.audioPath,
      timestampsPath: audioResult.result.timestampsPath,
      visualsPath: visualsResult.result.outputPath,
      visualQualityPath: qualitySummary.visualQualityPath,
      videoPath: renderResult.result.outputPath,
      renderMetadataPath: renderResult.result.outputMetadataPath,
      qualitySummaryPath,
      qualityReady: qualitySummary.qualityReady,
      visualQualityPassed: qualitySummary.visualQualityPassed,
      visualQualityScore: qualitySummary.visualQualityScore,
      captionQualityPassed: qualitySummary.captionQualityPassed,
      captionQualityScore: qualitySummary.captionQualityScore,
      captionExportPath: qualitySummary.captionExportPath,
      captionSrtPath: qualitySummary.captionSrtPath,
      captionAssPath: qualitySummary.captionAssPath,
      publishPrepDir,
      publishReady,
      archetype: effectiveArchetype ?? null,
      referenceArchetype,
    },
    artifacts: dedupeArtifacts(artifacts),
    warnings,
  };
}
