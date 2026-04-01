/**
 * Blueprint Compliance Checker
 *
 * Validates that a generated script honours the structural constraints
 * from a VideoBlueprintV1.  Currently the pipeline injects blueprint
 * context as prompt text only — there is no post-generation validation.
 * This module fills that gap.
 *
 * @module script
 */
import type { ScriptOutput } from './schema';
import type { VideoBlueprintV1 } from '../domain';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ComplianceStatus = 'pass' | 'warn' | 'fail';

export interface ComplianceCheck {
  name: string;
  status: ComplianceStatus;
  expected?: string;
  actual?: string;
  note?: string;
}

export interface BlueprintComplianceReport {
  checks: ComplianceCheck[];
  pass: number;
  warn: number;
  fail: number;
}

export interface ComplianceOptions {
  /** Acceptable scene count delta (default: 1). */
  sceneCountDelta?: number;
  /** Acceptable duration ratio deviation (default: 0.25 = ±25%). */
  durationTolerance?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const WORDS_PER_SECOND = 2.5; // conservative spoken-word estimate

function estimateScriptDuration(script: ScriptOutput): number {
  // Use metadata if available
  if (script.meta?.estimatedDuration && script.meta.estimatedDuration > 0) {
    return script.meta.estimatedDuration;
  }
  // Fall back to word count estimation
  const totalWords = script.scenes.reduce(
    (sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length,
    0
  );
  return totalWords / WORDS_PER_SECOND;
}

function ok(name: string, expected: string, actual: string): ComplianceCheck {
  return { name, status: 'pass', expected, actual };
}

function warn(name: string, expected: string, actual: string, note: string): ComplianceCheck {
  return { name, status: 'warn', expected, actual, note };
}

function fail(name: string, expected: string, actual: string): ComplianceCheck {
  return { name, status: 'fail', expected, actual };
}

/* ------------------------------------------------------------------ */
/*  Individual checks                                                  */
/* ------------------------------------------------------------------ */

function checkSceneCount(
  script: ScriptOutput,
  blueprint: VideoBlueprintV1,
  opts: Required<ComplianceOptions>
): ComplianceCheck {
  const expected = blueprint.scene_slots.length;
  const actual = script.scenes.length;
  const delta = Math.abs(actual - expected);
  if (delta === 0) return ok('Scene count', String(expected), String(actual));
  if (delta <= opts.sceneCountDelta)
    return warn('Scene count', String(expected), String(actual), `delta ${delta} within tolerance`);
  return fail('Scene count', String(expected), String(actual));
}

function checkDuration(
  script: ScriptOutput,
  blueprint: VideoBlueprintV1,
  opts: Required<ComplianceOptions>
): ComplianceCheck {
  const target = blueprint.pacing_profile.target_duration;
  const estimated = estimateScriptDuration(script);
  const ratio = target > 0 ? Math.abs(estimated - target) / target : 0;
  const fmt = (n: number) => `${n.toFixed(1)}s`;
  if (ratio <= 0.1)
    return ok('Duration', fmt(target), fmt(estimated));
  if (ratio <= opts.durationTolerance)
    return warn('Duration', fmt(target), fmt(estimated), `${(ratio * 100).toFixed(0)}% deviation`);
  return fail('Duration', fmt(target), fmt(estimated));
}

function checkCTA(script: ScriptOutput, blueprint: VideoBlueprintV1): ComplianceCheck {
  if (!blueprint.narrative_structure.has_cta) {
    return ok('CTA', 'not required', script.cta ? 'present' : 'absent');
  }
  // Blueprint requires CTA — check script
  if (script.cta && script.cta.trim().length > 0) {
    return ok('CTA', 'required', 'present');
  }
  // Check last scene for CTA-like content
  const lastScene = script.scenes[script.scenes.length - 1];
  if (lastScene) {
    const lower = lastScene.text.toLowerCase();
    const ctaSignals = ['follow', 'subscribe', 'like', 'comment', 'share', 'check out', 'link'];
    if (ctaSignals.some((s) => lower.includes(s))) {
      return warn('CTA', 'required', 'implicit in last scene', 'CTA language in final scene');
    }
  }
  return fail('CTA', 'required', 'absent');
}

function checkHook(script: ScriptOutput, blueprint: VideoBlueprintV1): ComplianceCheck {
  const hookDur = blueprint.narrative_structure.hook_duration;
  if (hookDur <= 0) {
    return ok('Hook', 'not required', script.hook ? 'present' : 'absent');
  }
  if (script.hook && script.hook.trim().length > 0) {
    return ok('Hook', 'required', 'present');
  }
  // Check first scene for hook-like brevity
  const firstScene = script.scenes[0];
  if (firstScene) {
    const wordCount = firstScene.text.split(/\s+/).filter(Boolean).length;
    const estDur = wordCount / WORDS_PER_SECOND;
    if (estDur <= hookDur * 2) {
      return warn('Hook', `required (~${hookDur.toFixed(1)}s)`, `first scene ~${estDur.toFixed(1)}s`, 'short opening scene');
    }
  }
  return fail('Hook', `required (~${hookDur.toFixed(1)}s)`, 'absent');
}

function checkPacing(
  script: ScriptOutput,
  blueprint: VideoBlueprintV1
): ComplianceCheck {
  const expected = blueprint.pacing_profile.classification;
  if (!expected) return ok('Pacing', 'not specified', 'n/a');

  // Estimate per-scene durations
  const sceneDurs = script.scenes.map((s) => {
    if (s.duration && s.duration > 0) return s.duration;
    return s.text.split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND;
  });
  const avg = sceneDurs.length > 0
    ? sceneDurs.reduce((a, b) => a + b, 0) / sceneDurs.length
    : 0;

  let actual: string;
  if (avg < 1.0) actual = 'very_fast';
  else if (avg < 2.0) actual = 'fast';
  else if (avg < 4.0) actual = 'moderate';
  else actual = 'slow';

  if (actual === expected) return ok('Pacing', expected, actual);
  // Ordinal distance
  const order = ['very_fast', 'fast', 'moderate', 'slow'];
  const dist = Math.abs(order.indexOf(actual) - order.indexOf(expected));
  if (dist <= 1) return warn('Pacing', expected, actual, `adjacent pacing (avg ${avg.toFixed(1)}s/scene)`);
  return fail('Pacing', expected, actual);
}

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check whether a generated script honours the blueprint constraints.
 *
 * @param script     The generated script output.
 * @param blueprint  The blueprint that guided generation.
 * @param options    Optional tolerance overrides.
 */
export function checkBlueprintCompliance(
  script: ScriptOutput,
  blueprint: VideoBlueprintV1,
  options?: ComplianceOptions
): BlueprintComplianceReport {
  const opts: Required<ComplianceOptions> = {
    sceneCountDelta: options?.sceneCountDelta ?? 1,
    durationTolerance: options?.durationTolerance ?? 0.25,
  };

  const checks: ComplianceCheck[] = [
    checkSceneCount(script, blueprint, opts),
    checkDuration(script, blueprint, opts),
    checkCTA(script, blueprint),
    checkHook(script, blueprint),
    checkPacing(script, blueprint),
  ];

  return {
    checks,
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  };
}
