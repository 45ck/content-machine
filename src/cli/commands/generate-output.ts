/**
 * Generate command - output formatting, display, and JSON envelope helpers.
 *
 * Extracted from generate.ts as part of ARCH-D4 decomposition.
 */
import { dirname, join } from 'path';
import type { PipelineResult } from '../../core/pipeline';
import { chalk } from '../colors';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { getCliRuntime } from '../runtime';
import { hasAudioMixSources } from '../../audio/mix/planner';
import {
  DEFAULT_ARTIFACT_FILENAMES,
} from '../../domain/repo-facts.generated';
import type {
  CaptionQualityRatingOutput,
  SyncRatingOutput,
} from '../../domain';
import type { AnalyzeVideoFramesResult } from '../../analysis/frame-analysis';
import type { GenerateOptions } from './generate-defaults';
import {
  parseOptionalInt,
  parseOptionalNumber,
  parseWordList,
  parseSfxPlacement,
  parseMinCaptionOverall,
  parseMaxCaptionRetries,
  buildAudioMixOptions,
} from './generate-defaults';

/* ------------------------------------------------------------------ */
/*  Summary types                                                      */
/* ------------------------------------------------------------------ */

export interface SyncQualitySummary {
  reportPath: string;
  rating: number;
  ratingLabel: string;
  passed: boolean;
  meanDriftMs: number;
  maxDriftMs: number;
  matchRatio: number;
  errorCount: number;
  attempts: number;
}

export interface CaptionQualitySummary {
  reportPath: string;
  overallScore: number;
  passed: boolean;
  coverageRatio: number;
  safeAreaScore: number;
  flickerEvents: number;
  meanOcrConfidence: number;
  attempts: number;
}

/* ------------------------------------------------------------------ */
/*  Summary builders                                                   */
/* ------------------------------------------------------------------ */

export function buildSyncQualitySummary(
  reportPath: string,
  rating: SyncRatingOutput,
  attempts: number
): SyncQualitySummary {
  return {
    reportPath,
    rating: rating.rating,
    ratingLabel: rating.ratingLabel,
    passed: rating.passed,
    meanDriftMs: rating.metrics.meanDriftMs,
    maxDriftMs: rating.metrics.maxDriftMs,
    matchRatio: rating.metrics.matchRatio,
    errorCount: rating.errors.length,
    attempts,
  };
}

export function buildCaptionQualitySummary(
  reportPath: string,
  rating: CaptionQualityRatingOutput,
  attempts: number,
  minOverallScore: number
): CaptionQualitySummary {
  const passed =
    rating.captionQuality.overall.passed && rating.captionQuality.overall.score >= minOverallScore;
  return {
    reportPath,
    overallScore: rating.captionQuality.overall.score,
    passed,
    coverageRatio: rating.captionQuality.coverage.coverageRatio,
    safeAreaScore: rating.captionQuality.safeArea.score,
    flickerEvents: rating.captionQuality.flicker.flickerEvents,
    meanOcrConfidence: rating.captionQuality.ocrConfidence.mean,
    attempts,
  };
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export function printHeader(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (runtime.json) return;

  writeStderrLine(chalk.bold('content-machine'));
  writeStderrLine(chalk.gray(`Topic: ${topic}`));
  writeStderrLine(chalk.gray(`Archetype: ${options.archetype}`));
  if (options.template) {
    writeStderrLine(chalk.gray(`Template: ${options.template}`));
  }
  if (options.workflow) {
    writeStderrLine(chalk.gray(`Workflow: ${options.workflow}`));
  }
  if (options.gameplay) {
    writeStderrLine(chalk.gray(`Gameplay: ${options.gameplay}`));
  }
  if (options.hook) {
    writeStderrLine(chalk.gray(`Hook: ${options.hook}`));
  }
  writeStderrLine(chalk.gray(`Output: ${options.output}`));
  writeStderrLine(chalk.gray(`Artifacts: ${dirname(options.output)}`));
}

/* ------------------------------------------------------------------ */
/*  Dry run                                                            */
/* ------------------------------------------------------------------ */

export function writeDryRunJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: {
        topic,
        archetype,
        orientation,
        template: templateSpec,
        policy: options.policy ?? null,
        resolvedTemplateId,
        workflow: options.workflow ?? null,
        workflowAllowExec: Boolean(options.workflowAllowExec),
        script: options.script ?? null,
        audio: options.audio ?? null,
        audioMix: options.audioMix ?? null,
        timestamps: options.timestamps ?? null,
        visuals: options.visuals ?? null,
        visualsProvider: options.visualsProvider ?? null,
        visualsFallbackProviders: options.visualsFallbackProviders ?? null,
        visualsRoutingPolicy: options.visualsRoutingPolicy ?? null,
        visualsMaxGenerationCostUsd: options.visualsMaxGenerationCostUsd ?? null,
        visualsGateEnforce: Boolean(options.visualsGateEnforce),
        visualsGateMaxFallbackRate: options.visualsGateMaxFallbackRate ?? null,
        visualsGateMinProviderSuccessRate: options.visualsGateMinProviderSuccessRate ?? null,
        visualsRoutingAdaptiveWindow: options.visualsRoutingAdaptiveWindow ?? null,
        visualsRoutingAdaptiveMinRecords: options.visualsRoutingAdaptiveMinRecords ?? null,
        fps: options.fps ?? '30',
        captionPreset: options.captionPreset ?? 'tiktok',
        captionMode: options.captionMode ?? null,
        captionNotation: options.captionNotation ?? null,
        wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
        captionMaxWords: parseOptionalInt(options.captionMaxWords),
        captionMinWords: parseOptionalInt(options.captionMinWords),
        captionTargetWords: parseOptionalInt(options.captionTargetWords),
        captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
        captionMaxCps: parseOptionalNumber(options.captionMaxCps),
        captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
        captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
        captionDropFillers: options.captionDropFillers ?? null,
        captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        music: typeof options.music === 'string' ? options.music : null,
        musicVolumeDb: parseOptionalNumber(options.musicVolume),
        musicDuckDb: parseOptionalNumber(options.musicDuck),
        musicLoop: options.musicLoop ?? null,
        musicFadeInMs: parseOptionalInt(options.musicFadeIn),
        musicFadeOutMs: parseOptionalInt(options.musicFadeOut),
        sfx: Array.isArray(options.sfx) ? options.sfx : null,
        sfxPack: options.sfxPack ?? null,
        sfxAt: parseSfxPlacement(options.sfxAt) ?? null,
        sfxVolumeDb: parseOptionalNumber(options.sfxVolume),
        sfxMinGapMs: parseOptionalInt(options.sfxMinGap),
        sfxDurationSeconds: parseOptionalNumber(options.sfxDuration),
        ambience: typeof options.ambience === 'string' ? options.ambience : null,
        ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume),
        ambienceLoop: options.ambienceLoop ?? null,
        ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn),
        ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut),
        mixPreset: options.mixPreset ?? null,
        lufsTarget: parseOptionalNumber(options.lufsTarget),
        gameplay: options.gameplay ?? null,
        gameplayStyle: options.gameplayStyle ?? null,
        gameplayStrict: Boolean(options.gameplayStrict),
        splitLayout: options.splitLayout ?? null,
        gameplayPosition: options.gameplayPosition ?? null,
        contentPosition: options.contentPosition ?? null,
        hook: options.hook ?? null,
        hookLibrary: options.hookLibrary ?? null,
        hooksDir: options.hooksDir ?? null,
        hookDuration: options.hookDuration ?? null,
        hookTrim: options.hookTrim ?? null,
        hookAudio: options.hookAudio ?? null,
        hookFit: options.hookFit ?? null,
        downloadAssets: options.downloadAssets !== false,
        dryRun: true,
      },
      outputs: { dryRun: true, artifactsDir },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

export function showDryRunSummary(
  topic: string,
  options: GenerateOptions,
  archetype: string,
  orientation: string
): void {
  writeStderrLine('Dry-run mode - no execution');
  writeStderrLine(`   Topic: ${topic}`);
  writeStderrLine(`   Archetype: ${archetype}`);
  writeStderrLine(`   Orientation: ${orientation}`);
  writeStderrLine(`   Voice: ${options.voice}`);
  writeStderrLine(`   Duration: ${options.duration}s`);
  writeStderrLine(`   Output: ${options.output}`);
  writeStderrLine(`   Keep artifacts: ${options.keepArtifacts}`);
  writeStderrLine(`   Research: ${options.research ? 'enabled' : 'disabled'}`);
  if (options.workflow) {
    writeStderrLine(`   Workflow: ${options.workflow}`);
  }
  if (options.script) {
    writeStderrLine(`   Script: ${options.script}`);
  }
  if (options.audio) {
    writeStderrLine(`   Audio: ${options.audio}`);
  }
  if (options.timestamps) {
    writeStderrLine(`   Timestamps: ${options.timestamps}`);
  }
  if (options.audioMix) {
    writeStderrLine(`   Audio mix: ${options.audioMix}`);
  }
  if (options.visuals) {
    writeStderrLine(`   Visuals: ${options.visuals}`);
  }
  const mixOptions = buildAudioMixOptions(options);
  const hasMix = hasAudioMixSources(mixOptions) || Boolean(options.audioMix);
  writeStderrLine(
    `   Pipeline: ${options.pipeline ?? 'standard'}${options.pipeline === 'audio-first' ? ' (requires Whisper)' : ''}`
  );
  if (options.whisperModel) {
    writeStderrLine(`   Whisper Model: ${options.whisperModel}`);
  }
  if (options.captionGroupMs) {
    writeStderrLine(`   Caption Group: ${options.captionGroupMs}ms`);
  }
  if (options.reconcile) {
    writeStderrLine(`   Reconcile: enabled (match ASR to script)`);
  }
  if (options.captionMode) {
    writeStderrLine(`   Caption Mode: ${options.captionMode}`);
  }
  if (options.captionNotation) {
    writeStderrLine(`   Caption Notation: ${options.captionNotation}`);
  }
  const wordsPerPage = options.wordsPerPage ?? options.captionMaxWords;
  if (wordsPerPage) {
    writeStderrLine(`   Caption Max Words: ${wordsPerPage}`);
  }
  if (options.captionMinWords) {
    writeStderrLine(`   Caption Min Words: ${options.captionMinWords}`);
  }
  if (options.captionTargetWords) {
    writeStderrLine(`   Caption Target Words: ${options.captionTargetWords}`);
  }
  if (options.captionMaxWpm) {
    writeStderrLine(`   Caption Max WPM: ${options.captionMaxWpm}`);
  }
  if (options.captionMaxCps) {
    writeStderrLine(`   Caption Max CPS: ${options.captionMaxCps}`);
  }
  if (options.captionMinOnScreenMs) {
    writeStderrLine(`   Caption Min On-Screen: ${options.captionMinOnScreenMs}ms`);
  }
  if (options.captionMinOnScreenMsShort) {
    writeStderrLine(`   Caption Min On-Screen (Short): ${options.captionMinOnScreenMsShort}ms`);
  }
  if (options.captionDropFillers) {
    writeStderrLine('   Caption Cleanup: drop fillers');
  }
  if (options.captionFillerWords) {
    writeStderrLine(`   Caption Filler Words: ${options.captionFillerWords}`);
  }
  if (options.maxLines) {
    writeStderrLine(`   Max Lines: ${options.maxLines}`);
  }
  if (options.charsPerLine) {
    writeStderrLine(`   Chars Per Line: ${options.charsPerLine}`);
  }
  if (options.captionAnimation) {
    writeStderrLine(`   Caption Animation: ${options.captionAnimation}`);
  }
  if (options.captionFontFamily) {
    writeStderrLine(`   Caption Font: ${options.captionFontFamily}`);
  }
  if (options.captionFontFile) {
    writeStderrLine(`   Caption Font File: ${options.captionFontFile}`);
  }
  if (options.mixPreset) {
    writeStderrLine(`   Mix Preset: ${options.mixPreset}`);
  }
  if (typeof options.music === 'string') {
    writeStderrLine(`   Music: ${options.music}`);
  }
  if (Array.isArray(options.sfx) && options.sfx.length > 0) {
    writeStderrLine(`   SFX: ${options.sfx.join(', ')}`);
  }
  if (options.sfxPack) {
    writeStderrLine(`   SFX Pack: ${options.sfxPack}`);
  }
  if (typeof options.ambience === 'string') {
    writeStderrLine(`   Ambience: ${options.ambience}`);
  }
  if (options.gameplay) {
    writeStderrLine(`   Gameplay: ${options.gameplay}`);
  }
  if (options.gameplayStyle) {
    writeStderrLine(`   Gameplay Style: ${options.gameplayStyle}`);
  }
  if (options.gameplayStrict) {
    writeStderrLine('   Gameplay Strict: enabled');
  }
  if (options.gameplayPosition) {
    writeStderrLine(`   Gameplay Position: ${options.gameplayPosition}`);
  }
  if (options.contentPosition) {
    writeStderrLine(`   Content Position: ${options.contentPosition}`);
  }
  if (options.hook) {
    writeStderrLine(`   Hook: ${options.hook}`);
  }
  if (options.hookTrim) {
    writeStderrLine(`   Hook Trim: ${options.hookTrim}s`);
  }
  writeStderrLine(`   Frame Analysis: ${options.frameAnalysis === false ? 'disabled' : 'enabled'}`);
  if (options.frameAnalysis !== false) {
    writeStderrLine(`   Frame Analysis Mode: ${options.frameAnalysisMode ?? 'both'}`);
    writeStderrLine(`   Frame Analysis FPS: ${options.frameAnalysisFps ?? '1'}`);
    writeStderrLine(`   Frame Analysis Shots: ${options.frameAnalysisShots ?? '30'}`);
    writeStderrLine(`   Frame Analysis Segments: ${options.frameAnalysisSegments ?? '5'}`);
    writeStderrLine(
      `   Frame Analysis Output: ${options.frameAnalysisOutput ?? 'output/analysis'}`
    );
  }
  writeStderrLine('   Pipeline stages:');
  if (options.research) {
    writeStderrLine('   0. Research -> research.json');
  }
  writeStderrLine(
    options.script
      ? `   1. Script -> ${options.script} (external)`
      : `   1. Script -> ${DEFAULT_ARTIFACT_FILENAMES.script}`
  );
  if (options.audio) {
    const tsLabel = options.timestamps ? options.timestamps : DEFAULT_ARTIFACT_FILENAMES.timestamps;
    writeStderrLine(
      `   2. Audio -> ${options.audio} + ${tsLabel}${hasMix ? ` + ${DEFAULT_ARTIFACT_FILENAMES['audio-mix']}` : ''} (external)`
    );
  } else {
    writeStderrLine(
      `   2. Audio -> ${DEFAULT_ARTIFACT_FILENAMES.audio} + ${DEFAULT_ARTIFACT_FILENAMES.timestamps}${hasMix ? ` + ${DEFAULT_ARTIFACT_FILENAMES['audio-mix']}` : ''}${options.pipeline === 'audio-first' ? ' (Whisper ASR required)' : ''}`
    );
  }
  writeStderrLine(
    options.visuals
      ? `   3. Visuals -> ${options.visuals} (external)`
      : `   3. Visuals -> ${DEFAULT_ARTIFACT_FILENAMES.visuals}`
  );
  writeStderrLine(`   4. Render -> ${options.output}`);
}

/* ------------------------------------------------------------------ */
/*  Success JSON args                                                  */
/* ------------------------------------------------------------------ */

export function buildGenerateSuccessJsonArgs(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
}): Record<string, unknown> {
  const { topic, archetype, orientation, options, templateSpec, resolvedTemplateId } = params;

  return {
    topic,
    archetype,
    orientation,
    template: templateSpec,
    policy: options.policy ?? null,
    resolvedTemplateId,
    workflow: options.workflow ?? null,
    workflowAllowExec: Boolean(options.workflowAllowExec),
    script: options.script ?? null,
    audio: options.audio ?? null,
    audioMix: options.audioMix ?? null,
    timestamps: options.timestamps ?? null,
    visuals: options.visuals ?? null,
    visualsProvider: options.visualsProvider ?? null,
    visualsFallbackProviders: options.visualsFallbackProviders ?? null,
    visualsRoutingPolicy: options.visualsRoutingPolicy ?? null,
    visualsMaxGenerationCostUsd: options.visualsMaxGenerationCostUsd ?? null,
    visualsGateEnforce: Boolean(options.visualsGateEnforce),
    visualsGateMaxFallbackRate: options.visualsGateMaxFallbackRate ?? null,
    visualsGateMinProviderSuccessRate: options.visualsGateMinProviderSuccessRate ?? null,
    visualsRoutingAdaptiveWindow: options.visualsRoutingAdaptiveWindow ?? null,
    visualsRoutingAdaptiveMinRecords: options.visualsRoutingAdaptiveMinRecords ?? null,
    gameplay: options.gameplay ?? null,
    gameplayStyle: options.gameplayStyle ?? null,
    gameplayStrict: Boolean(options.gameplayStrict),
    fps: options.fps,
    captionPreset: options.captionPreset,
    captionMode: options.captionMode ?? null,
    captionNotation: options.captionNotation ?? null,
    wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
    captionMaxWords: parseOptionalInt(options.captionMaxWords),
    captionMinWords: parseOptionalInt(options.captionMinWords),
    captionTargetWords: parseOptionalInt(options.captionTargetWords),
    captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
    captionMaxCps: parseOptionalNumber(options.captionMaxCps),
    captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
    captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
    captionDropFillers: options.captionDropFillers ?? null,
    captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
    voice: options.voice,
    durationSeconds: options.duration,
    output: options.output,
    keepArtifacts: options.keepArtifacts,
    music: typeof options.music === 'string' ? options.music : null,
    musicVolumeDb: parseOptionalNumber(options.musicVolume),
    musicDuckDb: parseOptionalNumber(options.musicDuck),
    musicLoop: options.musicLoop ?? null,
    musicFadeInMs: parseOptionalInt(options.musicFadeIn),
    musicFadeOutMs: parseOptionalInt(options.musicFadeOut),
    sfx: Array.isArray(options.sfx) ? options.sfx : null,
    sfxPack: options.sfxPack ?? null,
    sfxAt: parseSfxPlacement(options.sfxAt) ?? null,
    sfxVolumeDb: parseOptionalNumber(options.sfxVolume),
    sfxMinGapMs: parseOptionalInt(options.sfxMinGap),
    sfxDurationSeconds: parseOptionalNumber(options.sfxDuration),
    ambience: typeof options.ambience === 'string' ? options.ambience : null,
    ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume),
    ambienceLoop: options.ambienceLoop ?? null,
    ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn),
    ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut),
    mixPreset: options.mixPreset ?? null,
    lufsTarget: parseOptionalNumber(options.lufsTarget),
    mock: options.mock,
    pipeline: options.pipeline,
    whisperModel: options.whisperModel ?? null,
    reconcile: Boolean(options.reconcile),
    syncPreset: options.syncPreset,
    syncQualityCheck: Boolean(options.syncQualityCheck),
    minSyncRating: parseOptionalInt(options.minSyncRating),
    autoRetrySync: Boolean(options.autoRetrySync),
    captionQualityCheck: Boolean(options.captionQualityCheck),
    minCaptionOverall: parseMinCaptionOverall(options),
    autoRetryCaptions: Boolean(options.autoRetryCaptions),
    maxCaptionRetries: parseMaxCaptionRetries(options),
    captionPerfect: Boolean(options.captionPerfect),
    captionQualityMock: Boolean(options.captionQualityMock),
    gameplayPosition: options.gameplayPosition ?? null,
    contentPosition: options.contentPosition ?? null,
    splitLayout: options.splitLayout ?? null,
    hook: options.hook ?? null,
    hookLibrary: options.hookLibrary ?? null,
    hooksDir: options.hooksDir ?? null,
    hookDuration: options.hookDuration ?? null,
    hookTrim: options.hookTrim ?? null,
    hookAudio: options.hookAudio ?? null,
    hookFit: options.hookFit ?? null,
    downloadHook: Boolean(options.downloadHook),
    downloadAssets: options.downloadAssets !== false,
    frameAnalysis: options.frameAnalysis !== false,
    frameAnalysisMode: options.frameAnalysisMode ?? 'both',
    frameAnalysisFps: parseOptionalNumber(options.frameAnalysisFps) ?? 1,
    frameAnalysisShots: parseOptionalInt(options.frameAnalysisShots) ?? 30,
    frameAnalysisSegments: parseOptionalInt(options.frameAnalysisSegments) ?? 5,
    frameAnalysisOutput: options.frameAnalysisOutput ?? 'output/analysis',
  };
}

/* ------------------------------------------------------------------ */
/*  Success JSON outputs                                               */
/* ------------------------------------------------------------------ */

function buildGenerateSuccessJsonSyncOutputs(
  sync: SyncQualitySummary | null | undefined
): Record<string, unknown> {
  if (!sync) {
    return {
      syncReportPath: null,
      syncRating: null,
      syncRatingLabel: null,
      syncPassed: null,
      syncMeanDriftMs: null,
      syncMaxDriftMs: null,
      syncMatchRatio: null,
      syncErrorCount: null,
      syncAttempts: null,
    };
  }

  return {
    syncReportPath: sync.reportPath,
    syncRating: sync.rating,
    syncRatingLabel: sync.ratingLabel,
    syncPassed: sync.passed,
    syncMeanDriftMs: sync.meanDriftMs,
    syncMaxDriftMs: sync.maxDriftMs,
    syncMatchRatio: sync.matchRatio,
    syncErrorCount: sync.errorCount,
    syncAttempts: sync.attempts,
  };
}

function buildGenerateSuccessJsonCaptionOutputs(
  caption: CaptionQualitySummary | null | undefined
): Record<string, unknown> {
  if (!caption) {
    return {
      captionReportPath: null,
      captionOverallScore: null,
      captionPassed: null,
      captionCoverageRatio: null,
      captionSafeAreaScore: null,
      captionFlickerEvents: null,
      captionMeanOcrConfidence: null,
      captionAttempts: null,
    };
  }

  return {
    captionReportPath: caption.reportPath,
    captionOverallScore: caption.overallScore,
    captionPassed: caption.passed,
    captionCoverageRatio: caption.coverageRatio,
    captionSafeAreaScore: caption.safeAreaScore,
    captionFlickerEvents: caption.flickerEvents,
    captionMeanOcrConfidence: caption.meanOcrConfidence,
    captionAttempts: caption.attempts,
  };
}

export function buildGenerateSuccessJsonOutputs(params: {
  result: PipelineResult;
  artifactsDir: string;
  sync: SyncQualitySummary | null | undefined;
  caption: CaptionQualitySummary | null | undefined;
  frameAnalysis: AnalyzeVideoFramesResult | null | undefined;
}): Record<string, unknown> {
  const { result, artifactsDir, sync, caption, frameAnalysis } = params;

  return {
    videoPath: result.outputPath,
    durationSeconds: result.duration,
    width: result.width,
    height: result.height,
    fps: result.render.fps,
    fileSizeBytes: result.fileSize,
    artifactsDir,
    costs: result.costs ?? null,
    audioMixPath: result.audio.audioMixPath ?? null,
    audioMixLayers: result.audio.audioMix?.layers.length ?? 0,
    gameplayClip: result.visuals.gameplayClip?.path ?? null,
    frameAnalysisManifestPath: frameAnalysis?.manifestPath ?? null,
    frameAnalysisFpsFrames: frameAnalysis?.manifest.fpsFrames.length ?? 0,
    frameAnalysisShotFrames: frameAnalysis?.manifest.shotFrames.length ?? 0,
    ...buildGenerateSuccessJsonSyncOutputs(sync),
    ...buildGenerateSuccessJsonCaptionOutputs(caption),
  };
}

/* ------------------------------------------------------------------ */
/*  Success JSON envelope                                              */
/* ------------------------------------------------------------------ */

export function writeSuccessJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
  sync?: SyncQualitySummary | null;
  caption?: CaptionQualitySummary | null;
  frameAnalysis?: AnalyzeVideoFramesResult | null;
  exitCode?: number;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
    sync,
    caption,
    frameAnalysis,
    exitCode = 0,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: buildGenerateSuccessJsonArgs({
        topic,
        archetype,
        orientation,
        options,
        templateSpec,
        resolvedTemplateId,
      }),
      outputs: buildGenerateSuccessJsonOutputs({
        result,
        artifactsDir,
        sync,
        caption,
        frameAnalysis,
      }),
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(exitCode);
}

/* ------------------------------------------------------------------ */
/*  Success summary (human-readable)                                   */
/* ------------------------------------------------------------------ */

export async function showSuccessSummary(
  result: PipelineResult,
  options: GenerateOptions,
  artifactsDir: string,
  sync: SyncQualitySummary | null,
  caption: CaptionQualitySummary | null,
  frameAnalysis: AnalyzeVideoFramesResult | null,
  topic: string
): Promise<void> {
  const titleParts: string[] = [];
  if (sync && !sync.passed) titleParts.push('sync failed');
  if (caption && !caption.passed) titleParts.push('caption quality failed');
  const title =
    titleParts.length > 0 ? `Video generated (${titleParts.join(', ')})` : 'Video generated';
  const rows: Array<[string, string]> = [
    ['Title', result.script.title ?? topic],
    ['Duration', `${result.duration.toFixed(1)}s`],
    ['Resolution', `${result.width}x${result.height}`],
    ['Size', `${(result.fileSize / 1024 / 1024).toFixed(1)} MB`],
    ['Video', result.outputPath],
  ];
  if (result.visuals.gameplayClip) {
    rows.push(['Gameplay', result.visuals.gameplayClip.path]);
  }
  if (options.hook) {
    rows.push(['Hook', options.hook]);
  }
  if (frameAnalysis?.manifestPath) {
    rows.push(['Frame analysis', frameAnalysis.manifestPath]);
  }
  const lines = formatKeyValueRows(rows);

  if (result.costs) {
    lines.push(
      '',
      'Costs',
      ...formatKeyValueRows([
        ['Total', `$${result.costs.total.toFixed(4)}`],
        ['LLM', `$${result.costs.llm.toFixed(4)}`],
        ['TTS', `$${result.costs.tts.toFixed(4)}`],
      ])
    );
  }

  if (sync) {
    const status = sync.passed ? 'PASSED' : 'FAILED';
    lines.push(
      '',
      `Sync rating: ${sync.rating}/100 (${sync.ratingLabel}) - ${status} (attempts: ${sync.attempts})`,
      `Sync report: ${sync.reportPath}`
    );
  }

  if (caption) {
    const status = caption.passed ? 'PASSED' : 'FAILED';
    lines.push(
      '',
      `Caption quality: overall=${caption.overallScore.toFixed(2)} - ${status} (attempts: ${caption.attempts})`,
      `Caption report: ${caption.reportPath}`
    );
  }

  if (options.keepArtifacts) {
    const artifactRows: Array<[string, string]> = [
      ['Script', join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script)],
      ['Audio', join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.audio)],
      ['Timestamps', join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps)],
    ];
    if (result.audio.audioMixPath) {
      artifactRows.push(['Audio mix', result.audio.audioMixPath]);
    }
    artifactRows.push(['Visuals', join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals)]);
    if (options.template) {
      artifactRows.push(['Template', join(artifactsDir, 'template.resolved.json')]);
    }
    lines.push('', 'Artifacts', ...formatKeyValueRows(artifactRows));
  }

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  await writeSummaryCard({
    title,
    lines,
    footerLines: [`Next: cm validate ${result.outputPath} --profile ${profile}`],
  });

  // Human-mode stdout should be reserved for the primary artifact path.
  writeStdoutLine(result.outputPath);
}
