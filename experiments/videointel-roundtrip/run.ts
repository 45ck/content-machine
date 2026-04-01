#!/usr/bin/env npx tsx
/**
 * VideoIntel Round-Trip Experiment
 *
 * Tests the full pipeline: VideoSpec → classify → blueprint → prompt context.
 * Verifies that the bridge layer produces usable output for script generation.
 *
 * Usage:
 *   npx tsx experiments/videointel-roundtrip/run.ts
 */
import { classifyVideoSpec } from '../../src/videointel/classify';
import { extractBlueprint } from '../../src/videointel/blueprint';
import { buildBlueprintContext } from '../../src/videointel/blueprint-context';
import { createMinimalVideoSpec } from '../../src/videointel/test-fixtures';
import type { VideoThemeV1, VideoBlueprintV1 } from '../../src/domain';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoundTripResult {
  name: string;
  pass: boolean;
  checks: { label: string; pass: boolean; detail?: string }[];
}

/* ------------------------------------------------------------------ */
/*  Fixtures — more realistic full-pipeline specs                      */
/* ------------------------------------------------------------------ */

const fixtures = [
  {
    name: 'listicle-roundtrip',
    description: 'Listicle video goes through full pipeline',
    spec: createMinimalVideoSpec({
      meta: { duration: 40, source: 'listicle-sample.mp4' },
      timeline: {
        shots: [
          { id: 1, start: 0, end: 5 },
          { id: 2, start: 5, end: 15, transition_in: 'cut' },
          { id: 3, start: 15, end: 25, transition_in: 'cut' },
          { id: 4, start: 25, end: 35, transition_in: 'cut' },
          { id: 5, start: 35, end: 40, transition_in: 'cut' },
        ],
        pacing: {
          shot_count: 5,
          avg_shot_duration: 8,
          median_shot_duration: 10,
          fastest_shot_duration: 5,
          slowest_shot_duration: 10,
          classification: 'moderate',
        },
      },
      editing: {
        captions: [
          { text: 'Three reasons to learn TypeScript', start: 0, end: 4 },
          { text: 'First: type safety', start: 5, end: 10 },
          { text: 'Second: better tooling', start: 15, end: 20 },
          { text: 'Third: career growth', start: 25, end: 30 },
        ],
      },
      audio: {
        transcript: [
          {
            start: 0,
            end: 5,
            text: 'Three reasons you should learn TypeScript today.',
            speaker: 'host',
          },
          {
            start: 5,
            end: 15,
            text: 'First, type safety catches bugs before they reach production.',
            speaker: 'host',
          },
          {
            start: 15,
            end: 25,
            text: 'Second, the tooling is incredible. Autocomplete everywhere.',
            speaker: 'host',
          },
          {
            start: 25,
            end: 35,
            text: 'Third, TypeScript is the most in-demand skill for 2026.',
            speaker: 'host',
          },
          { start: 35, end: 40, text: 'Follow for more dev tips!', speaker: 'host' },
        ],
      },
      narrative: {
        arc: {
          hook: { start: 0, end: 5, description: 'List intro' },
          escalation: { start: 5, end: 35, description: 'Three items' },
          payoff: { start: 35, end: 40, description: 'CTA' },
        },
        cta: 'Follow for more dev tips!',
        themes: ['typescript', 'programming'],
      },
    }),
  },
  {
    name: 'reaction-roundtrip',
    description: 'Reaction video with inserted content goes through pipeline',
    spec: createMinimalVideoSpec({
      meta: { duration: 30, source: 'reaction-sample.mp4' },
      timeline: {
        shots: [
          { id: 1, start: 0, end: 4 },
          { id: 2, start: 4, end: 15, transition_in: 'cut' },
          { id: 3, start: 15, end: 25, transition_in: 'cut' },
          { id: 4, start: 25, end: 30, transition_in: 'cut' },
        ],
        pacing: {
          shot_count: 4,
          avg_shot_duration: 7.5,
          median_shot_duration: 7.5,
          fastest_shot_duration: 4,
          slowest_shot_duration: 11,
          classification: 'moderate',
        },
      },
      audio: {
        transcript: [
          { start: 0, end: 4, text: 'Check out this insane Reddit thread!', speaker: 'host' },
          {
            start: 4,
            end: 15,
            text: 'They claim AI will replace all developers by 2027.',
            speaker: 'host',
          },
          { start: 15, end: 25, text: 'Absolutely not. Here is why.', speaker: 'host' },
          { start: 25, end: 30, text: 'What do you think? Drop a comment.', speaker: 'host' },
        ],
      },
      inserted_content_blocks: [
        { id: 'ic-1', type: 'reddit_screenshot', start: 4, end: 15, presentation: 'full_screen' },
        {
          id: 'ic-2',
          type: 'tweet_screenshot',
          start: 15,
          end: 25,
          presentation: 'picture_in_picture',
        },
      ],
      narrative: {
        arc: {
          hook: { start: 0, end: 4, description: 'React to content' },
          escalation: { start: 4, end: 25, description: 'Show and respond' },
          payoff: { start: 25, end: 30, description: 'Commentary' },
        },
      },
    }),
  },
];

/* ------------------------------------------------------------------ */
/*  Round-trip test                                                     */
/* ------------------------------------------------------------------ */

async function runRoundTrip(fixture: (typeof fixtures)[0]): Promise<RoundTripResult> {
  const checks: RoundTripResult['checks'] = [];
  const { spec } = fixture;

  // Step 1: Classify
  let theme: VideoThemeV1;
  try {
    theme = await classifyVideoSpec(spec, {
      mode: 'heuristic',
      sourceVideospecPath: spec.meta.source,
    });
    checks.push({ label: 'classify succeeds', pass: true });
  } catch (err) {
    checks.push({ label: 'classify succeeds', pass: false, detail: String(err) });
    return { name: fixture.name, pass: false, checks };
  }

  // Step 2: Blueprint
  let blueprint: VideoBlueprintV1;
  try {
    blueprint = extractBlueprint(spec, theme, {
      sourceVideospecPath: spec.meta.source,
      sourceThemePath: '(heuristic)',
    });
    checks.push({ label: 'blueprint extracts', pass: true });
  } catch (err) {
    checks.push({ label: 'blueprint extracts', pass: false, detail: String(err) });
    return { name: fixture.name, pass: false, checks };
  }

  // Step 3: Build prompt context
  let context: string;
  try {
    context = buildBlueprintContext(blueprint);
    checks.push({ label: 'context builds', pass: true });
  } catch (err) {
    checks.push({ label: 'context builds', pass: false, detail: String(err) });
    return { name: fixture.name, pass: false, checks };
  }

  // Step 4: Structural checks on the context string
  const hasHeader = context.includes('BLUEPRINT CONSTRAINTS');
  checks.push({ label: 'context has header', pass: hasHeader });

  const hasSceneLines = context.includes('Scene 1');
  checks.push({ label: 'context lists scenes', pass: hasSceneLines });

  const hasPacing = context.includes('Pacing:');
  checks.push({ label: 'context includes pacing', pass: hasPacing });

  const hasDuration = context.includes('Total duration:');
  checks.push({ label: 'context includes duration', pass: hasDuration });

  // Check that context length is reasonable (not truncated for small specs)
  const reasonableLength = context.length > 100 && context.length < 2000;
  checks.push({
    label: 'context length reasonable',
    pass: reasonableLength,
    detail: `${context.length} chars`,
  });

  // Step 5: Blueprint archetype matches theme archetype
  const archetypeMatch = blueprint.archetype === theme.archetype;
  checks.push({
    label: 'blueprint archetype matches theme',
    pass: archetypeMatch,
    detail: `blueprint=${blueprint.archetype}, theme=${theme.archetype}`,
  });

  // Step 6: Scene count matches shot count
  const sceneCountMatch = blueprint.scene_slots.length === spec.timeline.shots.length;
  checks.push({
    label: 'scene count matches shots',
    pass: sceneCountMatch,
    detail: `slots=${blueprint.scene_slots.length}, shots=${spec.timeline.shots.length}`,
  });

  // Step 7: Duration matches spec
  const durationMatch = blueprint.pacing_profile.target_duration === spec.meta.duration;
  checks.push({
    label: 'target duration matches',
    pass: durationMatch,
    detail: `blueprint=${blueprint.pacing_profile.target_duration}, spec=${spec.meta.duration}`,
  });

  const allPass = checks.every((c) => c.pass);
  return { name: fixture.name, pass: allPass, checks };
}

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

function printReport(results: RoundTripResult[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('  VideoIntel Round-Trip Experiment');
  console.log('  VideoSpec → classify → blueprint → prompt context');
  console.log('='.repeat(70));

  for (const result of results) {
    const icon = result.pass ? '\u2705' : '\u274C';
    const total = result.checks.length;
    const passed = result.checks.filter((c) => c.pass).length;
    console.log(`\n${icon} ${result.name} (${passed}/${total})`);

    for (const c of result.checks) {
      const mark = c.pass ? '  \u2713' : '  \u2717';
      const detail = c.detail ? ` [${c.detail}]` : '';
      console.log(`${mark} ${c.label}${detail}`);
    }
  }

  const allPass = results.every((r) => r.pass);
  const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
  const passedChecks = results.reduce((sum, r) => sum + r.checks.filter((c) => c.pass).length, 0);

  console.log('\n' + '-'.repeat(70));
  console.log(`  Overall: ${passedChecks}/${totalChecks} checks passed`);
  console.log(`  Fixtures: ${results.filter((r) => r.pass).length}/${results.length} perfect`);
  console.log('-'.repeat(70));
  console.log();

  if (!allPass) {
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log(`Running ${fixtures.length} round-trip fixture(s)...`);

  const results: RoundTripResult[] = [];
  for (const fixture of fixtures) {
    const result = await runRoundTrip(fixture);
    results.push(result);
  }

  printReport(results);
}

main().catch((err) => {
  console.error('Round-trip experiment failed:', err);
  process.exit(2);
});
