import type { EvaluationReport } from '../domain';

export interface UncertaintyRanking {
  videoPath: string;
  uncertaintyScore: number;
  reason: string;
  overallScore?: number;
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
