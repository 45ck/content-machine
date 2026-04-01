#!/usr/bin/env npx tsx
/**
 * VideoIntel V&V Experiment Runner
 *
 * Tests the accuracy of the classify + blueprint pipeline against
 * ground-truth expectations derived from known video structures.
 *
 * Usage:
 *   npx tsx experiments/videointel-vv/run.ts
 *   npx tsx experiments/videointel-vv/run.ts --verbose
 *   npx tsx experiments/videointel-vv/run.ts --fixture listicle
 */
import { classifyVideoSpec } from '../../src/videointel/classify';
import { extractBlueprint } from '../../src/videointel/blueprint';
import { VV_FIXTURES, type VVFixture } from './fixtures';
import type { VideoThemeV1, VideoBlueprintV1 } from '../../src/domain';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CheckResult {
  field: string;
  expected: string;
  actual: string;
  pass: boolean;
}

interface FixtureResult {
  name: string;
  checks: CheckResult[];
  passCount: number;
  failCount: number;
  accuracy: number;
}

/* ------------------------------------------------------------------ */
/*  Comparison helpers                                                 */
/* ------------------------------------------------------------------ */

function check(field: string, expected: unknown, actual: unknown): CheckResult {
  const pass = String(expected) === String(actual);
  return { field, expected: String(expected), actual: String(actual), pass };
}

function checkMinimum(field: string, min: number, actual: number): CheckResult {
  const pass = actual >= min;
  return { field, expected: `>= ${min}`, actual: String(actual), pass };
}

/* ------------------------------------------------------------------ */
/*  Run single fixture                                                 */
/* ------------------------------------------------------------------ */

async function runFixture(fixture: VVFixture): Promise<FixtureResult> {
  const { spec, expected } = fixture;

  // Run classify
  const theme: VideoThemeV1 = await classifyVideoSpec(spec, {
    mode: 'heuristic',
    sourceVideospecPath: spec.meta.source,
  });

  // Run blueprint
  const blueprint: VideoBlueprintV1 = extractBlueprint(spec, theme, {
    sourceVideospecPath: spec.meta.source,
    sourceThemePath: '(heuristic)',
  });

  // Collect checks
  const checks: CheckResult[] = [
    // Classification checks
    check('archetype', expected.archetype, theme.archetype),
    check('purpose', expected.purpose, theme.purpose),
    check('format', expected.format, theme.format),
    check('energy', expected.energy, theme.style.energy),
    check('editing_density', expected.editingDensity, theme.style.editing_density),
    checkMinimum('confidence', expected.minConfidence, theme.confidence),

    // Blueprint checks
    check('scene_count', expected.expectedSceneCount, blueprint.scene_slots.length),
    check('has_voiceover', expected.hasVoiceover, blueprint.audio_profile.has_voiceover),
    check('has_music', expected.hasMusic, blueprint.audio_profile.has_music),
    check('has_cta', expected.hasCta, blueprint.narrative_structure.has_cta),
    check(
      'has_inserted_content',
      expected.hasInsertedContent,
      blueprint.inserted_content_pattern.present
    ),
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const failCount = checks.filter((c) => !c.pass).length;
  const accuracy = passCount / checks.length;

  return { name: fixture.name, checks, passCount, failCount, accuracy };
}

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

function printReport(results: FixtureResult[], verbose: boolean): void {
  const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
  const totalPass = results.reduce((sum, r) => sum + r.passCount, 0);
  const totalFail = results.reduce((sum, r) => sum + r.failCount, 0);
  const overallAccuracy = totalChecks > 0 ? totalPass / totalChecks : 0;

  console.log('\n' + '='.repeat(70));
  console.log('  VideoIntel V&V Experiment — Classify + Blueprint Accuracy');
  console.log('='.repeat(70));

  for (const result of results) {
    const icon = result.failCount === 0 ? '\u2705' : '\u274C';
    const pct = (result.accuracy * 100).toFixed(0);
    console.log(
      `\n${icon} ${result.name.padEnd(16)} ${pct}% (${result.passCount}/${result.checks.length})`
    );

    if (verbose || result.failCount > 0) {
      for (const c of result.checks) {
        const mark = c.pass ? '  \u2713' : '  \u2717';
        const detail = c.pass ? '' : `  (expected: ${c.expected}, got: ${c.actual})`;
        console.log(`${mark} ${c.field}${detail}`);
      }
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(
    `  Overall: ${totalPass}/${totalChecks} checks passed (${(overallAccuracy * 100).toFixed(1)}%)`
  );
  console.log(
    `  Fixtures: ${results.filter((r) => r.failCount === 0).length}/${results.length} perfect`
  );
  console.log(`  Failed checks: ${totalFail}`);
  console.log('-'.repeat(70));

  if (totalFail > 0) {
    console.log('\n  FAILURES:');
    for (const result of results) {
      for (const c of result.checks) {
        if (!c.pass) {
          console.log(`    ${result.name}.${c.field}: expected ${c.expected}, got ${c.actual}`);
        }
      }
    }
  }

  console.log();
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const fixtureFilter = args.find((a) => !a.startsWith('-'));

  let fixtures = VV_FIXTURES;
  if (fixtureFilter) {
    fixtures = VV_FIXTURES.filter((f) => f.name.includes(fixtureFilter));
    if (fixtures.length === 0) {
      console.error(`No fixtures match filter: ${fixtureFilter}`);
      console.error(`Available: ${VV_FIXTURES.map((f) => f.name).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`Running ${fixtures.length} V&V fixture(s)...`);

  const results: FixtureResult[] = [];
  for (const fixture of fixtures) {
    const result = await runFixture(fixture);
    results.push(result);
  }

  printReport(results, verbose);

  const totalFail = results.reduce((sum, r) => sum + r.failCount, 0);
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('V&V experiment failed:', err);
  process.exit(2);
});
