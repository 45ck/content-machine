import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import type {
  BenchDeterminismResult,
  BenchReport,
  BenchSeparationResult,
  BenchStressCheckResult,
  BenchStressManifest,
  BenchStressVariant,
} from './types';
import { median, spearmanRankCorrelation } from './stats';
import { CMError } from '../core/errors';

function listMp4Files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .map((f) => join(dir, f))
    .sort();
}

function loadStressManifest(stressDir: string): BenchStressManifest | null {
  const manifestPath = join(stressDir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  const raw = readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as BenchStressManifest;
}

function getMetricValue(variant: BenchStressVariant, report: any): number {
  if (variant.expectedMetric === 'sync.rating') {
    const rating = Number(report?.rating ?? 0);
    return Math.max(0, Math.min(1, rating / 100));
  }

  const q = report.captionQuality;
  switch (variant.expectedMetric) {
    case 'overall.score':
      return q.overall.score;
    case 'safeArea.score':
      return q.safeArea.score;
    case 'flicker.score':
      return q.flicker.score;
    case 'jitter.score':
      return q.jitter.score;
    case 'ocrConfidence.score':
      return q.ocrConfidence.score;
    default:
      return q.overall.score;
  }
}

function hasErrorType(report: any, errorType: string): boolean {
  return Boolean(report.errors?.some((e: any) => e.type === errorType));
}

async function rateCaption(videoPath: string, fps: number): Promise<any> {
  const { rateCaptionQuality } = await import('../score/sync-rater');
  return rateCaptionQuality(videoPath, {
    fps,
    captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
  });
}

async function rateSync(videoPath: string, fps: number): Promise<any> {
  const { rateSyncQuality } = await import('../score/sync-rater');
  return rateSyncQuality(videoPath, {
    fps,
    captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
    asrModel: 'base',
  });
}

async function runDeterminismCheck(params: {
  samples: string[];
  runs: number;
  epsilon: number;
  rateCaption: (videoPath: string) => Promise<any>;
}): Promise<BenchDeterminismResult> {
  const runs = Math.max(1, params.runs);
  const epsilon = Math.max(0, params.epsilon);

  let worstDelta = 0;
  const samples: BenchDeterminismResult['samples'] = [];

  for (const videoPath of params.samples) {
    const reports: any[] = [];
    for (let i = 0; i < runs; i++) {
      reports.push(await params.rateCaption(videoPath));
    }

    const overalls = reports.map((r) => r.captionQuality.overall.score);
    const ocrs = reports.map((r) => r.captionQuality.ocrConfidence.score);

    const overallDelta = Math.max(...overalls) - Math.min(...overalls);
    const ocrDelta = Math.max(...ocrs) - Math.min(...ocrs);
    worstDelta = Math.max(worstDelta, overallDelta, ocrDelta);

    samples.push({
      videoPath,
      deltas: { overall: overallDelta, ocrConfidence: ocrDelta },
    });
  }

  return {
    runs,
    epsilon,
    passed: worstDelta <= epsilon,
    worstDelta,
    samples,
  };
}

function runSeparationCheck(params: {
  proScores: number[];
  ourScores: number[];
}): BenchSeparationResult {
  const proCount = params.proScores.length;
  const ourCount = params.ourScores.length;
  const proMedian = median(params.proScores);
  const ourMedian = median(params.ourScores);

  // Tiny-set separation: pairwise win rate using all pairs.
  let wins = 0;
  let total = 0;
  for (const p of params.proScores) {
    for (const o of params.ourScores) {
      total += 1;
      if (p > o) wins += 1;
    }
  }
  const proBeatsOurRatio = total > 0 ? wins / total : 0;

  return {
    passed: proCount > 0 && ourCount > 0 ? proMedian > ourMedian : false,
    proCount,
    ourCount,
    metric: 'captionQuality.overall.score',
    proMedian,
    ourMedian,
    proBeatsOurRatio,
  };
}

async function scoreOverallForVideos(params: {
  rootDir: string;
  videoPaths: string[];
  rateCaption: (videoPath: string) => Promise<any>;
}): Promise<Array<{ videoPath: string; overallScore: number }>> {
  const out: Array<{ videoPath: string; overallScore: number }> = [];
  for (const videoPath of params.videoPaths) {
    const r = await params.rateCaption(videoPath);
    out.push({
      videoPath: relative(params.rootDir, videoPath),
      overallScore: r.captionQuality.overall.score,
    });
  }
  return out;
}

async function runStressChecks(params: {
  rootDir: string;
  stressDir: string;
  rateCaption: (videoPath: string) => Promise<any>;
  rateSync: (videoPath: string) => Promise<any>;
}): Promise<BenchStressCheckResult[]> {
  const manifest = loadStressManifest(params.stressDir);
  const variants = manifest?.variants ?? [];
  if (!manifest && existsSync(params.stressDir)) {
    // If user created stress videos manually without a manifest, we still run separation/determinism.
  }

  const groups = new Map<string, BenchStressVariant[]>();
  for (const v of variants) {
    const key = `${v.proSourcePath}::${v.recipeId}`;
    const arr = groups.get(key) ?? [];
    arr.push(v);
    groups.set(key, arr);
  }

  const stressResults: BenchStressCheckResult[] = [];

  for (const [key, list] of groups) {
    const [proSourcePath, recipeId] = key.split('::');
    const sorted = [...list].sort((a, b) => a.severity - b.severity);
    const expectedMetric = sorted[0]?.expectedMetric ?? 'overall.score';
    const expectedErrorType = sorted[0]?.expectedErrorType;

    const rateVariant = async (videoPath: string): Promise<any> => {
      return expectedMetric === 'sync.rating'
        ? params.rateSync(videoPath)
        : params.rateCaption(videoPath);
    };

    const points: BenchStressCheckResult['points'] = [];

    // level 0 baseline = original PRO video at severity 0
    const baselineVariant: BenchStressVariant = {
      schemaVersion: '1.0.0',
      id: `${proSourcePath}:baseline`,
      recipeId,
      recipeLabel: 'baseline',
      severity: 0,
      proSourcePath,
      outputPath: proSourcePath,
      description: 'Baseline PRO video',
      expectedMetric,
      expectedErrorType,
    };

    const baselineReport = await rateVariant(baselineVariant.outputPath);
    points.push({
      severity: 0,
      value: getMetricValue(baselineVariant, baselineReport),
      videoPath: relative(params.rootDir, baselineVariant.outputPath),
    });

    for (const v of sorted) {
      if (!existsSync(v.outputPath)) continue;
      const report = await rateVariant(v.outputPath);
      points.push({
        severity: v.severity,
        value: getMetricValue(v, report),
        videoPath: relative(params.rootDir, v.outputPath),
      });
    }

    const severities = points.map((p) => p.severity);
    const values = points.map((p) => p.value);
    // Spearman on "defect severity vs (1-score)" so expected is strong positive.
    const invert = values.map((v) => 1 - v);
    const spearman = spearmanRankCorrelation(severities, invert);
    const effect = Math.max(...invert) - Math.min(...invert);
    const tolerance = 0.005; // ignore tiny OCR noise
    let reversalCount = 0;
    for (let i = 1; i < invert.length; i++) {
      if (invert[i] + tolerance < invert[i - 1]) reversalCount += 1;
    }
    const spearmanThreshold = 0.9;
    const spearmanEps = 1e-9;
    const monotonicPassed =
      effect >= 0.05 &&
      (reversalCount === 0 || (invert.length >= 4 && spearman + spearmanEps >= spearmanThreshold));

    let errorTriggered: boolean | null = null;
    if (expectedErrorType) {
      const max = sorted[sorted.length - 1];
      if (max && existsSync(max.outputPath)) {
        const maxReport = await rateVariant(max.outputPath);
        errorTriggered = hasErrorType(maxReport, expectedErrorType);
      } else {
        errorTriggered = null;
      }
    }

    stressResults.push({
      proSourcePath,
      recipeId,
      expectedMetric,
      expectedErrorType,
      spearman,
      effect,
      reversalCount,
      monotonicPassed,
      errorTriggered,
      points,
    });
  }

  return stressResults;
}

function computeBaselineCheck(params: {
  baselinePath: string;
  ourVideos: Array<{ videoPath: string; overallScore: number }>;
}): NonNullable<BenchReport['baseline']> {
  const maxRegression = 0.01;

  if (!existsSync(params.baselinePath)) {
    return {
      path: params.baselinePath,
      present: false,
      passed: true,
      maxRegression,
      worstDelta: 0,
      regressed: [],
    };
  }

  try {
    const raw = readFileSync(params.baselinePath, 'utf8');
    const prior = JSON.parse(raw) as Partial<BenchReport>;
    const baselineOur = new Map<string, number>();
    for (const v of prior.videos?.our ?? []) {
      baselineOur.set(v.videoPath, v.overallScore);
    }

    let worstDelta = 0;
    const regressed: Array<{
      videoPath: string;
      baseline: number;
      current: number;
      delta: number;
    }> = [];
    for (const v of params.ourVideos) {
      const base = baselineOur.get(v.videoPath);
      if (base === undefined) continue;
      const delta = v.overallScore - base;
      worstDelta = Math.min(worstDelta, delta);
      if (delta < -maxRegression) {
        regressed.push({
          videoPath: v.videoPath,
          baseline: base,
          current: v.overallScore,
          delta,
        });
      }
    }

    return {
      path: params.baselinePath,
      present: true,
      passed: regressed.length === 0,
      maxRegression,
      worstDelta,
      regressed,
    };
  } catch {
    return {
      path: params.baselinePath,
      present: true,
      passed: false,
      maxRegression,
      worstDelta: -1,
      regressed: [],
    };
  }
}

export async function runBench(params: {
  rootDir: string;
  includeStress: boolean;
  determinismRuns: number;
  determinismEpsilon: number;
  captionFps?: number;
  syncFps?: number;
  deps?: {
    rateCaption?: (videoPath: string) => Promise<any>;
    rateSync?: (videoPath: string) => Promise<any>;
  };
}): Promise<BenchReport> {
  const rootDir = resolve(params.rootDir);
  const proDir = join(rootDir, 'pro');
  const ourDir = join(rootDir, 'our');
  const stressDir = join(rootDir, 'stress');
  const baselinePath = join(rootDir, 'results', 'baseline.json');

  const proFiles = listMp4Files(proDir);
  const ourFiles = listMp4Files(ourDir);
  if (proFiles.length === 0) {
    throw new CMError('FILE_NOT_FOUND', `No PRO videos found under: ${proDir}`, {
      fix: 'Add a few captioned videos to bench/pro/*.mp4 and re-run: cm bench run',
    });
  }
  if (ourFiles.length === 0) {
    throw new CMError('FILE_NOT_FOUND', `No OUR videos found under: ${ourDir}`, {
      fix: 'Add a few generated outputs to bench/our/*.mp4 and re-run: cm bench run',
    });
  }

  const captionFps = Math.max(1, Math.round(params.captionFps ?? 2));
  const syncFps = Math.max(1, Math.round(params.syncFps ?? 2));

  const deps = {
    rateCaption:
      params.deps?.rateCaption ?? ((videoPath: string) => rateCaption(videoPath, captionFps)),
    rateSync: params.deps?.rateSync ?? ((videoPath: string) => rateSync(videoPath, syncFps)),
  };

  const determinism = await runDeterminismCheck({
    samples: [proFiles[0], ourFiles[0]].filter(Boolean) as string[],
    runs: params.determinismRuns,
    epsilon: params.determinismEpsilon,
    rateCaption: deps.rateCaption,
  });

  const proVideos = await scoreOverallForVideos({
    rootDir,
    videoPaths: proFiles,
    rateCaption: deps.rateCaption,
  });
  const ourVideos = await scoreOverallForVideos({
    rootDir,
    videoPaths: ourFiles,
    rateCaption: deps.rateCaption,
  });

  const proScores = proVideos.map((v) => v.overallScore);
  const ourScores = ourVideos.map((v) => v.overallScore);
  const separation = runSeparationCheck({ proScores, ourScores });

  const stressResults = params.includeStress
    ? await runStressChecks({
        rootDir,
        stressDir,
        rateCaption: deps.rateCaption,
        rateSync: deps.rateSync,
      })
    : [];

  const passed =
    determinism.passed &&
    stressResults.every((r) => r.monotonicPassed) &&
    stressResults.every((r) => (r.expectedErrorType ? r.errorTriggered !== false : true));

  const baseline = computeBaselineCheck({ baselinePath, ourVideos });

  return {
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    rootDir,
    videos: { pro: proVideos, our: ourVideos },
    summary: {
      passed: passed && baseline.passed,
      proCount: proFiles.length,
      ourCount: ourFiles.length,
      stressCount: stressResults.length,
    },
    determinism,
    separation,
    stress: stressResults,
    baseline,
  };
}
