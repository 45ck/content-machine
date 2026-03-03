import type { EvaluationReport, ComparisonReport, ComparisonCheckDiff } from '../domain';

/** Compares two evaluation reports and returns regressions, improvements, and score delta. */
export function compareReports(
  previous: EvaluationReport,
  current: EvaluationReport
): ComparisonReport {
  const regressions: ComparisonCheckDiff[] = [];
  const improvements: ComparisonCheckDiff[] = [];
  const unchanged: ComparisonCheckDiff[] = [];

  const prevMap = new Map(previous.checks.filter((c) => !c.skipped).map((c) => [c.checkId, c]));
  const currMap = new Map(current.checks.filter((c) => !c.skipped).map((c) => [c.checkId, c]));

  // Compare checks present in both reports
  const allCheckIds = new Set([...prevMap.keys(), ...currMap.keys()]);

  for (const checkId of allCheckIds) {
    const prev = prevMap.get(checkId);
    const curr = currMap.get(checkId);

    if (!prev || !curr) continue; // skip checks only in one report

    const diff: ComparisonCheckDiff = {
      checkId,
      previousPassed: prev.passed,
      currentPassed: curr.passed,
    };

    if (prev.passed && !curr.passed) {
      regressions.push(diff);
    } else if (!prev.passed && curr.passed) {
      improvements.push(diff);
    } else {
      unchanged.push(diff);
    }
  }

  const previousScore = previous.overall?.score;
  const currentScore = current.overall?.score;
  const scoreDelta =
    previousScore != null && currentScore != null ? currentScore - previousScore : 0;

  return {
    regressions,
    improvements,
    unchanged,
    previousScore,
    currentScore,
    scoreDelta,
  };
}
