/**
 * Comparison engine: checks pipeline output against ground truth.
 *
 * Each manifest produces up to 10 checks. Checks that depend on optional
 * tools (whisper, tesseract) are skipped rather than failed when unavailable.
 */
import type { VideoSpecV1 } from '../../src/domain';
import type { VideoThemeV1, VideoBlueprintV1 } from '../../src/domain';
import type { DependencyReport } from './deps';
import type { EditorVVGroundTruth, ComparisonTolerances } from './ground-truth';
import { DEFAULT_TOLERANCES } from './ground-truth';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface CheckResult {
  label: string;
  status: CheckStatus;
  expected?: string;
  actual?: string;
  reason?: string;
}

export interface ManifestComparisonResult {
  name: string;
  checks: CheckResult[];
  pass: number;
  fail: number;
  skip: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function tol(gt: EditorVVGroundTruth): ComparisonTolerances {
  return { ...DEFAULT_TOLERANCES, ...gt.tolerances };
}

function ok(label: string, expected: string, actual: string): CheckResult {
  return { label, status: 'pass', expected, actual };
}

function fail(label: string, expected: string, actual: string): CheckResult {
  return { label, status: 'fail', expected, actual };
}

function skip(label: string, reason: string): CheckResult {
  return { label, status: 'skip', reason };
}

function approx(a: number, b: number, delta: number): boolean {
  return Math.abs(a - b) <= delta;
}

function boolCheck(label: string, expected: boolean, actual: boolean): CheckResult {
  return actual === expected
    ? ok(label, String(expected), String(actual))
    : fail(label, String(expected), String(actual));
}

/* ------------------------------------------------------------------ */
/*  Individual check groups                                            */
/* ------------------------------------------------------------------ */

function checkDuration(gt: EditorVVGroundTruth, spec: VideoSpecV1): CheckResult {
  const t = tol(gt);
  const actual = spec.meta.duration;
  return approx(actual, gt.totalDuration, t.durationSeconds)
    ? ok('Total duration', `${gt.totalDuration}s`, `${actual}s`)
    : fail('Total duration', `${gt.totalDuration}s ±${t.durationSeconds}`, `${actual}s`);
}

function checkSceneCount(
  gt: EditorVVGroundTruth,
  spec: VideoSpecV1,
  degraded: boolean
): CheckResult {
  const t = tol(gt);
  const shotCount = spec.timeline.pacing.shot_count;
  if (degraded) return skip('Scene count', `pyscenedetect unavailable (got ${shotCount})`);
  return approx(shotCount, gt.sceneCount, t.sceneCountDelta)
    ? ok('Scene count', String(gt.sceneCount), String(shotCount))
    : fail('Scene count', `${gt.sceneCount} ±${t.sceneCountDelta}`, String(shotCount));
}

function checkCutPoints(
  gt: EditorVVGroundTruth,
  spec: VideoSpecV1,
  degraded: boolean
): CheckResult {
  const t = tol(gt);
  const shotCount = spec.timeline.pacing.shot_count;
  if (degraded) return skip('Cut points matched', 'pyscenedetect unavailable');
  if (gt.cutPoints.length === 0) {
    return shotCount <= gt.sceneCount + t.sceneCountDelta
      ? ok('Cut points', 'none', 'none')
      : fail('Cut points', 'no cuts', `${shotCount} shots detected`);
  }
  const specStarts = spec.timeline.shots.slice(1).map((s) => s.start);
  let matched = 0;
  for (const cp of gt.cutPoints) {
    if (specStarts.some((s) => approx(s, cp, t.cutPointSeconds))) matched++;
  }
  const ratio = `${matched}/${gt.cutPoints.length}`;
  return matched === gt.cutPoints.length
    ? ok('Cut points matched', ratio, ratio)
    : fail('Cut points matched', `${gt.cutPoints.length}/${gt.cutPoints.length}`, ratio);
}

function checkAudio(
  gt: EditorVVGroundTruth,
  blueprint: VideoBlueprintV1,
  deps: DependencyReport
): CheckResult[] {
  const results: CheckResult[] = [];

  // Voiceover check
  if (gt.skipVoiceoverCheck) {
    results.push(skip('Has voiceover', 'whisper hallucinates on synthetic/silent audio'));
  } else if (!deps.whisper.available) {
    results.push(skip('Has voiceover', 'whisper unavailable'));
  } else {
    results.push(
      boolCheck('Has voiceover', gt.hasVoiceover, blueprint.audio_profile.has_voiceover)
    );
  }

  // Music check (works correctly on silence — only skip when whisper unavailable)
  if (!deps.whisper.available) {
    results.push(skip('Has music', 'whisper unavailable'));
  } else {
    results.push(boolCheck('Has music', gt.hasMusic, blueprint.audio_profile.has_music));
  }

  return results;
}

function checkCaptions(
  gt: EditorVVGroundTruth,
  spec: VideoSpecV1,
  blueprint: VideoBlueprintV1,
  deps: DependencyReport
): CheckResult[] {
  const results: CheckResult[] = [];

  // Has captions (burned-in text requires tesseract to detect)
  if (gt.hasCaptions && !deps.tesseract.available) {
    results.push(skip('Has captions', 'tesseract unavailable'));
  } else {
    results.push(boolCheck('Has captions', gt.hasCaptions, blueprint.caption_profile.present));
  }

  // Caption texts
  if (!gt.expectedCaptionTexts || gt.expectedCaptionTexts.length === 0) {
    results.push(skip('Caption texts', 'no expected texts'));
  } else if (!deps.tesseract.available) {
    results.push(skip('Caption texts', 'tesseract unavailable'));
  } else {
    const allText = (spec.editing.captions ?? []).map((c) => c.text.toLowerCase()).join(' ');
    let matched = 0;
    for (const expected of gt.expectedCaptionTexts) {
      if (allText.includes(expected.toLowerCase())) matched++;
    }
    const total = gt.expectedCaptionTexts.length;
    const ratio = `${matched}/${total}`;
    results.push(
      matched === total
        ? ok('Caption texts', ratio, ratio)
        : fail('Caption texts', `${total}/${total}`, ratio)
    );
  }
  return results;
}

function checkClassification(
  gt: EditorVVGroundTruth,
  spec: VideoSpecV1,
  theme: VideoThemeV1,
  degraded: boolean
): CheckResult[] {
  const results: CheckResult[] = [];

  // Pacing (depends on accurate scene detection)
  const specPacing = spec.timeline.pacing.classification;
  if (degraded) {
    results.push(skip('Pacing', `pyscenedetect unavailable (got ${specPacing})`));
  } else {
    results.push(
      specPacing === gt.expectedPacing
        ? ok('Pacing', gt.expectedPacing, specPacing ?? 'undefined')
        : fail('Pacing', gt.expectedPacing, specPacing ?? 'undefined')
    );
  }

  // Archetype (optional)
  if (gt.expectedArchetype) {
    results.push(
      theme.archetype === gt.expectedArchetype
        ? ok('Archetype', gt.expectedArchetype, theme.archetype)
        : fail('Archetype', gt.expectedArchetype, theme.archetype)
    );
  } else {
    results.push(skip('Archetype', 'not asserted'));
  }

  // Format (optional)
  if (gt.expectedFormat) {
    results.push(
      theme.format === gt.expectedFormat
        ? ok('Format', gt.expectedFormat, theme.format)
        : fail('Format', gt.expectedFormat, theme.format)
    );
  } else {
    results.push(skip('Format', 'not asserted'));
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Main comparison                                                    */
/* ------------------------------------------------------------------ */

export function compareAgainstGroundTruth(
  name: string,
  gt: EditorVVGroundTruth,
  spec: VideoSpecV1,
  theme: VideoThemeV1,
  blueprint: VideoBlueprintV1,
  deps: DependencyReport
): ManifestComparisonResult {
  // Scene-detection-dependent checks are skipped when pyscenedetect is
  // unavailable and the manifest expects multiple scenes.  The ffmpeg
  // fallback uses a scene-score threshold (0.35) that is too high for
  // synthetic solid-colour bar transitions.
  const degraded = !deps.pyscenedetect.available && gt.sceneCount > 1;

  const checks: CheckResult[] = [
    checkDuration(gt, spec),
    checkSceneCount(gt, spec, degraded),
    checkCutPoints(gt, spec, degraded),
    ...checkAudio(gt, blueprint, deps),
    ...checkCaptions(gt, spec, blueprint, deps),
    ...checkClassification(gt, spec, theme, degraded),
  ];

  return {
    name,
    checks,
    pass: checks.filter((c) => c.status === 'pass').length,
    fail: checks.filter((c) => c.status === 'fail').length,
    skip: checks.filter((c) => c.status === 'skip').length,
  };
}
