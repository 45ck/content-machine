/**
 * Feature Extractor
 *
 * Orchestrates extraction of a feature vector from a single video by
 * combining existing repo metrics with optional CLIP/text embeddings.
 */
import { resolve, basename, dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { runPythonJson } from '../validate/python-json';
import type {
  FeatureVector,
  RepoMetricFeatures,
  MetadataFeatures,
  TimestampsOutput,
} from '../domain';
import { FeatureVectorSchema, TimestampsOutputSchema } from '../domain';

export interface FeatureExtractorOptions {
  videoPath: string;
  scriptPath?: string;
  /** Explicit path to timestamps.json. If omitted, auto-discovers from video directory. */
  timestampsPath?: string;
  /** Include CLIP frame embeddings (requires Python + CLIP). */
  includeClip?: boolean;
  /** Include DistilBERT text embeddings (requires Python + transformers). */
  includeText?: boolean;
  /** Transcript text for text embeddings. If not provided, uses script text. */
  transcript?: string;
  pythonPath?: string;
  timeoutMs?: number;
}

/** Extracts a full feature vector from a video for quality scoring. */
export async function extractFeatures(options: FeatureExtractorOptions): Promise<FeatureVector> {
  const { videoPath } = options;
  const videoId = basename(videoPath).replace(/\.[^.]+$/, '');

  const [repoMetricsResult, metadata, clipEmbedding, textEmbedding] = await Promise.all([
    extractRepoMetrics(options),
    extractMetadata(videoPath, options),
    options.includeClip ? extractClipEmbedding(videoPath, options) : undefined,
    options.includeText ? extractTextEmbedding(options) : undefined,
  ]);

  const { metrics: repoMetrics, ocrConfidenceMean, sceneCount } = repoMetricsResult;

  // Merge extracted metadata enrichments
  if (ocrConfidenceMean !== undefined) metadata.ocrConfidenceMean = ocrConfidenceMean;
  if (sceneCount !== undefined) metadata.sceneCount = sceneCount;

  const vector: FeatureVector = {
    videoId,
    extractedAt: new Date().toISOString(),
    version: '1.0.0',
    repoMetrics,
    metadata,
    ...(clipEmbedding ? { clipEmbedding } : {}),
    ...(textEmbedding ? { textEmbedding } : {}),
  };

  return FeatureVectorSchema.parse(vector);
}

interface RepoMetricsResult {
  metrics: RepoMetricFeatures;
  ocrConfidenceMean?: number;
  sceneCount?: number;
}

async function extractRepoMetrics(options: FeatureExtractorOptions): Promise<RepoMetricsResult> {
  const { videoPath, scriptPath, timestampsPath } = options;
  const metrics: RepoMetricFeatures = {};
  let ocrConfidenceMean: number | undefined;
  let sceneCount: number | undefined;

  // Load timestamps once for pacing/audio/engagement metrics
  const timestamps = loadTimestamps(videoPath, timestampsPath);

  // Run sync rating
  try {
    const { rateSyncQuality } = await import('../score/sync-rater');
    const syncResult = await rateSyncQuality(videoPath);
    metrics.syncRating = syncResult.rating;
    metrics.syncMeanDriftMs = syncResult.metrics.meanDriftMs;
    metrics.syncMatchRatio = syncResult.metrics.matchRatio;

    // Extract caption quality subscores if available
    if (syncResult.captionQuality) {
      const cq = syncResult.captionQuality;
      metrics.captionOverall = cq.overall.score;
      metrics.captionCoverage = cq.coverage.score;
      metrics.captionRhythm = cq.rhythm.score;
      metrics.captionJitter = cq.jitter.score;
      metrics.captionSafeArea = cq.safeArea.score;
      ocrConfidenceMean = cq.ocrConfidence.mean;
    }
  } catch {
    // Sync rating not available (missing deps, etc.)
  }

  // Run pacing quality
  if (timestamps) {
    try {
      const { analyzePacingQuality } = await import('../score/pacing-quality');
      const pacingResult = analyzePacingQuality(timestamps);
      metrics.pacingScore = pacingResult.overallScore;
      metrics.pacingAvgWpm = pacingResult.aggregate.avgWpm;
      metrics.pacingCv = pacingResult.aggregate.coefficientOfVariation;
    } catch {
      // Pacing not available
    }
  }

  // Run audio quality
  if (timestamps) {
    try {
      const { analyzeAudioQuality } = await import('../score/audio-quality');
      const audioResult = analyzeAudioQuality(timestamps);
      metrics.audioScore = audioResult.overallScore;
      metrics.audioGapCount = audioResult.details.pausesFound;
      metrics.audioOverlapCount = audioResult.details.overlapsFound;
    } catch {
      // Audio quality not available
    }
  }

  // Run engagement quality
  if (timestamps && scriptPath) {
    try {
      const { analyzeEngagementQuality } = await import('../score/engagement-quality');
      const scriptRaw = JSON.parse(readFileSync(scriptPath, 'utf-8'));
      const { ScriptOutputSchema } = await import('../domain');
      const script = ScriptOutputSchema.parse(scriptRaw);
      const engResult = analyzeEngagementQuality(script, timestamps);
      metrics.engagementScore = engResult.overallScore;
      metrics.hookTiming = engResult.metrics.hookTiming;
      metrics.ctaPresence = engResult.metrics.ctaPresence;
      metrics.sceneProgression = engResult.metrics.sceneProgression;
    } catch {
      // Engagement not available
    }
  }

  // Run script score and extract scene count
  if (scriptPath) {
    try {
      const { scoreScript } = await import('../score/scorer');
      const { readFileSync } = await import('node:fs');
      const { ScriptOutputSchema } = await import('../domain');
      const rawScript = JSON.parse(readFileSync(scriptPath, 'utf-8'));
      const script = ScriptOutputSchema.parse(rawScript);
      const scoreResult = scoreScript({ script, scriptPath });
      metrics.scriptScore = scoreResult.overall;

      // Extract scene count from script
      if (script.scenes && Array.isArray(script.scenes)) {
        sceneCount = script.scenes.length;
      }
    } catch {
      // Script scoring not available
    }
  }

  // Video-intrinsic metrics (no timestamps/script needed — run in parallel)
  await Promise.allSettled([
    // Temporal quality
    (async () => {
      const { TemporalAnalyzer } = await import('../validate/temporal');
      const analyzer = new TemporalAnalyzer({ pythonPath: options.pythonPath });
      const result = await analyzer.analyze(videoPath);
      metrics.temporalFlickerScore = result.flicker.score;
      metrics.temporalDuplicateRatio = result.duplicateFrameRatio;
    })(),
    // Freeze detection
    (async () => {
      const { FreezeAnalyzer } = await import('../validate/freeze');
      const analyzer = new FreezeAnalyzer({ pythonPath: options.pythonPath });
      const result = await analyzer.analyze(videoPath);
      metrics.freezeRatio = result.freezeRatio;
      metrics.blackRatio = result.blackRatio;
    })(),
    // Audio signal
    (async () => {
      const { FfmpegAudioAnalyzer } = await import('../validate/audio-signal');
      const analyzer = new FfmpegAudioAnalyzer({ pythonPath: options.pythonPath });
      const result = await analyzer.analyze(videoPath);
      metrics.audioLoudnessLUFS = result.loudnessLUFS;
      metrics.audioClippingRatio = result.clippingRatio;
    })(),
    // Flow consistency
    (async () => {
      const { FlowConsistencyAnalyzer } = await import('../validate/flow-consistency');
      const analyzer = new FlowConsistencyAnalyzer({ pythonPath: options.pythonPath });
      const result = await analyzer.analyze(videoPath);
      metrics.flowMeanWarpError = result.meanWarpError;
    })(),
  ]);
  // Errors are silently ignored (graceful degradation)

  return { metrics, ocrConfidenceMean, sceneCount };
}

async function extractMetadata(
  videoPath: string,
  _options: FeatureExtractorOptions
): Promise<MetadataFeatures> {
  try {
    const { probeVideoWithFfprobe } = await import('../validate/ffprobe');
    const info = await probeVideoWithFfprobe(videoPath);
    return {
      durationS: info.durationSeconds,
      width: info.width,
      height: info.height,
    };
  } catch {
    return { durationS: 0 };
  }
}

async function extractClipEmbedding(
  videoPath: string,
  options: FeatureExtractorOptions
): Promise<number[] | undefined> {
  try {
    const scriptPath = resolve(__dirname, '../../scripts/clip_embeddings.py');
    const result = (await runPythonJson({
      errorCode: 'CLIP_EMBEDDING_ERROR',
      pythonPath: options.pythonPath,
      scriptPath,
      args: ['--video', videoPath],
      timeoutMs: options.timeoutMs ?? 120_000,
    })) as { embedding?: number[] };
    return result.embedding;
  } catch {
    return undefined;
  }
}

async function extractTextEmbedding(
  options: FeatureExtractorOptions
): Promise<number[] | undefined> {
  const text = options.transcript ?? (await extractTranscriptFromScript(options.scriptPath));
  if (!text) return undefined;

  try {
    const scriptPath = resolve(__dirname, '../../scripts/text_embeddings.py');
    const result = (await runPythonJson({
      errorCode: 'TEXT_EMBEDDING_ERROR',
      pythonPath: options.pythonPath,
      scriptPath,
      args: ['--text', text],
      timeoutMs: options.timeoutMs ?? 60_000,
    })) as { embedding?: number[] };
    return result.embedding;
  } catch {
    return undefined;
  }
}

async function extractTranscriptFromScript(scriptPath?: string): Promise<string | undefined> {
  if (!scriptPath) return undefined;
  try {
    const { readFileSync } = await import('node:fs');
    const script = JSON.parse(readFileSync(scriptPath, 'utf-8'));
    const parts: string[] = [];
    if (script.hook) parts.push(script.hook);
    if (script.scenes) {
      for (const scene of script.scenes) {
        if (scene.text) parts.push(scene.text);
      }
    }
    if (script.cta) parts.push(script.cta);
    return parts.join(' ') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load timestamps from an explicit path or auto-discover from the video directory.
 * Looks for `timestamps.json` in `dirname(videoPath)`.
 */
function loadTimestamps(videoPath: string, timestampsPath?: string): TimestampsOutput | undefined {
  const candidates = timestampsPath
    ? [timestampsPath]
    : [join(dirname(videoPath), 'timestamps.json')];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const raw = JSON.parse(readFileSync(candidate, 'utf-8'));
        return TimestampsOutputSchema.parse(raw);
      } catch {
        // Invalid timestamps file, skip
      }
    }
  }
  return undefined;
}
