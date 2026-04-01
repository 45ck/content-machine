/**
 * VideoSpec structural comparator.
 *
 * Compares two VideoSpec.v1 objects (e.g. original vs reconstructed) and
 * scores structural fidelity across multiple dimensions.  Each metric
 * produces a 0–1 score (1 = identical) and an optional note.  The
 * aggregate score is a configurable weighted average.
 *
 * @cmTerm reconstruction-fidelity
 */
import type { VideoSpecV1 } from '../videospec/schema';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MetricScore {
  /** Metric identifier. */
  name: string;
  /** 0–1 where 1 means "identical". */
  score: number;
  /** Weight used in the aggregate calculation. */
  weight: number;
  /** Human-readable explanation. */
  note?: string;
}

export interface ReconstructionFidelityReport {
  /** Per-metric scores. */
  metrics: MetricScore[];
  /** Weighted aggregate score 0–1. */
  aggregate: number;
}

export interface CompareSpecsOptions {
  /**
   * Override default weights.  Keys are metric names, values are
   * non-negative weights.  Metrics not listed keep their default weight.
   */
  weights?: Partial<Record<string, number>>;
}

/* ------------------------------------------------------------------ */
/*  Default weights                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_WEIGHTS: Record<string, number> = {
  duration: 1.0,
  sceneCount: 1.0,
  sceneDurations: 1.0,
  pacing: 0.8,
  narrative: 0.6,
  audio: 0.8,
  captionDensity: 0.6,
  transcript: 0.5,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Score based on relative difference: 1 when identical, decays toward
 * 0 as the values diverge.  Uses `1 / (1 + |a - b| / scale)` so the
 * result is always in [0, 1].
 */
function relativeDiffScore(a: number, b: number, scale: number): number {
  if (scale <= 0) return a === b ? 1 : 0;
  return 1 / (1 + Math.abs(a - b) / scale);
}

/** Cosine similarity for equal-length non-negative vectors. Returns 0–1. */
function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 1; // both empty → identical
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 1; // both zero vectors
  return clamp01(dot / denom);
}

/** Bag-of-words Jaccard similarity on lowercased tokens ≥3 chars. */
function bagOfWordsJaccard(textA: string, textB: string): number {
  const tok = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );
  const setA = tok(textA);
  const setB = tok(textB);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  Array.from(setA).forEach((w) => {
    if (setB.has(w)) intersection++;
  });
  return intersection / (setA.size + setB.size - intersection);
}

/* ------------------------------------------------------------------ */
/*  Metric functions                                                   */
/* ------------------------------------------------------------------ */

const PACING_ORDER = ['very_fast', 'fast', 'moderate', 'slow'] as const;

function scoreDuration(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const da = a.meta.duration;
  const db = b.meta.duration;
  const score = relativeDiffScore(da, db, Math.max(da, db, 1) * 0.1);
  return {
    name: 'duration',
    score,
    weight: DEFAULT_WEIGHTS.duration,
    note: `${da.toFixed(1)}s vs ${db.toFixed(1)}s`,
  };
}

function scoreSceneCount(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const ca = a.timeline.pacing.shot_count;
  const cb = b.timeline.pacing.shot_count;
  const score = relativeDiffScore(ca, cb, Math.max(ca, cb, 1) * 0.2);
  return {
    name: 'sceneCount',
    score,
    weight: DEFAULT_WEIGHTS.sceneCount,
    note: `${ca} vs ${cb} shots`,
  };
}

function scoreSceneDurations(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const durs = (spec: VideoSpecV1) =>
    spec.timeline.shots
      .map((s) => s.end - s.start)
      .sort((x, y) => x - y);
  const da = durs(a);
  const db = durs(b);
  // Pad shorter array with zeros for cosine similarity
  const maxLen = Math.max(da.length, db.length);
  while (da.length < maxLen) da.push(0);
  while (db.length < maxLen) db.push(0);
  const score = cosineSimilarity(da, db);
  return {
    name: 'sceneDurations',
    score,
    weight: DEFAULT_WEIGHTS.sceneDurations,
    note: `cosine similarity of sorted shot durations (${a.timeline.shots.length} vs ${b.timeline.shots.length} shots)`,
  };
}

function scorePacing(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const pa = a.timeline.pacing.classification;
  const pb = b.timeline.pacing.classification;
  if (!pa || !pb) {
    return {
      name: 'pacing',
      score: pa === pb ? 1 : 0,
      weight: DEFAULT_WEIGHTS.pacing,
      note: `${pa ?? 'none'} vs ${pb ?? 'none'}`,
    };
  }
  const ia = PACING_ORDER.indexOf(pa);
  const ib = PACING_ORDER.indexOf(pb);
  // Ordinal distance: 0 steps = 1.0, 1 step = 0.67, 2 steps = 0.33, 3 steps = 0
  const dist = Math.abs(ia - ib);
  const score = clamp01(1 - dist / 3);
  return {
    name: 'pacing',
    score,
    weight: DEFAULT_WEIGHTS.pacing,
    note: `${pa} vs ${pb} (ordinal distance ${dist})`,
  };
}

function scoreNarrative(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const durA = a.meta.duration || 1;
  const durB = b.meta.duration || 1;

  // Proportions of hook, escalation, payoff as fraction of total duration
  const proportions = (spec: VideoSpecV1, dur: number) => [
    (spec.narrative.arc.hook.end - spec.narrative.arc.hook.start) / dur,
    (spec.narrative.arc.escalation.end - spec.narrative.arc.escalation.start) / dur,
    (spec.narrative.arc.payoff.end - spec.narrative.arc.payoff.start) / dur,
  ];

  const pa = proportions(a, durA);
  const pb = proportions(b, durB);
  const score = cosineSimilarity(pa, pb);

  // CTA match bonus/penalty
  const ctaA = !!a.narrative.cta;
  const ctaB = !!b.narrative.cta;
  const ctaMatch = ctaA === ctaB ? 1 : 0;

  const finalScore = clamp01(score * 0.8 + ctaMatch * 0.2);
  return {
    name: 'narrative',
    score: finalScore,
    weight: DEFAULT_WEIGHTS.narrative,
    note: `arc proportions cosine=${score.toFixed(2)}, CTA ${ctaA}/${ctaB}`,
  };
}

function scoreAudio(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  // Compare: transcript presence, music presence, speaker diversity
  let matches = 0;
  let total = 0;

  // Has transcript
  const hasTransA = a.audio.transcript.length > 0;
  const hasTransB = b.audio.transcript.length > 0;
  if (hasTransA === hasTransB) matches++;
  total++;

  // Has music segments
  const hasMusicA = a.audio.music_segments.length > 0;
  const hasMusicB = b.audio.music_segments.length > 0;
  if (hasMusicA === hasMusicB) matches++;
  total++;

  // Has sound effects
  const hasSfxA = a.audio.sound_effects.length > 0;
  const hasSfxB = b.audio.sound_effects.length > 0;
  if (hasSfxA === hasSfxB) matches++;
  total++;

  // Transcript word count similarity
  const wordsA = a.audio.transcript.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const wordsB = b.audio.transcript.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const wordScore = relativeDiffScore(wordsA, wordsB, Math.max(wordsA, wordsB, 1) * 0.3);
  matches += wordScore;
  total++;

  const score = total > 0 ? matches / total : 1;
  return {
    name: 'audio',
    score,
    weight: DEFAULT_WEIGHTS.audio,
    note: `transcript ${hasTransA}/${hasTransB}, music ${hasMusicA}/${hasMusicB}, words ${wordsA}/${wordsB}`,
  };
}

function scoreCaptionDensity(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const densityA = a.meta.duration > 0 ? a.editing.captions.length / a.meta.duration : 0;
  const densityB = b.meta.duration > 0 ? b.editing.captions.length / b.meta.duration : 0;
  const score = relativeDiffScore(densityA, densityB, Math.max(densityA, densityB, 0.01) * 0.3);
  return {
    name: 'captionDensity',
    score,
    weight: DEFAULT_WEIGHTS.captionDensity,
    note: `${densityA.toFixed(3)}/s vs ${densityB.toFixed(3)}/s (${a.editing.captions.length} vs ${b.editing.captions.length} captions)`,
  };
}

function scoreTranscript(a: VideoSpecV1, b: VideoSpecV1): MetricScore {
  const textA = a.audio.transcript.map((s) => s.text).join(' ');
  const textB = b.audio.transcript.map((s) => s.text).join(' ');
  if (!textA && !textB) {
    return {
      name: 'transcript',
      score: 1,
      weight: DEFAULT_WEIGHTS.transcript,
      note: 'both empty',
    };
  }
  if (!textA || !textB) {
    return {
      name: 'transcript',
      score: 0,
      weight: DEFAULT_WEIGHTS.transcript,
      note: `one empty (${textA.length} vs ${textB.length} chars)`,
    };
  }
  const score = bagOfWordsJaccard(textA, textB);
  return {
    name: 'transcript',
    score,
    weight: DEFAULT_WEIGHTS.transcript,
    note: `Jaccard similarity on ${textA.split(/\s+/).length} vs ${textB.split(/\s+/).length} words`,
  };
}

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

/**
 * Compare two VideoSpec.v1 objects and produce a fidelity report.
 *
 * @param original  The reference (source) VideoSpec.
 * @param reconstructed  The VideoSpec to evaluate against the original.
 * @param options  Optional weight overrides.
 * @returns Fidelity report with per-metric scores and aggregate.
 */
export function compareVideoSpecs(
  original: VideoSpecV1,
  reconstructed: VideoSpecV1,
  options?: CompareSpecsOptions
): ReconstructionFidelityReport {
  const metrics: MetricScore[] = [
    scoreDuration(original, reconstructed),
    scoreSceneCount(original, reconstructed),
    scoreSceneDurations(original, reconstructed),
    scorePacing(original, reconstructed),
    scoreNarrative(original, reconstructed),
    scoreAudio(original, reconstructed),
    scoreCaptionDensity(original, reconstructed),
    scoreTranscript(original, reconstructed),
  ];

  // Apply weight overrides
  if (options?.weights) {
    for (const m of metrics) {
      if (options.weights[m.name] !== undefined) {
        m.weight = options.weights[m.name]!;
      }
    }
  }

  // Weighted average
  let weightedSum = 0;
  let totalWeight = 0;
  for (const m of metrics) {
    weightedSum += m.score * m.weight;
    totalWeight += m.weight;
  }
  const aggregate = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return { metrics, aggregate };
}
