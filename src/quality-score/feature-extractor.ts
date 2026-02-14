/**
 * Feature Extractor
 *
 * Orchestrates extraction of a feature vector from a single video by
 * combining existing repo metrics with optional CLIP/text embeddings.
 */
import { resolve, basename } from 'node:path';
import { runPythonJson } from '../validate/python-json';
import type { FeatureVector, RepoMetricFeatures, MetadataFeatures } from '../domain';
import { FeatureVectorSchema } from '../domain';

export interface FeatureExtractorOptions {
  videoPath: string;
  scriptPath?: string;
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
  const { videoPath, scriptPath } = options;
  const metrics: RepoMetricFeatures = {};
  let ocrConfidenceMean: number | undefined;
  let sceneCount: number | undefined;

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
  try {
    const { analyzePacingQuality } = await import('../score/pacing-quality');
    const timestamps = await loadTimestamps(videoPath);
    if (timestamps) {
      const pacingResult = analyzePacingQuality(timestamps as any);
      metrics.pacingScore = pacingResult.overallScore;
      metrics.pacingAvgWpm = pacingResult.aggregate.avgWpm;
      metrics.pacingCv = pacingResult.aggregate.coefficientOfVariation;
    }
  } catch {
    // Pacing not available
  }

  // Run audio quality
  try {
    const { analyzeAudioQuality } = await import('../score/audio-quality');
    const timestamps = await loadTimestamps(videoPath);
    if (timestamps) {
      const audioResult = analyzeAudioQuality(timestamps as any);
      metrics.audioScore = audioResult.overallScore;
      metrics.audioGapCount = audioResult.details.pausesFound;
      metrics.audioOverlapCount = audioResult.details.overlapsFound;
    }
  } catch {
    // Audio quality not available
  }

  // Run engagement quality
  try {
    const { analyzeEngagementQuality } = await import('../score/engagement-quality');
    const timestamps = await loadTimestamps(videoPath);
    if (timestamps && scriptPath) {
      const { readFileSync } = await import('node:fs');
      const script = JSON.parse(readFileSync(scriptPath, 'utf-8'));
      const engResult = analyzeEngagementQuality(script as any, timestamps as any);
      metrics.engagementScore = engResult.overallScore;
      metrics.hookTiming = engResult.metrics.hookTiming;
      metrics.ctaPresence = engResult.metrics.ctaPresence;
      metrics.sceneProgression = engResult.metrics.sceneProgression;
    }
  } catch {
    // Engagement not available
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
 * Placeholder for timestamp loading. The sync rater extracts timestamps
 * internally and doesn't expose them, so timestamp-dependent metrics
 * (pacing, audio, engagement) are only available when sync rating runs.
 */
async function loadTimestamps(_videoPath: string): Promise<unknown> {
  return undefined;
}
