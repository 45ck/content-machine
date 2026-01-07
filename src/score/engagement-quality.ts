/**
 * Engagement Quality Metrics
 *
 * Measures engagement-focused quality factors for short-form video content.
 * Layer 4 of the PHOENIX quality pyramid.
 *
 * Metrics:
 * - hookTiming: Hook appears within first 3 seconds
 * - hookEngagement: Hook uses questions, pain points, or intrigue
 * - ctaPresence: Clear CTA at the end
 * - ctaTiming: CTA in final 10% of video
 * - listStructure: For listicles, numbered items are clear
 * - sceneProgression: Scenes flow logically
 */

import type { ScriptOutput } from '../script/schema';
import type { TimestampsOutput, TimestampWord } from '../audio/schema';

// ============================================================================
// Types
// ============================================================================

export interface EngagementQualityReport {
  overallScore: number;
  metrics: {
    hookTiming: number; // 0-100: Hook within first 3s = 100
    hookEngagement: number; // 0-100: Uses hook patterns
    ctaPresence: number; // 0-100: CTA exists = 100
    ctaTiming: number; // 0-100: CTA in final 10%
    listStructure: number; // 0-100: Numbers present for listicles
    sceneProgression: number; // 0-100: Scenes flow logically
  };
  issues: EngagementIssue[];
  details: {
    hookStartTime: number;
    hookText: string;
    ctaText: string;
    ctaStartTime: number;
    totalDuration: number;
    archetype: string;
    numberedItems: number;
    totalScenes: number;
  };
}

export interface EngagementIssue {
  type: EngagementIssueType;
  severity: 'warning' | 'critical';
  message: string;
}

export type EngagementIssueType =
  | 'late-hook'
  | 'weak-hook'
  | 'missing-cta'
  | 'early-cta'
  | 'missing-numbers'
  | 'poor-progression';

// ============================================================================
// Thresholds
// ============================================================================

export const ENGAGEMENT_THRESHOLDS = {
  // Hook must start within this many seconds
  hookMaxStartTime: 3.0,

  // CTA should be in final N% of video
  ctaFinalPercentage: 0.15, // 15%

  // Minimum hook engagement score
  minHookEngagement: 60,

  // Words that indicate engaging hooks
  hookPatterns: [
    /\?$/, // Ends with question
    /^(want|wanna|need|hate|love|stop|don't|never|always)/i,
    /^(did you know|here's|this is|imagine|picture this)/i,
    /^(ugh|ok so|alright|hey|listen)/i,
    /(am I right|you know what|let me tell you)/i,
    /^(number \d|step \d|tip \d|#\d)/i,
  ],

  // CTA patterns
  ctaPatterns: [
    /(follow|subscribe|like|comment|share)/i,
    /(link in bio|check out|go to|visit)/i,
    /(more tips|more hacks|next video|part \d)/i,
    /(let me know|drop a comment|tell me)/i,
  ],

  // Listicle number patterns
  numberPatterns: [
    /^(number|#|tip|step|point|habit|reason|way|thing|mistake)\s*\d/i,
    /^\d\s*[:.)]/, // "1." or "1:" or "1)"
  ],
};

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze engagement quality of video content
 */
export function analyzeEngagementQuality(
  script: ScriptOutput,
  timestamps: TimestampsOutput
): EngagementQualityReport {
  const issues: EngagementIssue[] = [];

  // Get basic info
  const firstScene = timestamps.scenes[0];
  const lastScene = timestamps.scenes[timestamps.scenes.length - 1];
  const allWords = timestamps.scenes.flatMap((s) => s.words);

  const totalDuration =
    allWords.length > 0
      ? allWords[allWords.length - 1].end - allWords[0].start
      : 0;

  // Extract hook and CTA from script
  const hookText = script.hook || script.scenes[0]?.text.split('.')[0] || '';
  const ctaText = script.cta || script.scenes[script.scenes.length - 1]?.text || '';
  const archetype = script.meta?.archetype || 'unknown';

  // Find hook timing (when first words appear)
  const hookStartTime = firstScene?.words[0]?.start || 0;

  // Find CTA timing (when last scene starts)
  const ctaStartTime = lastScene?.words[0]?.start || 0;

  // ========== METRIC 1: Hook Timing ==========
  let hookTimingScore = 100;
  if (hookStartTime > ENGAGEMENT_THRESHOLDS.hookMaxStartTime) {
    hookTimingScore = Math.max(
      0,
      100 - (hookStartTime - ENGAGEMENT_THRESHOLDS.hookMaxStartTime) * 20
    );
    issues.push({
      type: 'late-hook',
      severity: hookStartTime > 5 ? 'critical' : 'warning',
      message: `Hook starts at ${hookStartTime.toFixed(2)}s (target: <${ENGAGEMENT_THRESHOLDS.hookMaxStartTime}s)`,
    });
  }

  // ========== METRIC 2: Hook Engagement ==========
  let hookEngagementScore = 50; // Base score
  const hookPatternMatches = ENGAGEMENT_THRESHOLDS.hookPatterns.filter((p) =>
    p.test(hookText)
  ).length;

  hookEngagementScore = Math.min(100, 50 + hookPatternMatches * 25);

  // Bonus for short, punchy hooks
  const hookWordCount = hookText.split(/\s+/).length;
  if (hookWordCount <= 6) hookEngagementScore = Math.min(100, hookEngagementScore + 10);
  if (hookWordCount <= 4) hookEngagementScore = Math.min(100, hookEngagementScore + 10);

  if (hookEngagementScore < ENGAGEMENT_THRESHOLDS.minHookEngagement) {
    issues.push({
      type: 'weak-hook',
      severity: 'warning',
      message: `Hook engagement score: ${hookEngagementScore}% (needs questions/pain points)`,
    });
  }

  // ========== METRIC 3: CTA Presence ==========
  let ctaPresenceScore = 0;
  const ctaPatternMatches = ENGAGEMENT_THRESHOLDS.ctaPatterns.filter((p) =>
    p.test(ctaText)
  ).length;

  if (ctaPatternMatches > 0) {
    ctaPresenceScore = Math.min(100, 50 + ctaPatternMatches * 25);
  } else {
    issues.push({
      type: 'missing-cta',
      severity: 'warning',
      message: 'No clear CTA detected (follow/subscribe/link patterns)',
    });
  }

  // ========== METRIC 4: CTA Timing ==========
  let ctaTimingScore = 100;
  const ctaPositionRatio = totalDuration > 0 ? ctaStartTime / totalDuration : 0;

  if (ctaPositionRatio < 1 - ENGAGEMENT_THRESHOLDS.ctaFinalPercentage) {
    // CTA is not in final 15%
    ctaTimingScore = Math.max(0, ctaPositionRatio * 100);
    if (ctaPositionRatio < 0.7) {
      issues.push({
        type: 'early-cta',
        severity: 'warning',
        message: `CTA at ${(ctaPositionRatio * 100).toFixed(0)}% of video (should be final 15%)`,
      });
    }
  }

  // ========== METRIC 5: List Structure (for listicles) ==========
  let listStructureScore = 100; // Default 100 for non-listicles
  let numberedItems = 0;

  if (archetype === 'listicle') {
    // Count scenes with number patterns
    for (const scene of script.scenes) {
      const hasNumber = ENGAGEMENT_THRESHOLDS.numberPatterns.some((p) =>
        p.test(scene.text)
      );
      if (hasNumber) numberedItems++;
    }

    // Expect at least 3 numbered items for a listicle
    const expectedItems = Math.max(3, script.scenes.length - 2); // Exclude intro/outro
    listStructureScore = Math.min(100, (numberedItems / expectedItems) * 100);

    if (numberedItems === 0) {
      issues.push({
        type: 'missing-numbers',
        severity: 'critical',
        message: 'Listicle has no numbered items detected',
      });
    } else if (numberedItems < 3) {
      issues.push({
        type: 'missing-numbers',
        severity: 'warning',
        message: `Only ${numberedItems} numbered items detected (expected 3+)`,
      });
    }
  }

  // ========== METRIC 6: Scene Progression ==========
  let sceneProgressionScore = 100;
  const sceneCount = timestamps.scenes.length;

  // Check for reasonable scene count (3-8 for shorts)
  if (sceneCount < 3) {
    sceneProgressionScore = 60;
    issues.push({
      type: 'poor-progression',
      severity: 'warning',
      message: `Only ${sceneCount} scenes (target: 3-8 for shorts)`,
    });
  } else if (sceneCount > 10) {
    sceneProgressionScore = 80;
    issues.push({
      type: 'poor-progression',
      severity: 'warning',
      message: `${sceneCount} scenes may feel rushed (target: 3-8)`,
    });
  }

  // Check scene duration variance
  const sceneDurations = timestamps.scenes.map((s) => {
    const words = s.words;
    if (words.length === 0) return 0;
    return words[words.length - 1].end - words[0].start;
  });

  const avgDuration =
    sceneDurations.reduce((a, b) => a + b, 0) / sceneDurations.length;
  const maxDeviation = Math.max(
    ...sceneDurations.map((d) => Math.abs(d - avgDuration))
  );

  // Large deviation indicates poor balance
  if (maxDeviation > avgDuration * 2) {
    sceneProgressionScore = Math.max(60, sceneProgressionScore - 20);
  }

  // ========== CALCULATE OVERALL SCORE ==========
  const weights = {
    hookTiming: 0.2,
    hookEngagement: 0.15,
    ctaPresence: 0.2,
    ctaTiming: 0.1,
    listStructure: 0.2,
    sceneProgression: 0.15,
  };

  const overallScore =
    hookTimingScore * weights.hookTiming +
    hookEngagementScore * weights.hookEngagement +
    ctaPresenceScore * weights.ctaPresence +
    ctaTimingScore * weights.ctaTiming +
    listStructureScore * weights.listStructure +
    sceneProgressionScore * weights.sceneProgression;

  return {
    overallScore,
    metrics: {
      hookTiming: hookTimingScore,
      hookEngagement: hookEngagementScore,
      ctaPresence: ctaPresenceScore,
      ctaTiming: ctaTimingScore,
      listStructure: listStructureScore,
      sceneProgression: sceneProgressionScore,
    },
    issues,
    details: {
      hookStartTime,
      hookText,
      ctaText,
      ctaStartTime,
      totalDuration,
      archetype,
      numberedItems,
      totalScenes: sceneCount,
    },
  };
}

/**
 * Format engagement quality report for CLI output
 */
export function formatEngagementReport(report: EngagementQualityReport): string {
  const lines: string[] = [
    '=== Engagement Quality Report ===',
    `Overall Score: ${report.overallScore.toFixed(1)}%`,
    `Status: ${report.overallScore >= 75 ? '✅ PASSED' : '❌ NEEDS WORK'}`,
    '',
    'Metrics:',
    `  ${report.metrics.hookTiming >= 80 ? '✔' : '✖'} hookTiming: ${report.metrics.hookTiming.toFixed(1)}%`,
    `  ${report.metrics.hookEngagement >= 60 ? '✔' : '✖'} hookEngagement: ${report.metrics.hookEngagement.toFixed(1)}%`,
    `  ${report.metrics.ctaPresence >= 50 ? '✔' : '✖'} ctaPresence: ${report.metrics.ctaPresence.toFixed(1)}%`,
    `  ${report.metrics.ctaTiming >= 80 ? '✔' : '✖'} ctaTiming: ${report.metrics.ctaTiming.toFixed(1)}%`,
    `  ${report.metrics.listStructure >= 80 ? '✔' : '✖'} listStructure: ${report.metrics.listStructure.toFixed(1)}%`,
    `  ${report.metrics.sceneProgression >= 80 ? '✔' : '✖'} sceneProgression: ${report.metrics.sceneProgression.toFixed(1)}%`,
    '',
    'Details:',
    `  Hook: "${report.details.hookText}"`,
    `  Hook starts at: ${report.details.hookStartTime.toFixed(2)}s`,
    `  CTA: "${report.details.ctaText.slice(0, 50)}${report.details.ctaText.length > 50 ? '...' : ''}"`,
    `  CTA at: ${report.details.ctaStartTime.toFixed(2)}s / ${report.details.totalDuration.toFixed(2)}s`,
    `  Archetype: ${report.details.archetype}`,
    `  Numbered items: ${report.details.numberedItems}`,
    `  Total scenes: ${report.details.totalScenes}`,
  ];

  if (report.issues.length > 0) {
    lines.push('', `Issues (${report.issues.length}):`);
    for (const issue of report.issues) {
      const icon = issue.severity === 'critical' ? '❌' : '⚠️';
      lines.push(`  ${icon} [${issue.type}] ${issue.message}`);
    }
  }

  return lines.join('\n');
}
