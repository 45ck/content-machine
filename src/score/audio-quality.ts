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

import type { SceneTimestamp, TimestampsOutput } from '../audio/schema';

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

type TimestampWord = SceneTimestamp['words'][number];

function normalizeScenes(timestamps: TimestampsOutput): SceneTimestamp[] {
  if (timestamps.scenes && timestamps.scenes.length > 0) return timestamps.scenes;
  if (timestamps.allWords.length === 0) return [];

  return [
    {
      sceneId: 'scene-001',
      audioStart: timestamps.allWords[0].start,
      audioEnd: timestamps.allWords[timestamps.allWords.length - 1].end,
      words: timestamps.allWords,
    },
  ];
}

function summarizeWords(words: TimestampWord[]): { totalDuration: number } {
  if (words.length === 0) return { totalDuration: 0 };
  return { totalDuration: words[words.length - 1].end - words[0].start };
}

function analyzeSilenceGaps(words: TimestampWord[], issues: AudioIssue[]): {
  silenceGapsScore: number;
  avgGapMs: number;
  maxGapMs: number;
} {
  const gapsMs: number[] = [];
  let unnaturalGaps = 0;

  for (let i = 1; i < words.length; i++) {
    const gapMs = (words[i].start - words[i - 1].end) * 1000;
    gapsMs.push(gapMs);

    if (gapMs > AUDIO_THRESHOLDS.unnaturalGapMs) {
      unnaturalGaps++;
      issues.push({
        type: 'silence-gap',
        severity: gapMs > AUDIO_THRESHOLDS.extremeGapMs ? 'critical' : 'warning',
        message: `Unnatural gap of ${gapMs.toFixed(0)}ms after "${words[i - 1].word}"`,
        timestamp: words[i - 1].end,
        wordContext: `${words[i - 1].word} [...] ${words[i].word}`,
      });
    }
  }

  const avgGapMs = gapsMs.length > 0 ? gapsMs.reduce((a, b) => a + b, 0) / gapsMs.length : 0;
  const maxGapMs = gapsMs.length > 0 ? Math.max(...gapsMs) : 0;
  const silenceGapsScore = Math.max(0, 100 - unnaturalGaps * 10);

  return { silenceGapsScore, avgGapMs, maxGapMs };
}

function analyzeOverlaps(words: TimestampWord[], issues: AudioIssue[]): {
  overlapFreeScore: number;
  overlapsFound: number;
} {
  let overlapsFound = 0;

  for (let i = 1; i < words.length; i++) {
    const overlapMs = (words[i - 1].end - words[i].start) * 1000;
    if (overlapMs <= AUDIO_THRESHOLDS.maxOverlapMs) continue;

    overlapsFound++;
    issues.push({
      type: 'word-overlap',
      severity: 'critical',
      message: `Word overlap of ${overlapMs.toFixed(0)}ms: "${words[i - 1].word}" overlaps "${words[i].word}"`,
      timestamp: words[i].start,
      wordContext: `${words[i - 1].word} <overlap> ${words[i].word}`,
    });
  }

  const overlapFreeScore = overlapsFound === 0 ? 100 : Math.max(0, 100 - overlapsFound * 20);
  return { overlapFreeScore, overlapsFound };
}

function analyzePaceConsistency(scenes: SceneTimestamp[], issues: AudioIssue[]): number {
  const scenePaces: number[] = [];

  for (const scene of scenes) {
    if (scene.words.length === 0) continue;

    const durationSeconds = scene.words[scene.words.length - 1].end - scene.words[0].start;
    if (durationSeconds <= 0.5) continue;

    const wpm = (scene.words.length / durationSeconds) * 60;
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

  const avgPace = scenePaces.length > 0 ? scenePaces.reduce((a, b) => a + b, 0) / scenePaces.length : 0;
  const paceStdDev =
    scenePaces.length > 1
      ? Math.sqrt(scenePaces.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) / scenePaces.length)
      : 0;

  const paceCv = avgPace > 0 ? paceStdDev / avgPace : 0;
  if (paceCv <= AUDIO_THRESHOLDS.paceVarianceThreshold) return 100;
  return Math.max(0, 100 - (paceCv - AUDIO_THRESHOLDS.paceVarianceThreshold) * 200);
}

function analyzeBreathingRoom(words: TimestampWord[], issues: AudioIssue[]): {
  breathingRoomScore: number;
  expectedPauses: number;
  pausesFound: number;
} {
  let expectedPauses = 0;
  let pausesFound = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    if (!AUDIO_THRESHOLDS.pauseRequiredAfter.test(current.word)) continue;

    expectedPauses++;
    const gapMs = (words[i + 1].start - current.end) * 1000;
    if (gapMs >= AUDIO_THRESHOLDS.minPauseMs) {
      pausesFound++;
      continue;
    }

    issues.push({
      type: 'missing-pause',
      severity: 'warning',
      message: `Missing pause after "${current.word}" (${gapMs.toFixed(0)}ms, expected >=${AUDIO_THRESHOLDS.minPauseMs}ms)`,
      timestamp: current.end,
    });
  }

  const breathingRoomScore = expectedPauses > 0 ? Math.round((pausesFound / expectedPauses) * 100) : 100;
  return { breathingRoomScore, expectedPauses, pausesFound };
}

function analyzeTransitions(scenes: SceneTimestamp[], issues: AudioIssue[]): {
  transitionSmoothnessScore: number;
  sceneTransitions: number;
  abruptTransitions: number;
} {
  let sceneTransitions = 0;
  let abruptTransitions = 0;

  for (let i = 1; i < scenes.length; i++) {
    const prevScene = scenes[i - 1];
    const currScene = scenes[i];

    if (prevScene.words.length === 0 || currScene.words.length === 0) continue;

    const gapMs = (currScene.words[0].start - prevScene.words[prevScene.words.length - 1].end) * 1000;
    sceneTransitions++;

    if (gapMs < AUDIO_THRESHOLDS.minSceneGapMs) {
      abruptTransitions++;
      issues.push({
        type: 'abrupt-transition',
        severity: 'warning',
        message: `Abrupt transition between scenes (${gapMs.toFixed(0)}ms gap)`,
        timestamp: currScene.words[0].start,
      });
      continue;
    }

    if (gapMs > AUDIO_THRESHOLDS.maxSceneGapMs) {
      issues.push({
        type: 'silence-gap',
        severity: 'warning',
        message: `Long gap between scenes (${gapMs.toFixed(0)}ms)`,
        timestamp: currScene.words[0].start,
      });
    }
  }

  const transitionSmoothnessScore =
    sceneTransitions > 0 ? Math.round(((sceneTransitions - abruptTransitions) / sceneTransitions) * 100) : 100;

  return { transitionSmoothnessScore, sceneTransitions, abruptTransitions };
}

/**
 * Analyze audio quality from timestamps
 */
export function analyzeAudioQuality(
  timestamps: TimestampsOutput
): AudioQualityReport {
  const issues: AudioIssue[] = [];

  const scenes = normalizeScenes(timestamps);
  const allWords = scenes.flatMap((s) => s.words);
  const { totalDuration } = summarizeWords(allWords);

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

  const { silenceGapsScore, avgGapMs, maxGapMs } = analyzeSilenceGaps(allWords, issues);
  const { overlapFreeScore, overlapsFound } = analyzeOverlaps(allWords, issues);
  const paceConsistencyScore = analyzePaceConsistency(scenes, issues);
  const { breathingRoomScore, expectedPauses, pausesFound } = analyzeBreathingRoom(allWords, issues);
  const { transitionSmoothnessScore, sceneTransitions, abruptTransitions } = analyzeTransitions(scenes, issues);

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
