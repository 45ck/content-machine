import { join, resolve } from 'node:path';
import { z } from 'zod';
import { ArchetypeEnum } from '../core/config';
import { CMError } from '../core/errors';
import { AudioOutputSchema, VisualsOutputSchema } from '../domain';
import { buildGenerateShortAssetLedger } from '../provenance';
import { generateBriefToScript } from './brief-to-script';
import { ingestReferenceVideo, IngestRequestSchema } from './ingest';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
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
    laneId: z.string().min(1).optional(),
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
type NormalizedGenerateShortRequest = z.output<typeof GenerateShortRequestSchema>;
type BriefToScriptResult = Awaited<ReturnType<typeof generateBriefToScript>>;
type ScriptToAudioResult = Awaited<ReturnType<typeof runScriptToAudio>>;
type TimestampsToVisualsResult = Awaited<ReturnType<typeof runTimestampsToVisuals>>;
type VideoRenderResult = Awaited<ReturnType<typeof runVideoRender>>;

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

async function writeGenerateShortAssetLedger(params: {
  normalized: NormalizedGenerateShortRequest;
  outputDir: string;
  effectiveArchetype?: string;
  scriptResult: BriefToScriptResult;
  audioResult: ScriptToAudioResult;
  visualsResult: TimestampsToVisualsResult;
  renderResult: VideoRenderResult;
  qualitySummaryPath: string;
}): Promise<string> {
  const {
    normalized,
    outputDir,
    effectiveArchetype,
    scriptResult,
    audioResult,
    visualsResult,
    renderResult,
    qualitySummaryPath,
  } = params;
  const assetLedgerPath = resolve(join(outputDir, 'provenance', 'asset-ledger.json'));
  const [audioMetadata, visuals] = await Promise.all([
    readJsonArtifact(audioResult.result.outputMetadataPath, AudioOutputSchema, 'audio metadata'),
    readJsonArtifact(visualsResult.result.outputPath, VisualsOutputSchema, 'visuals artifact'),
  ]);
  const assetLedger = await buildGenerateShortAssetLedger({
    topic: normalized.topic,
    archetype: effectiveArchetype ?? null,
    laneId: normalized.laneId ?? null,
    llmProvider: normalized.llmProvider,
    scriptPath: scriptResult.result.outputPath,
    audio: {
      audioPath: audioResult.result.audioPath,
      timestampsPath: audioResult.result.timestampsPath,
      outputMetadataPath: audioResult.result.outputMetadataPath,
      voice: audioResult.result.voice ?? normalized.audio.voice ?? 'unknown-voice',
      ttsEngine: audioResult.result.ttsEngine ?? 'unknown-tts',
      asrEngine: audioResult.result.asrEngine ?? 'unknown-asr',
      audioMix: audioMetadata.audioMix ?? null,
    },
    visualsPath: visualsResult.result.outputPath,
    visuals,
    render: {
      outputPath: renderResult.result.outputPath,
      outputMetadataPath: renderResult.result.outputMetadataPath,
      captionExportPath: renderResult.result.captionExportPath,
      captionSrtPath: renderResult.result.captionSrtPath,
      captionAssPath: renderResult.result.captionAssPath,
    },
    qualitySummaryPath,
  });
  await writeJsonArtifact(assetLedgerPath, assetLedger);
  return assetLedgerPath;
}

async function runPublishPrepForGenerateShort(params: {
  normalized: NormalizedGenerateShortRequest;
  outputDir: string;
  scriptPath: string;
  renderResult: VideoRenderResult;
  assetLedgerPath: string;
}): Promise<{
  publishPrepDir: string | null;
  publishReady: boolean | null;
  artifacts: HarnessArtifact[];
}> {
  const { normalized, outputDir, scriptPath, renderResult, assetLedgerPath } = params;
  if (!normalized.publishPrep.enabled) {
    return { publishPrepDir: null, publishReady: null, artifacts: [] };
  }

  const publishPrepResult = await runPublishPrep({
    platform: normalized.publishPrep.platform,
    packaging: normalized.publishPrep.packaging,
    publish: normalized.publishPrep.publish,
    validate: normalized.publishPrep.validate,
    assetLedgerPath: normalized.publishPrep.assetLedgerPath ?? assetLedgerPath,
    ...(normalized.publishPrep.mediaIndexPath
      ? { mediaIndexPath: normalized.publishPrep.mediaIndexPath }
      : {}),
    videoPath: renderResult.result.outputPath,
    captionExportPath: renderResult.result.captionExportPath ?? undefined,
    scriptPath,
    outputDir: resolve(normalized.publishPrep.outputDir ?? join(outputDir, 'publish-prep')),
  });
  const publishPrepDir = publishPrepResult.result.outputDir;
  const publishReady = publishPrepResult.result.passed;
  if (!publishReady && normalized.publishPrep.requirePass) {
    throw new CMError(
      'VALIDATION_ERROR',
      'Publish-prep review failed. Refusing to treat the generated short as ready.',
      {
        outputDir,
        publishPrepDir,
      }
    );
  }

  return {
    publishPrepDir,
    publishReady,
    artifacts: publishPrepResult.artifacts ?? [],
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
    assetLedgerPath: string;
    publishPrepDir: string | null;
    publishReady: boolean | null;
    archetype: string | null;
    referenceArchetype: string | null;
    laneId: string | null;
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

  if (normalized.laneId) {
    warnings.push(
      `Accepted laneId "${normalized.laneId}" as routing context; the current generate-short harness still maps execution through shared script, audio, visuals, render, and publish-prep stages.`
    );
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

  const assetLedgerPath = await writeGenerateShortAssetLedger({
    normalized,
    outputDir,
    effectiveArchetype,
    scriptResult,
    audioResult,
    visualsResult,
    renderResult,
    qualitySummaryPath,
  });
  artifacts.push(artifactFile(assetLedgerPath, 'Asset provenance ledger artifact'));

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

  const publishPrep = await runPublishPrepForGenerateShort({
    normalized,
    outputDir,
    scriptPath: scriptResult.result.outputPath,
    renderResult,
    assetLedgerPath,
  });
  artifacts.push(...publishPrep.artifacts);

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
      assetLedgerPath,
      publishPrepDir: publishPrep.publishPrepDir,
      publishReady: publishPrep.publishReady,
      archetype: effectiveArchetype ?? null,
      referenceArchetype,
      laneId: normalized.laneId ?? null,
    },
    artifacts: dedupeArtifacts(artifacts),
    warnings,
  };
}
