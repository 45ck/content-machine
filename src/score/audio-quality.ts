/**
 * Audio Quality Metrics
 *
 * Measures audio-focused quality factors for short-form video content.
 * Layer 5 of the PHOENIX quality pyramid.
 *
 * Metrics:
 * - silenceGaps: Detects unnatural silence gaps between words
 * - overlapDetection: Detects overlapping word timings (audio corruption)
 * - paceConsistency: Measures pace variation within scenes
 * - breathingRoom: Ensures pauses at natural speech boundaries
 * - wordBoundaryAccuracy: Words align with expected boundaries
 */

import type { TimestampsOutput, TimestampWord, TimestampScene } from '../audio/schema';

// ============================================================================
// Types
// ============================================================================

export interface AudioQualityReport {
  overallScore: number;
  metrics: {
    silenceGaps: number; // 0-100: No unnatural gaps = 100
    overlapFree: number; // 0-100: No overlaps = 100
    paceConsistency: number; // 0-100: Consistent pace = 100
    breathingRoom: number; // 0-100: Natural pauses present = 100
    transitionSmoothness: number; // 0-100: Scene transitions smooth = 100
  };
  issues: AudioIssue[];
  details: {
    totalWords: number;
    totalDuration: number;
    avgGapMs: number;
    maxGapMs: number;
    overlapsFound: number;
    pausesFound: number;
    expectedPauses: number;
    sceneTransitions: number;
    abruptTransitions: number;
  };
}

export interface AudioIssue {
  type: AudioIssueType;
  severity: 'warning' | 'critical';
  message: string;
  timestamp?: number;
  wordContext?: string;
}

export type AudioIssueType =
  | 'silence-gap'
  | 'word-overlap'
  | 'pace-spike'
  | 'missing-pause'
  | 'abrupt-transition'
  | 'rushed-speech';

// ============================================================================
// Thresholds
// ============================================================================

export const AUDIO_THRESHOLDS = {
  // Gap thresholds (ms)
  minGapMs: 0, // Words can touch
  maxNaturalGapMs: 500, // Normal between-word gap
  unnaturalGapMs: 800, // Suspicious silence
  extremeGapMs: 1500, // Definitely wrong

  // Pause thresholds (for sentence/clause boundaries)
  minPauseMs: 200, // Minimum pause at punctuation
  idealPauseMs: 400, // Ideal pause at periods
  maxPauseMs: 1000, // Maximum pause (else awkward)

  // Overlap threshold
  maxOverlapMs: 10, // Allow tiny overlap from ASR noise

  // Pace thresholds
  minWpm: 100, // Too slow
  maxWpm: 250, // Too fast
  paceVarianceThreshold: 0.4, // 40% variance is concerning

  // Scene transition
  minSceneGapMs: 100, // Minimum gap between scenes
  maxSceneGapMs: 1000, // Maximum gap between scenes

  // Punctuation patterns (need pauses after)
  pauseRequiredAfter: /[.!?;:]$/,
  pauseOptionalAfter: /[,]$/,
};

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze audio quality from timestamps
 */
export function analyzeAudioQuality(
  timestamps: TimestampsOutput
): AudioQualityReport {
  const issues: AudioIssue[] = [];
  const allWords = timestamps.scenes.flatMap((s) => s.words);

  if (allWords.length === 0) {
    return {
      overallScore: 0,
      metrics: {
        silenceGaps: 0,
        overlapFree: 100,
        paceConsistency: 0,
        breathingRoom: 0,
        transitionSmoothness: 100,
      },
      issues: [
        {
          type: 'silence-gap',
          severity: 'critical',
          message: 'No words found in timestamps',
        },
      ],
      details: {
        totalWords: 0,
        totalDuration: 0,
        avgGapMs: 0,
        maxGapMs: 0,
        overlapsFound: 0,
        pausesFound: 0,
        expectedPauses: 0,
        sceneTransitions: 0,
        abruptTransitions: 0,
      },
    };
  }

  const totalDuration = allWords[allWords.length - 1].end - allWords[0].start;

  // ========== METRIC 1: Silence Gaps ==========
  const gaps: number[] = [];
  let unnaturalGaps = 0;

  for (let i = 1; i < allWords.length; i++) {
    const gap = (allWords[i].start - allWords[i - 1].end) * 1000; // Convert to ms
    gaps.push(gap);

    if (gap > AUDIO_THRESHOLDS.unnaturalGapMs) {
      unnaturalGaps++;
      const severity =
        gap > AUDIO_THRESHOLDS.extremeGapMs ? 'critical' : 'warning';
      issues.push({
        type: 'silence-gap',
        severity,
        message: `Unnatural gap of ${gap.toFixed(0)}ms after "${allWords[i - 1].word}"`,
        timestamp: allWords[i - 1].end,
        wordContext: `${allWords[i - 1].word} [...] ${allWords[i].word}`,
      });
    }
  }

  const avgGapMs =
    gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const maxGapMs = gaps.length > 0 ? Math.max(...gaps) : 0;

  // Score: 100 if no unnatural gaps, decrease by 10 per gap
  const silenceGapsScore = Math.max(0, 100 - unnaturalGaps * 10);

  // ========== METRIC 2: Overlap Detection ==========
  let overlapsFound = 0;

  for (let i = 1; i < allWords.length; i++) {
    const overlap = (allWords[i - 1].end - allWords[i].start) * 1000;
    if (overlap > AUDIO_THRESHOLDS.maxOverlapMs) {
      overlapsFound++;
      issues.push({
        type: 'word-overlap',
        severity: 'critical',
        message: `Word overlap of ${overlap.toFixed(0)}ms: "${allWords[i - 1].word}" overlaps "${allWords[i].word}"`,
        timestamp: allWords[i].start,
        wordContext: `${allWords[i - 1].word} <overlap> ${allWords[i].word}`,
      });
    }
  }

  const overlapFreeScore = overlapsFound === 0 ? 100 : Math.max(0, 100 - overlapsFound * 20);

  // ========== METRIC 3: Pace Consistency ==========
  const scenePaces: number[] = [];

  for (const scene of timestamps.scenes) {
    if (scene.words.length === 0) continue;
    const sceneDuration =
      scene.words[scene.words.length - 1].end - scene.words[0].start;
    if (sceneDuration > 0.5) {
      // Only count scenes with >0.5s
      const wpm = (scene.words.length / sceneDuration) * 60;
      scenePaces.push(wpm);

      if (wpm > AUDIO_THRESHOLDS.maxWpm) {
        issues.push({
          type: 'rushed-speech',
          severity: 'warning',
          message: `Scene "${scene.sceneId}" is rushed at ${wpm.toFixed(0)} WPM`,
          timestamp: scene.words[0].start,
        });
      } else if (wpm < AUDIO_THRESHOLDS.minWpm) {
        issues.push({
          type: 'pace-spike',
          severity: 'warning',
          message: `Scene "${scene.sceneId}" is too slow at ${wpm.toFixed(0)} WPM`,
          timestamp: scene.words[0].start,
        });
      }
    }
  }

  // Calculate coefficient of variation for pace
  const avgPace =
    scenePaces.length > 0
      ? scenePaces.reduce((a, b) => a + b, 0) / scenePaces.length
      : 0;
  const paceStdDev =
    scenePaces.length > 1
      ? Math.sqrt(
          scenePaces.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) /
            scenePaces.length
        )
      : 0;
  const paceCV = avgPace > 0 ? paceStdDev / avgPace : 0;

  const paceConsistencyScore =
    paceCV <= AUDIO_THRESHOLDS.paceVarianceThreshold
      ? 100
      : Math.max(0, 100 - (paceCV - AUDIO_THRESHOLDS.paceVarianceThreshold) * 200);

  // ========== METRIC 4: Breathing Room (pauses at punctuation) ==========
  let expectedPauses = 0;
  let pausesFound = 0;

  for (let i = 0; i < allWords.length - 1; i++) {
    const word = allWords[i];
    if (AUDIO_THRESHOLDS.pauseRequiredAfter.test(word.word)) {
      expectedPauses++;
      const gapMs = (allWords[i + 1].start - word.end) * 1000;
      if (gapMs >= AUDIO_THRESHOLDS.minPauseMs) {
        pausesFound++;
      } else {
        issues.push({
          type: 'missing-pause',
          severity: 'warning',
          message: `Missing pause after "${word.word}" (${gapMs.toFixed(0)}ms, expected >=${AUDIO_THRESHOLDS.minPauseMs}ms)`,
          timestamp: word.end,
        });
      }
    }
  }

  const breathingRoomScore =
    expectedPauses > 0
      ? Math.round((pausesFound / expectedPauses) * 100)
      : 100; // No punctuation = assume OK

  // ========== METRIC 5: Scene Transition Smoothness ==========
  let sceneTransitions = 0;
  let abruptTransitions = 0;

  for (let i = 1; i < timestamps.scenes.length; i++) {
    const prevScene = timestamps.scenes[i - 1];
    const currScene = timestamps.scenes[i];

    if (prevScene.words.length === 0 || currScene.words.length === 0) continue;

    const gapMs =
      (currScene.words[0].start -
        prevScene.words[prevScene.words.length - 1].end) *
      1000;
    sceneTransitions++;

    if (gapMs < AUDIO_THRESHOLDS.minSceneGapMs) {
      abruptTransitions++;
      issues.push({
        type: 'abrupt-transition',
        severity: 'warning',
        message: `Abrupt transition between scenes (${gapMs.toFixed(0)}ms gap)`,
        timestamp: currScene.words[0].start,
      });
    } else if (gapMs > AUDIO_THRESHOLDS.maxSceneGapMs) {
      issues.push({
        type: 'silence-gap',
        severity: 'warning',
        message: `Long gap between scenes (${gapMs.toFixed(0)}ms)`,
        timestamp: currScene.words[0].start,
      });
    }
  }

  const transitionSmoothnessScore =
    sceneTransitions > 0
      ? Math.round(((sceneTransitions - abruptTransitions) / sceneTransitions) * 100)
      : 100;

  // ========== CALCULATE OVERALL SCORE ==========
  const weights = {
    silenceGaps: 0.25,
    overlapFree: 0.25,
    paceConsistency: 0.2,
    breathingRoom: 0.15,
    transitionSmoothness: 0.15,
  };

  const overallScore =
    silenceGapsScore * weights.silenceGaps +
    overlapFreeScore * weights.overlapFree +
    paceConsistencyScore * weights.paceConsistency +
    breathingRoomScore * weights.breathingRoom +
    transitionSmoothnessScore * weights.transitionSmoothness;

  return {
    overallScore,
    metrics: {
      silenceGaps: silenceGapsScore,
      overlapFree: overlapFreeScore,
      paceConsistency: paceConsistencyScore,
      breathingRoom: breathingRoomScore,
      transitionSmoothness: transitionSmoothnessScore,
    },
    issues,
    details: {
      totalWords: allWords.length,
      totalDuration,
      avgGapMs,
      maxGapMs,
      overlapsFound,
      pausesFound,
      expectedPauses,
      sceneTransitions,
      abruptTransitions,
    },
  };
}

/**
 * Format audio quality report for CLI output
 */
export function formatAudioReport(report: AudioQualityReport): string {
  const lines: string[] = [
    '=== Audio Quality Report ===',
    `Overall Score: ${report.overallScore.toFixed(1)}%`,
    `Status: ${report.overallScore >= 75 ? '✅ PASSED' : '❌ NEEDS WORK'}`,
    '',
    'Metrics:',
    `  ${report.metrics.silenceGaps >= 80 ? '✔' : '✖'} silenceGaps: ${report.metrics.silenceGaps.toFixed(1)}%`,
    `  ${report.metrics.overlapFree >= 100 ? '✔' : '✖'} overlapFree: ${report.metrics.overlapFree.toFixed(1)}%`,
    `  ${report.metrics.paceConsistency >= 80 ? '✔' : '✖'} paceConsistency: ${report.metrics.paceConsistency.toFixed(1)}%`,
    `  ${report.metrics.breathingRoom >= 60 ? '✔' : '✖'} breathingRoom: ${report.metrics.breathingRoom.toFixed(1)}%`,
    `  ${report.metrics.transitionSmoothness >= 80 ? '✔' : '✖'} transitionSmoothness: ${report.metrics.transitionSmoothness.toFixed(1)}%`,
    '',
    'Details:',
    `  Total words: ${report.details.totalWords}`,
    `  Duration: ${report.details.totalDuration.toFixed(2)}s`,
    `  Avg gap: ${report.details.avgGapMs.toFixed(0)}ms`,
    `  Max gap: ${report.details.maxGapMs.toFixed(0)}ms`,
    `  Overlaps: ${report.details.overlapsFound}`,
    `  Pauses found/expected: ${report.details.pausesFound}/${report.details.expectedPauses}`,
    `  Scene transitions: ${report.details.sceneTransitions}`,
    `  Abrupt transitions: ${report.details.abruptTransitions}`,
  ];

  if (report.issues.length > 0) {
    lines.push('', `Issues (${report.issues.length}):`);
    for (const issue of report.issues.slice(0, 10)) {
      // Limit to 10 issues
      const icon = issue.severity === 'critical' ? '❌' : '⚠️';
      lines.push(`  ${icon} [${issue.type}] ${issue.message}`);
    }
    if (report.issues.length > 10) {
      lines.push(`  ... and ${report.issues.length - 10} more issues`);
    }
  }

  return lines.join('\n');
}
