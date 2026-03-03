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

import type { SceneTimestamp, ScriptOutput, TimestampsOutput } from '../domain';
import { normalizeScenes, summarizeWords } from './timestamps';

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

function extractHookText(script: ScriptOutput): string {
  return script.hook || script.scenes[0]?.text.split('.')[0] || '';
}

function extractCtaText(script: ScriptOutput): string {
  return script.cta || script.scenes[script.scenes.length - 1]?.text || '';
}

function scoreHookTiming(hookStartTime: number, issues: EngagementIssue[]): number {
  if (hookStartTime <= ENGAGEMENT_THRESHOLDS.hookMaxStartTime) return 100;

  const score = Math.max(0, 100 - (hookStartTime - ENGAGEMENT_THRESHOLDS.hookMaxStartTime) * 20);
  issues.push({
    type: 'late-hook',
    severity: hookStartTime > 5 ? 'critical' : 'warning',
    message: `Hook starts at ${hookStartTime.toFixed(2)}s (target: <${ENGAGEMENT_THRESHOLDS.hookMaxStartTime}s)`,
  });
  return score;
}

function scoreHookEngagement(hookText: string, issues: EngagementIssue[]): number {
  const matches = ENGAGEMENT_THRESHOLDS.hookPatterns.filter((p) => p.test(hookText)).length;

  let score = Math.min(100, 50 + matches * 25);
  const hookWordCount = hookText.split(/\s+/).filter(Boolean).length;
  if (hookWordCount <= 6) score = Math.min(100, score + 10);
  if (hookWordCount <= 4) score = Math.min(100, score + 10);

  if (score < ENGAGEMENT_THRESHOLDS.minHookEngagement) {
    issues.push({
      type: 'weak-hook',
      severity: 'warning',
      message: `Hook engagement score: ${score}% (needs questions/pain points)`,
    });
  }

  return score;
}

function scoreCtaPresence(ctaText: string, issues: EngagementIssue[]): number {
  const matches = ENGAGEMENT_THRESHOLDS.ctaPatterns.filter((p) => p.test(ctaText)).length;
  if (matches > 0) return Math.min(100, 50 + matches * 25);

  issues.push({
    type: 'missing-cta',
    severity: 'warning',
    message: 'No clear CTA detected (follow/subscribe/link patterns)',
  });
  return 0;
}

function scoreCtaTiming(
  ctaStartTime: number,
  totalDuration: number,
  issues: EngagementIssue[]
): number {
  const positionRatio = totalDuration > 0 ? ctaStartTime / totalDuration : 0;
  if (positionRatio >= 1 - ENGAGEMENT_THRESHOLDS.ctaFinalPercentage) return 100;

  const score = Math.max(0, positionRatio * 100);
  if (positionRatio < 0.7) {
    issues.push({
      type: 'early-cta',
      severity: 'warning',
      message: `CTA at ${(positionRatio * 100).toFixed(0)}% of video (should be final 15%)`,
    });
  }
  return score;
}

function scoreListStructure(
  script: ScriptOutput,
  _archetype: string,
  issues: EngagementIssue[]
): { listStructureScore: number; numberedItems: number } {
  let numberedItems = 0;
  for (const scene of script.scenes) {
    if (ENGAGEMENT_THRESHOLDS.numberPatterns.some((p) => p.test(scene.text))) numberedItems++;
  }

  // Only score list structure when the script actually looks list-like.
  // Avoid coupling behavior to a specific archetype id.
  if (numberedItems === 0) return { listStructureScore: 100, numberedItems: 0 };

  const expectedItems = Math.max(3, script.scenes.length - 2);
  const score = Math.min(100, (numberedItems / expectedItems) * 100);

  if (numberedItems < 3) {
    issues.push({
      type: 'missing-numbers',
      severity: 'warning',
      message: `Only ${numberedItems} numbered items detected (expected 3+)`,
    });
  }

  return { listStructureScore: score, numberedItems };
}

function scoreSceneProgression(scenes: SceneTimestamp[], issues: EngagementIssue[]): number {
  let score = 100;
  const sceneCount = scenes.length;

  if (sceneCount < 3) {
    score = 60;
    issues.push({
      type: 'poor-progression',
      severity: 'warning',
      message: `Only ${sceneCount} scenes (target: 3-8 for shorts)`,
    });
  } else if (sceneCount > 10) {
    score = 80;
    issues.push({
      type: 'poor-progression',
      severity: 'warning',
      message: `${sceneCount} scenes may feel rushed (target: 3-8)`,
    });
  }

  const sceneDurations = scenes.map((s) => {
    if (s.words.length === 0) return 0;
    return s.words[s.words.length - 1].end - s.words[0].start;
  });

  if (sceneDurations.length > 0) {
    const avg = sceneDurations.reduce((a, b) => a + b, 0) / sceneDurations.length;
    const maxDeviation = Math.max(...sceneDurations.map((d) => Math.abs(d - avg)));
    if (avg > 0 && maxDeviation > avg * 2) score = Math.max(60, score - 20);
  }

  return score;
}

/**
 * Analyze engagement quality of video content
 */
export function analyzeEngagementQuality(
  script: ScriptOutput,
  timestamps: TimestampsOutput
): EngagementQualityReport {
  const issues: EngagementIssue[] = [];

  const scenes = normalizeScenes(timestamps);

  // Get basic info
  const firstScene = scenes[0];
  const lastScene = scenes[scenes.length - 1];
  const allWords = scenes.flatMap((s) => s.words);

  const { totalDuration } = summarizeWords(allWords);

  // Extract hook and CTA from script
  const hookText = extractHookText(script);
  const ctaText = extractCtaText(script);
  const archetype = script.meta?.archetype || 'unknown';

  // Find hook timing (when first words appear)
  const hookStartTime = firstScene?.words[0]?.start || 0;

  // Find CTA timing (when last scene starts)
  const ctaStartTime = lastScene?.words[0]?.start || 0;

  const hookTimingScore = scoreHookTiming(hookStartTime, issues);

  const hookEngagementScore = scoreHookEngagement(hookText, issues);

  const ctaPresenceScore = scoreCtaPresence(ctaText, issues);

  const ctaTimingScore = scoreCtaTiming(ctaStartTime, totalDuration, issues);

  const { listStructureScore, numberedItems } = scoreListStructure(script, archetype, issues);

  const sceneProgressionScore = scoreSceneProgression(scenes, issues);
  const sceneCount = scenes.length;

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
