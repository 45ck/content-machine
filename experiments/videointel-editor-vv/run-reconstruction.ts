#!/usr/bin/env npx tsx
/**
 * Reconstruction Fidelity Experiment
 *
 * Takes real videos that have already been analyzed by the V&V experiment,
 * generates new scripts constrained by extracted blueprints, checks
 * compliance, and optionally renders + compares VideoSpecs.
 *
 * Usage:
 *   npx tsx experiments/videointel-editor-vv/run-reconstruction.ts
 *   npx tsx experiments/videointel-editor-vv/run-reconstruction.ts --manifest real-montage
 *   npx tsx experiments/videointel-editor-vv/run-reconstruction.ts --render   # full round-trip
 */
import 'dotenv/config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { generateScript } from '../../src/script/generator';
import { checkBlueprintCompliance } from '../../src/script/blueprint-compliance';
import { createLLMProvider } from '../../src/core/llm';
import type { VideoBlueprintV1, VideoSpecV1, VideoThemeV1 } from '../../src/domain';
import type { ScriptOutput } from '../../src/script/generator';
import type { Archetype } from '../../src/core/config';
import type { BlueprintComplianceReport } from '../../src/script/blueprint-compliance';
import type { ReconstructionFidelityReport } from '../../src/videointel/compare';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReconstructionResult {
  name: string;
  script: ScriptOutput;
  compliance: BlueprintComplianceReport;
  fidelity?: ReconstructionFidelityReport;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  CLI args                                                           */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const doRender = args.includes('--render');
  const verbose = args.includes('--verbose') || args.includes('-v');

  let manifestFilter: string | undefined;
  const mIdx = args.indexOf('--manifest');
  if (mIdx !== -1 && args[mIdx + 1]) {
    manifestFilter = args[mIdx + 1];
  }

  return { doRender, verbose, manifestFilter };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function findRealManifests(resultsDir: string, filter?: string): string[] {
  const files = fs.readdirSync(resultsDir);
  return files
    .filter((f) => f.startsWith('real-') && f.endsWith('.blueprint.json'))
    .map((f) => f.replace('.blueprint.json', ''))
    .filter((name) => !filter || name.includes(filter));
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

// The experiment intentionally keeps the orchestration inline for readability.
// eslint-disable-next-line sonarjs/cognitive-complexity
async function main(): Promise<void> {
  const { doRender, verbose, manifestFilter } = parseArgs();
  const resultsDir = path.resolve(__dirname, 'results');

  if (!fs.existsSync(resultsDir)) {
    console.error('No results directory. Run the V&V experiment first:');
    console.error('  npx tsx experiments/videointel-editor-vv/run.ts');
    process.exit(1);
  }

  const manifests = findRealManifests(resultsDir, manifestFilter);
  if (manifests.length === 0) {
    console.error('No real-video results found. Run V&V experiment with real manifests first.');
    process.exit(1);
  }

  console.log('======================================================================');
  console.log('  Reconstruction Fidelity Experiment');
  console.log('  VideoSpec → Blueprint → Script → (Render) → Compare');
  console.log('======================================================================\n');
  console.log(`Processing ${manifests.length} manifest(s)...\n`);

  const results: ReconstructionResult[] = [];

  for (const name of manifests) {
    console.log(`  ${name}:`);

    try {
      // Load existing pipeline outputs
      const specPath = path.join(resultsDir, `${name}.videospec.json`);
      const themePath = path.join(resultsDir, `${name}.theme.json`);
      const blueprintPath = path.join(resultsDir, `${name}.blueprint.json`);

      if (!fs.existsSync(specPath) || !fs.existsSync(blueprintPath)) {
        console.log('    (skipped — missing pipeline outputs)');
        continue;
      }

      const spec = loadJson<VideoSpecV1>(specPath);
      const theme = loadJson<VideoThemeV1>(themePath);
      const blueprint = loadJson<VideoBlueprintV1>(blueprintPath);

      // Generate a new script from the blueprint
      console.log('    Generating script from blueprint...');
      const topic = `Reconstruction of "${name}" video — ${spec.meta.duration}s ${theme.archetype} ${theme.format}`;
      // Use OpenAI directly to avoid Gemini rate limits
      const llm = createLLMProvider('openai', 'gpt-4o-mini');
      const script = await generateScript({
        topic,
        archetype: theme.archetype as Archetype,
        targetDuration: spec.meta.duration,
        blueprint,
        llmProvider: llm,
      });

      // Save the generated script
      fs.writeFileSync(
        path.join(resultsDir, `${name}.reconstructed-script.json`),
        JSON.stringify(script, null, 2)
      );
      console.log(
        `    Script: ${script.scenes.length} scenes, hook="${script.hook?.substring(0, 40)}..."`
      );

      // Check blueprint compliance
      const compliance = checkBlueprintCompliance(script, blueprint);
      const compIcon = compliance.fail === 0 ? '\u2713' : '\u2717';
      console.log(
        `    Compliance: ${compIcon} ${compliance.pass}P / ${compliance.warn}W / ${compliance.fail}F`
      );

      if (verbose) {
        for (const check of compliance.checks) {
          const icon =
            check.status === 'pass' ? '\u2713' : check.status === 'warn' ? '~' : '\u2717';
          console.log(
            `      ${icon} ${check.name}: expected=${check.expected} actual=${check.actual}${check.note ? ` (${check.note})` : ''}`
          );
        }
      }

      let fidelity: ReconstructionFidelityReport | undefined;

      if (doRender) {
        // Full round-trip: render video, extract VideoSpec, compare
        console.log('    (--render not yet implemented — comparing structurally)');
        // TODO: generateAudio() → generateVisuals() → renderVideo()
        // Then: analyzeVideoToVideoSpecV1() → compareVideoSpecs()
      }

      results.push({ name, script, compliance, fidelity });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ERROR: ${msg}`);
      results.push({
        name,
        script: {
          scenes: [],
          hook: '',
          cta: '',
          hashtags: [],
          mood: '',
        } as unknown as ScriptOutput,
        compliance: { checks: [], pass: 0, warn: 0, fail: 0 },
        error: msg,
      });
    }
  }

  // Summary
  console.log('\n======================================================================');
  console.log('  Reconstruction Fidelity Summary');
  console.log('======================================================================\n');

  let totalPass = 0;
  let totalWarn = 0;
  let totalFail = 0;
  let perfectCount = 0;

  for (const r of results) {
    if (r.error) {
      console.log(`  \u2717 ${r.name}: ERROR — ${r.error}`);
      continue;
    }

    totalPass += r.compliance.pass;
    totalWarn += r.compliance.warn;
    totalFail += r.compliance.fail;

    const icon = r.compliance.fail === 0 ? '\u2713' : '\u2717';
    if (r.compliance.fail === 0) perfectCount++;

    const sceneSummary = r.script.scenes
      .map((s) => {
        const words = s.text.split(/\s+/).filter(Boolean).length;
        return `${words}w`;
      })
      .join(', ');

    console.log(
      `  ${icon} ${r.name}: ${r.compliance.pass}P/${r.compliance.warn}W/${r.compliance.fail}F — scenes=[${sceneSummary}]`
    );

    if (r.fidelity) {
      console.log(`    Fidelity: ${(r.fidelity.aggregate * 100).toFixed(1)}%`);
      for (const m of r.fidelity.metrics) {
        console.log(
          `      ${m.name}: ${(m.score * 100).toFixed(0)}%${m.note ? ` (${m.note})` : ''}`
        );
      }
    }
  }

  console.log(`\n  Total: ${totalPass}P / ${totalWarn}W / ${totalFail}F`);
  console.log(`  Perfect: ${perfectCount}/${results.filter((r) => !r.error).length}`);
  console.log('======================================================================\n');

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Reconstruction experiment failed:', err);
  process.exit(2);
});
