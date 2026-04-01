/**
 * Console reporter for the editor V&V experiment.
 * Follows the pattern from experiments/videointel-vv/run.ts.
 */
import type { ManifestComparisonResult, CheckResult } from './compare';
import type { DependencyReport } from './deps';
import { printDependencyReport } from './deps';

interface TimingEntry {
  name: string;
  composeMs: number;
  analyzeMs: number;
  classifyMs: number;
  blueprintMs: number;
}

export interface RunSummary {
  results: ManifestComparisonResult[];
  timings: TimingEntry[];
  deps: DependencyReport;
  errors: { name: string; error: string }[];
}

export function printReport(summary: RunSummary, verbose: boolean): void {
  const { results, timings, deps, errors } = summary;

  console.log('\n' + '='.repeat(70));
  console.log('  Editor V&V Experiment — Real-Video Round-Trip');
  console.log('  MP4 → cm videospec → classify → blueprint → ground truth');
  console.log('='.repeat(70));

  printDependencyReport(deps);

  // Errors (manifests that crashed before comparison)
  for (const err of errors) {
    console.log(`\n\u274C ${err.name} — ERROR`);
    console.log(`    ${err.error}`);
  }

  // Per-manifest results
  for (const result of results) {
    const icon = result.fail === 0 ? '\u2705' : '\u274C';
    const counts = `${result.pass}P / ${result.fail}F / ${result.skip}S`;
    console.log(`\n${icon} ${result.name} (${counts})`);

    if (verbose || result.fail > 0) {
      for (const c of result.checks) {
        console.log(`  ${formatCheck(c)}`);
      }
    }
  }

  // Timings
  if (timings.length > 0) {
    console.log('\n  Timings:');
    for (const t of timings) {
      const total = t.composeMs + t.analyzeMs + t.classifyMs + t.blueprintMs;
      console.log(
        `    ${t.name}: compose=${fmt(t.composeMs)} analyze=${fmt(t.analyzeMs)} ` +
          `classify=${fmt(t.classifyMs)} blueprint=${fmt(t.blueprintMs)} total=${fmt(total)}`
      );
    }
  }

  // Summary
  const totalPass = results.reduce((s, r) => s + r.pass, 0);
  const totalFail = results.reduce((s, r) => s + r.fail, 0);
  const totalSkip = results.reduce((s, r) => s + r.skip, 0);
  const totalChecks = totalPass + totalFail + totalSkip;
  const perfectManifests = results.filter((r) => r.fail === 0).length;

  console.log('\n' + '-'.repeat(70));
  console.log(
    `  Overall: ${totalPass}/${totalChecks} passed, ${totalFail} failed, ${totalSkip} skipped`
  );
  console.log(
    `  Manifests: ${perfectManifests}/${results.length} perfect, ${errors.length} errors`
  );
  console.log('-'.repeat(70));
  console.log();
}

function formatCheck(c: CheckResult): string {
  if (c.status === 'pass') return `\u2713 ${c.label} [${c.actual}]`;
  if (c.status === 'skip') return `\u2013 ${c.label} (skipped: ${c.reason})`;
  return `\u2717 ${c.label} (expected: ${c.expected}, got: ${c.actual})`;
}

function fmt(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
