#!/usr/bin/env npx tsx
/**
 * Editor V&V Experiment — Real-Video Round-Trip
 *
 * Composes test MP4s from ground-truth manifests, runs the full pipeline
 * (cm videospec → classify → blueprint), and compares output against
 * the known ground truth.
 *
 * Usage:
 *   npx tsx experiments/videointel-editor-vv/run.ts
 *   npx tsx experiments/videointel-editor-vv/run.ts --verbose
 *   npx tsx experiments/videointel-editor-vv/run.ts --manifest three-scene-listicle
 *   npx tsx experiments/videointel-editor-vv/run.ts --skip-compose
 */
import 'dotenv/config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { analyzeVideoToVideoSpecV1 } from '../../src/videospec/analyze';
import { classifyVideoSpec } from '../../src/videointel/classify';
import { extractBlueprint } from '../../src/videointel/blueprint';

import { ALL_MANIFESTS } from './manifests';
import type { EditorVVManifest } from './ground-truth';
import { checkDependencies, hasFatalDeps } from './deps';
import type { DependencyReport } from './deps';
import { composeFromManifest } from './ffmpeg-compose';
import { composeFromMlt } from './mlt-compose';
import { compareAgainstGroundTruth } from './compare';
import type { ManifestComparisonResult } from './compare';
import { printReport } from './report';
import type { RunSummary } from './report';

/* ------------------------------------------------------------------ */
/*  CLI args                                                           */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const skipCompose = args.includes('--skip-compose');

  let manifestFilter: string | undefined;
  const mIdx = args.indexOf('--manifest');
  if (mIdx !== -1 && args[mIdx + 1]) {
    manifestFilter = args[mIdx + 1];
  }

  return { verbose, skipCompose, manifestFilter };
}

/* ------------------------------------------------------------------ */
/*  Timing helper                                                      */
/* ------------------------------------------------------------------ */

function elapsed(start: [number, number]): number {
  const [s, ns] = process.hrtime(start);
  return Math.round(s * 1000 + ns / 1_000_000);
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const { verbose, skipCompose, manifestFilter } = parseArgs();

  const resultsDir = path.resolve(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  // 1. Check dependencies
  console.log('Checking dependencies...');
  const deps: DependencyReport = await checkDependencies();

  if (!hasFatalDeps(deps)) {
    console.error('\nFATAL: ffmpeg and ffprobe are required. Aborting.');
    process.exit(2);
  }

  // 2. Select manifests
  let manifests = ALL_MANIFESTS;
  if (manifestFilter) {
    manifests = ALL_MANIFESTS.filter((m) => m.name.includes(manifestFilter));
    if (manifests.length === 0) {
      console.error(`No manifests match "${manifestFilter}".`);
      console.error(`Available: ${ALL_MANIFESTS.map((m) => m.name).join(', ')}`);
      process.exit(1);
    }
  }

  // Filter Tier 2 manifests when melt is unavailable
  if (!deps.melt.available) {
    const before = manifests.length;
    manifests = manifests.filter((m) => m.tier !== 'mlt');
    if (manifests.length < before) {
      console.log(`  (Skipped ${before - manifests.length} Tier 2 manifest(s) — melt unavailable)`);
    }
  }

  console.log(`\nRunning ${manifests.length} manifest(s)...\n`);

  // 3. Process each manifest
  const results: ManifestComparisonResult[] = [];
  const timings: RunSummary['timings'] = [];
  const errors: RunSummary['errors'] = [];

  for (const manifest of manifests) {
    console.log(`  ${manifest.name}: ${manifest.description}`);

    try {
      const timing = {
        name: manifest.name,
        composeMs: 0,
        analyzeMs: 0,
        classifyMs: 0,
        blueprintMs: 0,
      };

      // a. Compose MP4
      let mp4Path = path.join(resultsDir, `${manifest.name}.mp4`);
      if (skipCompose && fs.existsSync(mp4Path)) {
        console.log('    (reusing existing MP4)');
      } else {
        const t0 = process.hrtime();
        mp4Path = await composeVideo(manifest, resultsDir, { verbose });
        timing.composeMs = elapsed(t0);
        console.log(`    composed (${timing.composeMs}ms)`);
      }

      // b. Analyze → VideoSpec.v1
      const t1 = process.hrtime();
      const { spec } = await analyzeVideoToVideoSpecV1({
        inputPath: mp4Path,
        shotDetector: deps.pyscenedetect.available ? 'pyscenedetect' : 'ffmpeg',
        ocr: deps.tesseract.available,
        asr: deps.whisper.available,
        narrative: 'off',
      });
      timing.analyzeMs = elapsed(t1);
      console.log(`    analyzed (${timing.analyzeMs}ms)`);

      // Save spec for inspection
      fs.writeFileSync(
        path.join(resultsDir, `${manifest.name}.videospec.json`),
        JSON.stringify(spec, null, 2)
      );

      // c. Classify → VideoTheme.v1
      const t2 = process.hrtime();
      const theme = await classifyVideoSpec(spec, {
        mode: 'heuristic',
        sourceVideospecPath: mp4Path,
      });
      timing.classifyMs = elapsed(t2);

      // Save theme
      fs.writeFileSync(
        path.join(resultsDir, `${manifest.name}.theme.json`),
        JSON.stringify(theme, null, 2)
      );

      // d. Blueprint → VideoBlueprint.v1
      const t3 = process.hrtime();
      const blueprint = extractBlueprint(spec, theme, {
        sourceVideospecPath: mp4Path,
        sourceThemePath: '(heuristic)',
      });
      timing.blueprintMs = elapsed(t3);

      // Save blueprint
      fs.writeFileSync(
        path.join(resultsDir, `${manifest.name}.blueprint.json`),
        JSON.stringify(blueprint, null, 2)
      );

      // e. Compare
      const comparison = compareAgainstGroundTruth(
        manifest.name,
        manifest.groundTruth,
        spec,
        theme,
        blueprint,
        deps
      );
      results.push(comparison);
      timings.push(timing);

      const icon = comparison.fail === 0 ? '\u2713' : '\u2717';
      console.log(`    ${icon} ${comparison.pass}P / ${comparison.fail}F / ${comparison.skip}S`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ name: manifest.name, error: msg });
      console.log(`    ERROR: ${msg}`);
    }
  }

  // 4. Print report
  printReport({ results, timings, deps, errors }, verbose);

  // 5. Exit code
  const totalFail = results.reduce((s, r) => s + r.fail, 0);
  process.exit(totalFail > 0 || errors.length > 0 ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/*  Download helper (for real-video manifests with HTTP URLs)          */
/* ------------------------------------------------------------------ */

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      // Follow redirects (301/302)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download failed: HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Composition dispatcher                                             */
/* ------------------------------------------------------------------ */

async function composeVideo(
  manifest: EditorVVManifest,
  outputDir: string,
  opts?: { verbose?: boolean }
): Promise<string> {
  if (manifest.tier === 'real') {
    // Real video — resolve inputPath or download from URL
    if (!manifest.inputPath) throw new Error(`Real manifest ${manifest.name} has no inputPath`);
    const dest = path.join(outputDir, `${manifest.name}.mp4`);

    if (manifest.inputPath.startsWith('http://') || manifest.inputPath.startsWith('https://')) {
      if (!fs.existsSync(dest)) {
        console.log(`    downloading ${manifest.inputPath}`);
        await downloadFile(manifest.inputPath, dest);
      } else {
        console.log('    (reusing downloaded MP4)');
      }
      return dest;
    }

    // Local path — resolve relative to results dir or absolute
    const resolved = path.isAbsolute(manifest.inputPath)
      ? manifest.inputPath
      : path.resolve(outputDir, manifest.inputPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input video not found: ${resolved}`);
    }
    return resolved;
  }

  if (manifest.tier === 'mlt') {
    const result = await composeFromMlt(manifest, outputDir, opts);
    if (!result) throw new Error('MLT composition unavailable');
    return result;
  }
  return composeFromManifest(manifest, outputDir, opts);
}

/* ------------------------------------------------------------------ */

main().catch((err) => {
  console.error('Editor V&V experiment failed:', err);
  process.exit(2);
});
