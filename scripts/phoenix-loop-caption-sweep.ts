import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { rateCaptionQuality, rateSyncQuality } from '../src/score/sync-rater';

type Variant = {
  name: string;
  renderArgs: string[];
};

type ResultRow = {
  variant: string;
  videoPath: string;
  captionReportPath: string;
  syncReportPath: string | null;
  captionScore: number | null;
  coverage: number | null;
  rhythm: number | null;
  placement: number | null;
  style: number | null;
  ocrConfidence: number | null;
  syncRating: number | null;
};

function runProcess(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
    });
  });
}

function getDefaultVariants(): Variant[] {
  // Baseline matches the best-known v11 settings.
  const baseline: Variant = {
    name: 'baseline-v11',
    renderArgs: [
      '--caption-preset',
      'capcut',
      '--caption-mode',
      'page',
      '--caption-animation',
      'none',
      '--caption-highlight',
      'color',
      '--caption-highlight-color',
      '#FFE600',
      '--caption-color',
      '#FFFFFF',
      '--caption-stroke-width',
      '8',
      '--caption-min-words',
      '3',
      '--caption-max-words',
      '7',
      '--caption-min-on-screen-ms',
      '1000',
      '--caption-min-on-screen-short-ms',
      '800',
    ],
  };

  return [
    baseline,
    {
      name: 'nohighlight',
      renderArgs: [
        '--caption-preset',
        'capcut',
        '--caption-mode',
        'page',
        '--caption-animation',
        'none',
        '--caption-highlight',
        'none',
        '--caption-color',
        '#FFFFFF',
        '--caption-stroke-width',
        '8',
        '--caption-min-words',
        '3',
        '--caption-max-words',
        '7',
        '--caption-min-on-screen-ms',
        '1000',
        '--caption-min-on-screen-short-ms',
        '800',
      ],
    },
    { name: 'maxchars-20', renderArgs: [...baseline.renderArgs, '--caption-max-chars', '20'] },
    { name: 'maxchars-24', renderArgs: [...baseline.renderArgs, '--caption-max-chars', '24'] },
    { name: 'maxlines-1', renderArgs: [...baseline.renderArgs, '--caption-max-lines', '1'] },
    { name: 'fontsize-88', renderArgs: [...baseline.renderArgs, '--caption-font-size', '88'] },
    { name: 'stroke-6', renderArgs: [...baseline.renderArgs, '--caption-stroke-width', '6'] },
    { name: 'stroke-10', renderArgs: [...baseline.renderArgs, '--caption-stroke-width', '10'] },
    {
      name: 'chunk-mode',
      renderArgs: [
        ...baseline.renderArgs,
        '--caption-mode',
        'chunk',
        '--caption-target-words',
        '4',
        '--caption-max-words',
        '8',
      ],
    },
  ];
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function main() {
  const program = new Command();
  program
    .name('phoenix-loop-caption-sweep')
    .description('Render and score caption variants against a fixed phoenix-loop artifact set')
    .requiredOption(
      '--dir <path>',
      'Directory containing script.json/audio.wav/timestamps.json/visuals.json'
    )
    .option('--tag <name>', 'Prefix for outputs (e.g. v12)', `v${Date.now()}`)
    .option('--variants <path>', 'Optional JSON file containing Variant[]')
    .option('--only <list>', 'Comma-separated variant names to run (default: all)')
    .option('--render-only', 'Only render MP4s (skip scoring)', false)
    .option('--score-only', 'Only run scoring (skip render)', false)
    .option('--sync-top <n>', 'Run sync rating for top N caption scores', '1')
    .option('--fps <n>', 'OCR FPS for caption-quality scoring', '2')
    .option('--caption-y-ratio <n>', 'Caption crop y ratio (0..1)', '0.65')
    .option('--caption-height-ratio <n>', 'Caption crop height ratio (0..1)', '0.35');

  program.parse(process.argv);
  const opts = program.opts<{
    dir: string;
    tag: string;
    variants?: string;
    only?: string;
    renderOnly: boolean;
    scoreOnly: boolean;
    syncTop: string;
    fps: string;
    captionYRatio: string;
    captionHeightRatio: string;
  }>();

  const repoRoot = process.cwd();
  const baseDir = path.resolve(repoRoot, opts.dir);
  const rendersDir = path.join(baseDir, 'renders');
  await mkdir(rendersDir, { recursive: true });

  const visualsPath = path.join(baseDir, 'visuals.json');
  const audioPath = path.join(baseDir, 'audio.wav');
  const timestampsPath = path.join(baseDir, 'timestamps.json');

  const variants = opts.variants
    ? await readJson<Variant[]>(path.resolve(repoRoot, opts.variants))
    : getDefaultVariants();

  const selected = opts.only
    ? new Set(
        String(opts.only)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    : null;
  const effectiveVariants = selected
    ? variants.filter((variant) => selected.has(variant.name))
    : variants;

  const results: ResultRow[] = [];

  for (const variant of effectiveVariants) {
    const baseName = `${opts.tag}-${variant.name}`;
    const videoPath = path.join(rendersDir, `${baseName}.mp4`);
    const captionReportPath = path.join(rendersDir, `${baseName}-caption-report.json`);
    const syncReportPath = path.join(rendersDir, `${baseName}-sync-report.json`);

    if (!opts.scoreOnly) {
      await runProcess(
        './node_modules/.bin/tsx',
        [
          'src/cli/index.ts',
          'render',
          '-i',
          visualsPath,
          '--audio',
          audioPath,
          '--timestamps',
          timestampsPath,
          '-o',
          videoPath,
          ...variant.renderArgs,
        ],
        repoRoot
      );
    }

    let captionScore: number | null = null;
    let coverage: number | null = null;
    let rhythm: number | null = null;
    let placement: number | null = null;
    let style: number | null = null;
    let ocrConfidence: number | null = null;

    if (!opts.renderOnly) {
      const fps = Number.parseInt(opts.fps, 10);
      const yRatio = Number.parseFloat(opts.captionYRatio);
      const heightRatio = Number.parseFloat(opts.captionHeightRatio);

      const report = await rateCaptionQuality(videoPath, {
        fps,
        captionRegion: { yRatio, heightRatio },
      });
      await writeFile(captionReportPath, JSON.stringify(report, null, 2));

      const cq = report.captionQuality;
      captionScore = cq.overall.score;
      coverage = cq.coverage.score;
      rhythm = cq.rhythm.score;
      placement = cq.placement.score;
      style = cq.style.score;
      ocrConfidence = cq.ocrConfidence.score;
    }

    results.push({
      variant: variant.name,
      videoPath,
      captionReportPath,
      syncReportPath,
      captionScore,
      coverage,
      rhythm,
      placement,
      style,
      ocrConfidence,
      syncRating: null,
    });
  }

  if (!opts.renderOnly) {
    const syncTop = Math.max(0, Number.parseInt(opts.syncTop, 10));
    const ranked = [...results]
      .filter((row) => row.captionScore != null)
      .sort((a, b) => (b.captionScore ?? -1) - (a.captionScore ?? -1))
      .slice(0, syncTop);

    for (const row of ranked) {
      const sync = await rateSyncQuality(row.videoPath, { fps: 2 });
      if (row.syncReportPath) {
        await writeFile(row.syncReportPath, JSON.stringify(sync, null, 2));
      }
      row.syncRating = sync.rating;
    }
  }

  const printable = results
    .map((row) => ({
      variant: row.variant,
      captionScore: row.captionScore == null ? null : Number(row.captionScore.toFixed(4)),
      rhythm: row.rhythm == null ? null : Number(row.rhythm.toFixed(3)),
      placement: row.placement == null ? null : Number(row.placement.toFixed(3)),
      style: row.style == null ? null : Number(row.style.toFixed(3)),
      coverage: row.coverage == null ? null : Number(row.coverage.toFixed(3)),
      ocr: row.ocrConfidence == null ? null : Number(row.ocrConfidence.toFixed(3)),
      sync: row.syncRating,
      video: path.relative(repoRoot, row.videoPath),
    }))
    .sort((a, b) => (b.captionScore ?? -1) - (a.captionScore ?? -1));

  console.table(printable);

  const outputPath = path.join(rendersDir, `${opts.tag}-sweep-results.json`);
  await writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
