import { resolve, join } from 'node:path';
import { z } from 'zod';
import { loadConfig } from '../core/config';
import { createLLMProvider } from '../core/llm';
import { analyzeVideoFrames } from '../analysis/frame-analysis';
import {
  type NarrativeMode,
  type VideoSpecPass,
  analyzeVideoToVideoSpecV1,
  resolveVideoInput,
} from '../videospec';
import { classifyVideoSpec } from '../videointel/classify';
import { extractBlueprint } from '../videointel/blueprint';
import { writeJsonArtifact } from './artifacts';
import { artifactDirectory, artifactFile, type HarnessToolResult } from './json-stdio';

const NarrativeModeSchema = z.enum(['off', 'heuristic', 'llm']);
const VideoSpecPassSchema = z.enum(['1', '2', 'both']);

export const IngestRequestSchema = z
  .object({
    videoPath: z.string().min(1),
    outputDir: z.string().min(1).default('output/content-machine/ingest'),
    includeFrameAnalysis: z.boolean().default(true),
    frameAnalysis: z
      .object({
        mode: z.enum(['fps', 'shots', 'both']).default('both'),
        fps: z.number().positive().max(1).default(1),
        shots: z.number().int().positive().default(30),
        segments: z.number().int().positive().default(5),
      })
      .default({}),
    videospec: z
      .object({
        pass: VideoSpecPassSchema.default('1'),
        narrative: NarrativeModeSchema.default('heuristic'),
        cache: z.boolean().default(true),
        cacheDir: z.string().min(1).optional(),
        maxSeconds: z.number().positive().optional(),
        shotDetector: z.enum(['auto', 'pyscenedetect', 'ffmpeg']).default('auto'),
        shotThreshold: z.number().positive().optional(),
        ffThreshold: z.number().positive().optional(),
        ocr: z.boolean().default(true),
        ocrFps: z.number().positive().optional(),
        insertedContent: z.boolean().default(true),
        asr: z.boolean().default(true),
        asrModel: z.enum(['tiny', 'base', 'small', 'medium', 'large']).default('base'),
      })
      .default({}),
    classify: z
      .object({
        enabled: z.boolean().default(true),
        mode: z.enum(['heuristic', 'llm']).default('heuristic'),
      })
      .default({}),
    blueprint: z
      .object({
        enabled: z.boolean().default(true),
      })
      .default({}),
  })
  .strict();

export type IngestRequest = z.infer<typeof IngestRequestSchema>;

function buildOutputPaths(outputDir: string) {
  return {
    videospecPath: join(outputDir, 'videospec.v1.json'),
    themePath: join(outputDir, 'theme.v1.json'),
    blueprintPath: join(outputDir, 'blueprint.v1.json'),
    frameAnalysisDir: join(outputDir, 'frame-analysis'),
  };
}

/** Reverse-engineer a reference video into reusable analysis artifacts. */
export async function ingestReferenceVideo(request: IngestRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    videospecPath: string;
    themePath: string | null;
    blueprintPath: string | null;
    frameAnalysisManifestPath: string | null;
    shots: number;
    archetype: string | null;
  }>
> {
  const requestedOutputDir = resolve(request.outputDir);
  const paths = buildOutputPaths(requestedOutputDir);
  const resolvedVideo = await resolveVideoInput({
    input: request.videoPath,
    cache: request.videospec.cache,
    cacheDir: request.videospec.cacheDir,
  });

  try {
    const specResult = await analyzeVideoToVideoSpecV1({
      inputPath: resolvedVideo.inputPath,
      inputSource: resolvedVideo.inputSource,
      provenanceSeed: resolvedVideo.provenanceSeed,
      outputPath: paths.videospecPath,
      pass: request.videospec.pass as VideoSpecPass,
      cache: request.videospec.cache,
      cacheDir: request.videospec.cacheDir,
      maxSeconds: request.videospec.maxSeconds,
      shotDetector: request.videospec.shotDetector,
      shotThreshold: request.videospec.shotThreshold,
      ffThreshold: request.videospec.ffThreshold,
      ocr: request.videospec.ocr,
      ocrFps: request.videospec.ocrFps,
      insertedContent: request.videospec.insertedContent,
      asr: request.videospec.asr,
      asrModel: request.videospec.asrModel,
      narrative: request.videospec.narrative as NarrativeMode,
    });

    let frameAnalysisManifestPath: string | null = null;
    if (request.includeFrameAnalysis) {
      const frameAnalysis = await analyzeVideoFrames({
        inputVideo: resolvedVideo.inputPath,
        outputRootDir: paths.frameAnalysisDir,
        mode: request.frameAnalysis.mode,
        fps: request.frameAnalysis.fps,
        shots: request.frameAnalysis.shots,
        segments: request.frameAnalysis.segments,
      });
      frameAnalysisManifestPath = frameAnalysis.manifestPath;
    }

    let themePath: string | null = null;
    let archetype: string | null = null;
    let theme;
    if (request.classify.enabled) {
      let llmProvider;
      if (request.classify.mode === 'llm') {
        const config = await loadConfig();
        llmProvider = createLLMProvider(config.llm.provider, config.llm.model);
      }
      theme = await classifyVideoSpec(specResult.spec, {
        mode: request.classify.mode,
        llmProvider,
        sourceVideospecPath: paths.videospecPath,
      });
      themePath = await writeJsonArtifact(paths.themePath, theme);
      archetype = theme.archetype;
    }

    let blueprintPath: string | null = null;
    if (request.blueprint.enabled) {
      const themeForBlueprint =
        theme ??
        (await classifyVideoSpec(specResult.spec, {
          mode: 'heuristic',
          sourceVideospecPath: paths.videospecPath,
        }));
      const blueprint = extractBlueprint(specResult.spec, themeForBlueprint, {
        sourceVideospecPath: paths.videospecPath,
        sourceThemePath: themePath ?? '(inline heuristic)',
      });
      blueprintPath = await writeJsonArtifact(paths.blueprintPath, blueprint);
    }

    const artifacts = [
      artifactDirectory(requestedOutputDir, 'Ingest output directory'),
      artifactFile(paths.videospecPath, 'VideoSpec reverse-engineering artifact'),
    ];
    if (themePath) artifacts.push(artifactFile(themePath, 'VideoTheme classification artifact'));
    if (blueprintPath) {
      artifacts.push(artifactFile(blueprintPath, 'VideoBlueprint artifact'));
    }
    if (frameAnalysisManifestPath) {
      artifacts.push(artifactFile(frameAnalysisManifestPath, 'Frame analysis manifest'));
    }

    return {
      result: {
        outputDir: requestedOutputDir,
        videospecPath: paths.videospecPath,
        themePath,
        blueprintPath,
        frameAnalysisManifestPath,
        shots: specResult.spec.timeline.shots.length,
        archetype,
      },
      artifacts,
    };
  } finally {
    await resolvedVideo.cleanup?.();
  }
}
