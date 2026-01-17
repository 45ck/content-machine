import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename, extname, dirname } from 'node:path';
import { CMError } from '../core/errors';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import { buildDefaultBenchVariants } from './recipes';
import type { BenchPaths, BenchStressManifest, BenchStressVariant } from './types';
import { runFfmpeg } from './ffmpeg';

function resolveBenchPaths(rootDir: string): BenchPaths {
  return {
    rootDir,
    proDir: join(rootDir, 'pro'),
    ourDir: join(rootDir, 'our'),
    stressDir: join(rootDir, 'stress'),
    resultsDir: join(rootDir, 'results'),
  };
}

function listMp4Files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .map((f) => join(dir, f))
    .sort();
}

function baseNameNoExt(path: string): string {
  const b = basename(path);
  const ext = extname(b);
  return ext ? b.slice(0, -ext.length) : b;
}

function outputPathForVariant(params: {
  stressDir: string;
  proSourcePath: string;
  recipeId: string;
  label: string;
}): string {
  const proBase = baseNameNoExt(params.proSourcePath);
  const safeLabel = params.label.replace(/[^a-z0-9._-]+/gi, '_');
  return join(params.stressDir, proBase, params.recipeId, `${safeLabel}.mp4`);
}

function buildVideoEncodeArgs(): string[] {
  return [
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-preset',
    'veryfast',
    '-crf',
    '18',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
  ];
}

function numberParam(variant: BenchStressVariant, key: string): number | null {
  const value = variant.recipeParams?.[key];
  return Number.isFinite(value) ? Number(value) : null;
}

function buildVariantFilter(params: {
  recipeId: string;
  proInfo: { width: number; height: number };
  variant: BenchStressVariant;
}): string | null {
  const { recipeId, proInfo, variant } = params;

  if (recipeId === 'safe-area-down') {
    const px = Math.max(0, Math.round(numberParam(variant, 'shiftDownPx') ?? variant.severity));
    // Pad top to shift content down, then crop back to original height.
    // This preserves the original resolution while pushing bottom content into unsafe margin (and at high severity, cropping it).
    return `pad=iw:ih+${px}:0:${px}:black,crop=iw:ih:0:0`;
  }

  if (recipeId === 'caption-flicker') {
    const periodSeconds = Math.max(
      0.1,
      Number(numberParam(variant, 'periodSeconds') ?? 1000 / Math.max(1, variant.severity))
    );
    const gapSeconds = Math.max(
      0.05,
      Math.min(0.5, Number(numberParam(variant, 'gapSeconds') ?? 0.45))
    );
    const bandYRatio = Math.max(0, Math.min(1, numberParam(variant, 'bandYRatio') ?? 0.65));
    const bandHeightRatio = Math.max(
      0,
      Math.min(1, numberParam(variant, 'bandHeightRatio') ?? 0.35)
    );
    // Blank the caption band for `gapSeconds` at the start of each `periodSeconds` interval.
    return `drawbox=x=0:y=ih*${bandYRatio}:w=iw:h=ih*${bandHeightRatio}:color=black@1:t=fill:enable='lt(mod(t\\,${periodSeconds})\\,${gapSeconds})'`;
  }

  if (recipeId === 'contrast-sabotage') {
    const contrast = Math.max(
      0.1,
      Math.min(1, numberParam(variant, 'contrast') ?? 1 - variant.severity / 100)
    );
    const brightness = Math.max(-1, Math.min(1, numberParam(variant, 'brightness') ?? 0.05));
    const saturation = Math.max(0, Math.min(3, numberParam(variant, 'saturation') ?? 1.0));
    const blurSigma = Math.max(0, Math.min(12, numberParam(variant, 'blurSigma') ?? 0));
    const noise = Math.max(0, Math.min(100, numberParam(variant, 'noise') ?? 0));
    const eq = `eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`;
    const parts: string[] = [eq];
    if (blurSigma > 0) parts.push(`gblur=sigma=${blurSigma}:steps=1`);
    if (noise > 0) parts.push(`noise=alls=${noise}:allf=t+u`);
    return parts.join(',');
  }

  if (recipeId === 'shake') {
    const amp = Math.max(1, Math.min(128, numberParam(variant, 'amplitudePx') ?? variant.severity));
    const w = proInfo.width;
    const h = proInfo.height;
    // Scale slightly up to allow crop window to move without black borders, then crop with time-varying offsets.
    // Keep offsets within [0, 2*amp] pixels.
    return `scale=${w + 2 * amp}:${h + 2 * amp},crop=${w}:${h}:x='${amp}*(1+sin(n*0.15))':y='${amp}*(1+cos(n*0.13))'`;
  }

  if (recipeId === 'compression') {
    const factor = Math.max(0.1, Math.min(1, numberParam(variant, 'downscaleFactor') ?? 1));
    const blurSigma = Math.max(0, Math.min(12, numberParam(variant, 'blurSigma') ?? 0));
    if (factor >= 1 && blurSigma <= 0) return null;
    const downW = Math.max(2, Math.round((proInfo.width * factor) / 2) * 2);
    const downH = Math.max(2, Math.round((proInfo.height * factor) / 2) * 2);
    const parts = [
      `scale=${downW}:${downH}:flags=bilinear`,
      `scale=${proInfo.width}:${proInfo.height}:flags=bilinear`,
    ];
    if (blurSigma > 0) parts.push(`gblur=sigma=${blurSigma}:steps=1`);
    return parts.join(',');
  }

  return null;
}

function buildCompressionArgs(params: { variant: BenchStressVariant }): string[] | null {
  if (params.variant.recipeId !== 'compression') return null;
  const kbps =
    numberParam(params.variant, 'bitrateKbps') ??
    Math.max(200, Math.min(12_000, Math.round(10_000 / Math.max(1, params.variant.severity))));
  return [
    '-c:v',
    'libx264',
    '-b:v',
    `${kbps}k`,
    '-maxrate',
    `${kbps}k`,
    '-bufsize',
    `${kbps * 2}k`,
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    '-g',
    '60',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
  ];
}

export function buildFfmpegArgsForVariant(params: {
  variant: BenchStressVariant;
  proInfo: { width: number; height: number };
}): { args: string[]; outPath: string } {
  const { variant, proInfo } = params;

  const args: string[] = ['-hide_banner', '-y', '-i', variant.proSourcePath];

  if (variant.recipeId === 'audio-desync') {
    const delayMs = Math.max(0, Math.round(numberParam(variant, 'delayMs') ?? variant.severity));
    // Delay audio relative to video; keep video bitstream unchanged so only sync is affected.
    args.push(
      '-filter_complex',
      `[0:a]adelay=${delayMs}|${delayMs}[a]`,
      '-map',
      '0:v:0',
      '-map',
      '[a]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart'
    );
    args.push(variant.outputPath);
    return { args, outPath: variant.outputPath };
  }

  const vf = buildVariantFilter({
    recipeId: variant.recipeId,
    proInfo,
    variant,
  });
  if (vf) {
    args.push('-vf', vf);
  }

  const compressionArgs = buildCompressionArgs({ variant });
  if (compressionArgs) {
    args.push(...compressionArgs);
  } else {
    args.push(...buildVideoEncodeArgs());
  }

  args.push(variant.outputPath);
  return { args, outPath: variant.outputPath };
}

export async function generateBenchStressVariants(params: {
  rootDir: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  overwrite?: boolean;
}): Promise<{ generatedCount: number; manifestPath: string }> {
  const rootDir = resolve(params.rootDir);
  const paths = resolveBenchPaths(rootDir);
  const ffmpegPath = params.ffmpegPath ?? 'ffmpeg';
  const ffprobePath = params.ffprobePath ?? 'ffprobe';

  mkdirSync(paths.stressDir, { recursive: true });
  mkdirSync(paths.resultsDir, { recursive: true });

  const proFiles = listMp4Files(paths.proDir);
  if (proFiles.length === 0) {
    throw new CMError('FILE_NOT_FOUND', `No PRO videos found under: ${paths.proDir}`, {
      fix: 'Add a few captioned videos to bench/pro/*.mp4 and re-run: cm bench generate',
    });
  }

  const variants: BenchStressVariant[] = [];
  for (const proSourcePath of proFiles) {
    variants.push(...buildDefaultBenchVariants({ proSourcePath }));
  }

  const proInfoCache = new Map<string, { width: number; height: number; audioCodec: string }>();
  for (const proSourcePath of proFiles) {
    const info = await probeVideoWithFfprobe(proSourcePath, { ffprobePath });
    proInfoCache.set(proSourcePath, {
      width: info.width,
      height: info.height,
      audioCodec: info.audioCodec,
    });
  }

  const filteredVariants = variants.filter((variant) => {
    if (variant.recipeId !== 'audio-desync') return true;
    const info = proInfoCache.get(variant.proSourcePath);
    return Boolean(info && info.audioCodec !== 'unknown');
  });

  let generatedCount = 0;
  for (const variant of filteredVariants) {
    const outPath = outputPathForVariant({
      stressDir: paths.stressDir,
      proSourcePath: variant.proSourcePath,
      recipeId: variant.recipeId,
      label: variant.recipeLabel,
    });
    variant.outputPath = outPath;

    if (!params.overwrite && existsSync(outPath)) continue;
    mkdirSync(dirname(outPath), { recursive: true });

    const info = proInfoCache.get(variant.proSourcePath);
    if (!info) {
      throw new CMError('VIDEO_PROBE_ERROR', 'Missing cached video info for PRO source', {
        proSourcePath: variant.proSourcePath,
      });
    }
    const { args } = buildFfmpegArgsForVariant({
      variant,
      proInfo: { width: info.width, height: info.height },
    });

    await runFfmpeg({ ffmpegPath, args, timeoutMs: 180_000 });
    generatedCount += 1;
  }

  const manifest: BenchStressManifest = {
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    rootDir,
    variants: filteredVariants,
  };

  const manifestPath = join(paths.stressDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { generatedCount, manifestPath };
}
