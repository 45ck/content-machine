import type { EvaluationReport, FeatureVector } from '../domain';
import type { QualityScoreResult } from '../quality-score/scorer';

export interface UncertaintyRanking {
  videoPath: string;
  uncertaintyScore: number;
  reason: string;
  overallScore?: number;
}

export interface QualityUncertaintyRanking {
  videoId: string;
  uncertaintyScore: number;
  diversityScore: number;
  combinedScore: number;
}

export interface QualityUncertaintyScorer {
  scoreQuality(options: {
    features: FeatureVector;
    heuristic: boolean;
  }): Promise<QualityScoreResult>;
}

/**
 * Rank evaluation reports by uncertainty for active learning.
 * Higher uncertainty = more valuable for human annotation.
 */
export function rankByUncertainty(reports: EvaluationReport[]): UncertaintyRanking[] {
  const rankings: UncertaintyRanking[] = [];

  for (const report of reports) {
    let uncertaintyScore = 0;
    let reason = '';

    const overallScore = report.overall?.score;

    // Heuristic 1: Overall score near 0.5 (borderline cases)
    if (overallScore !== undefined) {
      const distance = Math.abs(overallScore - 0.5);
      const borderlineScore = 1 - distance * 2; // Max at 0.5, decreases linearly
      uncertaintyScore += borderlineScore * 0.5; // Weight: 50%

      if (borderlineScore > 0.7) {
        reason = 'borderline overall score';
      }
    }

    // Heuristic 2: High disagreement among checks (some pass, some fail)
    const activeChecks = report.checks.filter((c) => !c.skipped);
    if (activeChecks.length > 0) {
      const passRate = activeChecks.filter((c) => c.passed).length / activeChecks.length;
      const disagreementScore = 1 - Math.abs(passRate - 0.5) * 2; // Max when 50% pass
      uncertaintyScore += disagreementScore * 0.5; // Weight: 50%

      if (disagreementScore > 0.7 && !reason) {
        reason = 'mixed check results';
      }
    }

    if (!reason) {
      reason = 'low uncertainty';
    }

    rankings.push({
      videoPath: report.videoPath,
      uncertaintyScore,
      reason,
      overallScore,
    });
  }

  // Sort by uncertainty score descending (highest uncertainty first)
  rankings.sort((a, b) => b.uncertaintyScore - a.uncertaintyScore);

  return rankings;
}

/**
 * Rank feature vectors by quality score uncertainty for active learning.
 * Samples closest to the decision boundary (score near 50) are most valuable.
 * Optionally incorporates CLIP embedding diversity.
 */
export async function rankByQualityUncertainty(
  features: FeatureVector[],
  scorer: QualityUncertaintyScorer,
  labeledEmbeddings?: number[][]
): Promise<QualityUncertaintyRanking[]> {
  const scored = await Promise.all(
    features.map(async (f) => {
      const result = await scorer.scoreQuality({ features: f, heuristic: true });
      return { feature: f, result };
    })
  );

  const rankings: QualityUncertaintyRanking[] = scored.map(({ feature, result }) => {
    // Uncertainty: proximity to decision boundary (score=50)
    const uncertaintyScore = 1 - Math.abs(result.score - 50) / 50;

    // Diversity: if CLIP embeddings present, compute min distance to labeled set
    let diversityScore = 0;
    if (feature.clipEmbedding?.length && labeledEmbeddings?.length) {
      const minDist = Math.min(
        ...labeledEmbeddings.map((le) => euclideanDistance(feature.clipEmbedding!, le))
      );
      // Normalize: CLIP embeddings are L2-normalized, max distance ~2 for antipodal vectors
      diversityScore = Math.min(1, minDist / 2);
    }

    const combinedScore = uncertaintyScore * 0.7 + diversityScore * 0.3;

    return {
      videoId: feature.videoId,
      uncertaintyScore,
      diversityScore,
      combinedScore,
    };
  });

  rankings.sort((a, b) => b.combinedScore - a.combinedScore);
  return rankings;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
