import { join, resolve } from 'node:path';
import { z } from 'zod';
import { ArchetypeEnum } from '../core/config';
import { generateBriefToScript } from './brief-to-script';
import { ingestReferenceVideo, IngestRequestSchema } from './ingest';
import { artifactDirectory, type HarnessArtifact, type HarnessToolResult } from './json-stdio';
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
    outputDir: z.string().min(1).optional(),
  })
  .default({});

export const GenerateShortRequestSchema = z
  .object({
    topic: z.string().min(1),
    outputDir: z.string().min(1).default('output/harness/generate-short'),
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

/** Run the default skills-first pipeline and return the full artifact chain. */
export async function runGenerateShort(request: GenerateShortRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    referenceOutputDir: string | null;
    scriptPath: string;
    audioPath: string;
    timestampsPath: string;
    visualsPath: string;
    videoPath: string;
    renderMetadataPath: string;
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
  }

  return {
    result: {
      outputDir,
      referenceOutputDir,
      scriptPath: scriptResult.result.outputPath,
      audioPath: audioResult.result.audioPath,
      timestampsPath: audioResult.result.timestampsPath,
      visualsPath: visualsResult.result.outputPath,
      videoPath: renderResult.result.outputPath,
      renderMetadataPath: renderResult.result.outputMetadataPath,
      publishPrepDir,
      publishReady,
      archetype: effectiveArchetype ?? null,
      referenceArchetype,
    },
    artifacts: dedupeArtifacts(artifacts),
    warnings,
  };
}
