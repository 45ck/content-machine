/**
 * Render Service
 *
 * Coordinates video rendering with Remotion.
 * Based on SYSTEM-DESIGN §7.4 cm render command.
 */
import { stat, writeFile, copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { VisualsOutput, VisualsOutputInput } from '../visuals/schema';
import { TimestampsOutput } from '../audio/schema';
import type { AudioMixOutput } from '../audio/mix/schema';
import { Orientation } from '../core/config';
import { createLogger } from '../core/logger';
import { CMError, RenderError } from '../core/errors';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import {
  RenderOutput,
  RenderOutputSchema,
  RenderPropsInput,
  CaptionStyle,
  RENDER_SCHEMA_VERSION,
  HookClipInput,
  type FontSource,
} from './schema';
import { getCaptionPreset, CaptionPresetName } from './captions/presets';
import type { CaptionConfig, CaptionConfigInput } from './captions/config';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { filterCaptionWords } from './captions/paging';
import { FONT_STACKS } from './tokens/font';
import {
  applyVisualAssetBundlePlan,
  buildVisualAssetBundlePlan,
} from './assets/visual-asset-bundler';
import { downloadRemoteAssetsToCache } from './assets/remote-assets';
import { prepareAudioMixForRender, type BundleAsset } from './audio-mix';

// Get the directory containing this file for Remotion bundling
// In ESM, we use import.meta.url; __dirname is injected by esbuild for CJS
function getCurrentDir(): string {
  // ESM path - always try this first when running with tsx or native ESM
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // CJS fallback - __dirname is available when bundled with esbuild
  // This line is only reached in bundled CJS context where esbuild injects __dirname
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
}

const RENDER_DIR = getCurrentDir();

function resolveRemotionEntryPoint(): string {
  const envOverride = process.env.CM_REMOTION_ENTRY;
  if (envOverride && existsSync(envOverride)) {
    return envOverride;
  }

  const candidates = [
    join(process.cwd(), 'src', 'render', 'remotion', 'index.ts'),
    join(process.cwd(), 'dist', 'render', 'remotion', 'index.js'),
    join(RENDER_DIR, 'remotion', 'index.ts'),
    join(RENDER_DIR, 'remotion', 'index.js'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return join(RENDER_DIR, 'remotion', 'index.ts');
}

export type { RenderOutput, RenderProps } from './schema';

export interface RenderVideoOptions {
  /** Visuals output - accepts input or output type (defaults applied during rendering) */
  visuals: VisualsOutput | VisualsOutputInput;
  timestamps: TimestampsOutput;
  audioPath: string;
  audioMix?: AudioMixOutput;
  /** Base dir for resolving audio mix asset paths */
  audioMixBaseDir?: string;
  outputPath: string;
  orientation: Orientation;
  fps?: number;
  /** Remotion composition id (defaults to "ShortVideo") */
  compositionId?: string;
  /** Split-screen ratio (top height / total height), used by split-screen templates */
  splitScreenRatio?: number;
  /** Split-screen layout positions */
  gameplayPosition?: 'top' | 'bottom' | 'full';
  contentPosition?: 'top' | 'bottom' | 'full';
  /** Optional hook clip to prepend before main content */
  hook?: HookClipInput;
  /**
   * Download remote visual assets (e.g. Pexels URLs) into the Remotion bundle for
   * more reliable rendering.
   *
   * Default: true (best-effort, falls back to remote URL on failure).
   */
  downloadAssets?: boolean;
  /** @deprecated Use captionConfig or captionPreset instead */
  captionStyle?: Partial<CaptionStyle>;
  /** New comprehensive caption configuration (accepts partial input, defaults applied) */
  captionConfig?: CaptionConfigInput;
  /** Use a preset caption style (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke) */
  captionPreset?: CaptionPresetName;
  archetype?: string;
  /** Use mock mode for testing without real rendering */
  mock?: boolean;
  /**
   * Optional progress callback for CLI UX (phase + percent).
   * Progress is reported as 0..1 when available.
   */
  onProgress?: (event: RenderProgressEvent) => void;
  /**
   * Caption grouping window in milliseconds.
   * Controls how many words are grouped into a single caption "page".
   * Default: 800
   */
  captionGroupMs?: number;
  /**
   * Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence)
   */
  captionMode?: 'page' | 'single' | 'buildup' | 'chunk';
  /**
   * Words per caption page/group.
   * Default: 8 (for larger sentences)
   */
  wordsPerPage?: number;
  /**
   * Maximum lines per caption page.
   * Default: 2 (for multi-line captions)
   */
  maxLinesPerPage?: number;
  /**
   * Maximum characters per line before wrapping.
   * Default: 25 (words never break mid-word)
   */
  maxCharsPerLine?: number;
  /**
   * Caption animation: none (default), fade, slideUp, slideDown, pop, bounce
   */
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
  /** Caption font family override */
  captionFontFamily?: string;
  /** Caption font weight override */
  captionFontWeight?: number | 'normal' | 'bold' | 'black';
  /** Caption font style for custom font loading */
  captionFontStyle?: 'normal' | 'italic' | 'oblique';
  /** Caption font file path to bundle (ttf/otf/woff/woff2) */
  captionFontFile?: string;
  /** Drop filler words from captions */
  captionDropFillers?: boolean;
  /** Custom filler list (comma-separated via CLI) */
  captionFillerWords?: string[];
  /** Max words per minute for caption pacing */
  captionMaxWpm?: number;
  /** Max characters per second for caption pacing */
  captionMaxCps?: number;
  /** Minimum on-screen time for captions in ms */
  captionMinOnScreenMs?: number;
  /** Minimum on-screen time for short captions in ms */
  captionMinOnScreenMsShort?: number;
  /** Target words per chunk (chunk mode) */
  captionTargetWords?: number;
  /** Minimum words per chunk/page */
  captionMinWords?: number;
  /** Optional browser executable path for Remotion (useful if bundled Chromium fails) */
  browserExecutable?: string | null;
  /** Chrome mode for Remotion browser launch */
  chromeMode?: 'headless-shell' | 'chrome-for-testing';
  /** Custom font sources for Remotion */
  fonts?: FontSource[];
}

export type RenderProgressPhase =
  | 'prepare-assets'
  | 'bundle'
  | 'select-composition'
  | 'render-media'
  | 'mock';

export interface RenderProgressEvent {
  phase: RenderProgressPhase;
  progress?: number; // 0..1
  message?: string;
}

// Video dimensions by orientation
const DIMENSIONS: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

const MIN_LOCAL_VIDEO_BYTES = 8 * 1024;

interface BundleResult {
  bundleLocation: string;
  audioFilename: string;
}

function isRemoteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isLocalFile(path: string): boolean {
  if (!path || isRemoteUrl(path)) return false;
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

function deriveFontFamilyFromPath(path: string): string {
  const base = basename(path);
  const withoutExt = base.replace(/\.[^/.]+$/, '');
  const normalized = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized || 'Custom Font';
}

export function resolveCaptionFontAssets(options: RenderVideoOptions): {
  fontSources: FontSource[];
  fontAssets: BundleAsset[];
  captionFontFamily?: string;
} {
  const fontSources: FontSource[] = [];
  const fontAssets: BundleAsset[] = [];

  const normalizeFontSource = (font: FontSource): FontSource => {
    if (isRemoteUrl(font.src) || font.src.startsWith('data:')) {
      return font;
    }

    const resolvedPath = isLocalFile(font.src) ? font.src : resolve(font.src);
    if (isLocalFile(resolvedPath)) {
      const destPath = `fonts/${basename(resolvedPath)}`;
      fontAssets.push({ sourcePath: resolvedPath, destPath });
      return { ...font, src: destPath };
    }

    return font;
  };

  if (options.fonts && options.fonts.length > 0) {
    for (const font of options.fonts) {
      fontSources.push(normalizeFontSource(font));
    }
  }

  if (!options.captionFontFile) {
    return {
      fontSources,
      fontAssets,
      captionFontFamily: options.captionFontFamily,
    };
  }

  if (!isLocalFile(options.captionFontFile)) {
    throw new CMError('FILE_NOT_FOUND', 'Caption font file not found', {
      fix: 'Provide a local path to a .ttf, .otf, .woff, or .woff2 file',
    });
  }

  const captionFontFamily =
    options.captionFontFamily ?? deriveFontFamilyFromPath(options.captionFontFile);
  const destPath = `fonts/${basename(options.captionFontFile)}`;
  fontAssets.push({ sourcePath: options.captionFontFile, destPath });
  fontSources.push({
    family: captionFontFamily,
    src: destPath,
    weight: options.captionFontWeight,
    style: options.captionFontStyle,
  });

  return {
    fontSources,
    fontAssets,
    captionFontFamily,
  };
}

function resolveAssetCacheRoot(): string {
  const env = process.env.CM_ASSET_CACHE_DIR;
  return env ? resolve(env) : join(process.cwd(), '.cache', 'content-machine', 'assets');
}

type LocalVideoAsset = {
  path: string;
  label: 'visual' | 'gameplay' | 'hook';
};

async function validateLocalVideoAsset(
  asset: LocalVideoAsset,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  const resolvedPath = resolve(asset.path);
  let stats;
  try {
    stats = await stat(resolvedPath);
  } catch (error) {
    throw new CMError(
      'FILE_NOT_FOUND',
      `Local ${asset.label} clip not found: ${resolvedPath}`,
      {
        path: resolvedPath,
        fix: 'Ensure the clip path points to an existing local file',
      },
      error instanceof Error ? error : undefined
    );
  }

  if (!stats.isFile()) {
    throw new CMError('INVALID_MEDIA', `Local ${asset.label} clip is not a file: ${resolvedPath}`, {
      path: resolvedPath,
      fix: 'Provide a file path (not a directory) for the clip',
    });
  }

  if (stats.size < MIN_LOCAL_VIDEO_BYTES) {
    throw new CMError(
      'INVALID_MEDIA',
      `Local ${asset.label} clip is too small to be a valid video: ${resolvedPath}`,
      {
        path: resolvedPath,
        sizeBytes: stats.size,
        fix: 'Use a real video file (not a placeholder) or transcode with ffmpeg',
      }
    );
  }

  try {
    await probeVideoWithFfprobe(resolvedPath);
  } catch (error) {
    if (error instanceof CMError && error.code === 'DEPENDENCY_MISSING') {
      log.warn({ path: resolvedPath }, 'ffprobe missing; skipping local video validation');
      return;
    }
    if (error instanceof CMError) {
      throw new CMError(
        'INVALID_MEDIA',
        `Local ${asset.label} clip is not a playable video: ${resolvedPath}`,
        {
          path: resolvedPath,
          fix: 'Transcode to H.264 (yuv420p) or replace with a valid video file',
        },
        error
      );
    }
    throw error;
  }
}

async function validateLocalVideoAssets(
  assets: LocalVideoAsset[],
  log: ReturnType<typeof createLogger>
): Promise<void> {
  if (assets.length === 0) return;
  const seen = new Set<string>();

  for (const asset of assets) {
    const resolvedPath = resolve(asset.path);
    if (seen.has(resolvedPath)) continue;
    seen.add(resolvedPath);
    await validateLocalVideoAsset({ ...asset, path: resolvedPath }, log);
  }
}

/**
 * Bundle Remotion composition and copy audio to bundle
 */
async function bundleComposition(
  audioPath: string,
  log: ReturnType<typeof createLogger>,
  onProgress?: (event: RenderProgressEvent) => void,
  extraAssets: BundleAsset[] = []
): Promise<BundleResult> {
  log.debug('Bundling Remotion composition');

  const bundleLocation = await bundle({
    entryPoint: resolveRemotionEntryPoint(),
    onProgress: (progress) => {
      log.debug({ progress: Math.round(progress * 100) }, 'Bundling progress');
      onProgress?.({ phase: 'bundle', progress, message: 'Bundling' });
    },
  });

  log.debug({ bundleLocation }, 'Bundle complete');
  onProgress?.({ phase: 'bundle', progress: 1, message: 'Bundle complete' });

  // Copy audio file to bundle's public folder
  const audioFilename = basename(audioPath);
  const bundlePublicDir = join(bundleLocation, 'public');
  const bundleAudioPath = join(bundlePublicDir, audioFilename);

  await mkdir(bundlePublicDir, { recursive: true });
  await copyFile(resolve(audioPath), bundleAudioPath);
  log.debug({ audioFilename, bundleAudioPath }, 'Audio copied to bundle');

  for (const asset of extraAssets) {
    const assetDest = join(bundlePublicDir, asset.destPath);
    await mkdir(dirname(assetDest), { recursive: true });
    await copyFile(resolve(asset.sourcePath), assetDest);
    log.debug({ asset: asset.sourcePath, assetDest }, 'Asset copied to bundle');
  }

  return { bundleLocation, audioFilename };
}

/**
 * Resolve caption configuration from options
 * Priority: captionConfig > captionPreset > default (capcut)
 */
function resolveCaptionConfig(options: RenderVideoOptions): CaptionConfig {
  // Start with a preset (default to capcut)
  const presetName = options.captionPreset ?? 'capcut';
  const preset = getCaptionPreset(presetName);

  // Build layout with captionGroupMs, wordsPerPage, and line options overrides
  const layoutOverride: Partial<CaptionConfig['layout']> = {};
  if (options.captionGroupMs) {
    layoutOverride.maxGapMs = options.captionGroupMs;
  }
  if (options.wordsPerPage) {
    layoutOverride.maxWordsPerPage = options.wordsPerPage;
  }
  if (options.maxLinesPerPage) {
    layoutOverride.maxLinesPerPage = options.maxLinesPerPage;
  }
  if (options.maxCharsPerLine) {
    layoutOverride.maxCharsPerLine = options.maxCharsPerLine;
  }
  if (options.captionMaxWpm !== undefined) {
    layoutOverride.maxWordsPerMinute = options.captionMaxWpm;
  }
  if (options.captionMaxCps !== undefined) {
    layoutOverride.maxCharsPerSecond = options.captionMaxCps;
  }
  if (options.captionMinOnScreenMs !== undefined) {
    layoutOverride.minOnScreenMs = options.captionMinOnScreenMs;
  }
  if (options.captionMinOnScreenMsShort !== undefined) {
    layoutOverride.minOnScreenMsShort = options.captionMinOnScreenMsShort;
  }
  if (options.captionTargetWords !== undefined) {
    layoutOverride.targetWordsPerChunk = options.captionTargetWords;
  }
  if (options.captionMinWords !== undefined) {
    layoutOverride.minWordsPerPage = options.captionMinWords;
  }

  // Build top-level overrides
  const topLevelOverride: Partial<CaptionConfig> = {};
  if (options.captionMode) {
    topLevelOverride.displayMode = options.captionMode;
  }
  if (options.captionFontFamily) {
    topLevelOverride.fontFamily = options.captionFontFamily;
  }
  if (options.captionFontWeight !== undefined) {
    topLevelOverride.fontWeight = options.captionFontWeight;
  }
  if (options.wordsPerPage) {
    topLevelOverride.wordsPerPage = options.wordsPerPage;
  }
  if (options.captionAnimation) {
    topLevelOverride.pageAnimation = options.captionAnimation;
  }
  const dropFillers =
    options.captionDropFillers !== undefined
      ? options.captionDropFillers
      : options.captionFillerWords && options.captionFillerWords.length > 0
        ? true
        : undefined;
  const cleanupOverride =
    dropFillers !== undefined ||
    (options.captionFillerWords && options.captionFillerWords.length > 0)
      ? {
          dropFillers: Boolean(dropFillers),
          fillerWords: options.captionFillerWords ?? [],
        }
      : undefined;

  // If captionConfig is provided, merge it with the preset
  if (options.captionConfig) {
    return {
      ...preset,
      ...topLevelOverride,
      ...options.captionConfig,
      // Deep merge nested objects
      pillStyle: { ...preset.pillStyle, ...options.captionConfig.pillStyle },
      stroke: { ...preset.stroke, ...options.captionConfig.stroke },
      shadow: { ...preset.shadow, ...options.captionConfig.shadow },
      layout: { ...preset.layout, ...options.captionConfig.layout, ...layoutOverride },
      positionOffset: { ...preset.positionOffset, ...options.captionConfig.positionOffset },
      safeZone: { ...preset.safeZone, ...options.captionConfig.safeZone },
      emphasis: { ...preset.emphasis, ...options.captionConfig.emphasis },
      cleanup: {
        ...preset.cleanup,
        ...options.captionConfig.cleanup,
        ...(cleanupOverride ?? {}),
      },
    };
  }

  // Apply overrides to preset
  if (
    Object.keys(layoutOverride).length > 0 ||
    Object.keys(topLevelOverride).length > 0 ||
    cleanupOverride
  ) {
    return {
      ...preset,
      ...topLevelOverride,
      ...(cleanupOverride ? { cleanup: { ...preset.cleanup, ...cleanupOverride } } : {}),
      layout: { ...preset.layout, ...layoutOverride },
    };
  }

  return preset;
}

function normalizeSplitScreenRatio(value?: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid splitScreenRatio: ${value}`, {
      fix: 'Provide a number between 0.3 and 0.7 for split-screen templates',
    });
  }
  if (value < 0.3 || value > 0.7) {
    throw new CMError('INVALID_ARGUMENT', `splitScreenRatio out of bounds: ${value}`, {
      fix: 'Use a splitScreenRatio between 0.3 and 0.7',
    });
  }
  return value;
}

/**
 * Build render props with caption styling.
 * Returns RenderPropsInput since we accept VisualsOutputInput (defaults applied during Zod parsing).
 */
function buildRenderProps(
  options: RenderVideoOptions,
  dimensions: { width: number; height: number },
  fps: number,
  audioFilename: string,
  totalDuration: number
): RenderPropsInput {
  const captionConfig = resolveCaptionConfig(options);
  const splitScreenRatio = normalizeSplitScreenRatio(options.splitScreenRatio);

  // Sanitize words: filter out TTS markers, standalone punctuation, and optional fillers
  const sanitizedWords = filterCaptionWords(options.timestamps.allWords, captionConfig.cleanup);

  return {
    schemaVersion: RENDER_SCHEMA_VERSION,
    scenes: options.visuals.scenes,
    words: sanitizedWords,
    audioPath: audioFilename,
    audioMix: options.audioMix,
    duration: totalDuration,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    archetype: options.archetype,
    gameplayClip: options.visuals.gameplayClip,
    splitScreenRatio,
    gameplayPosition: options.gameplayPosition,
    contentPosition: options.contentPosition,
    fonts: options.fonts,
    hook: options.hook,
    captionConfig,
    // Keep legacy captionStyle for backwards compatibility
    captionStyle: {
      fontFamily: FONT_STACKS.body,
      fontSize: 80,
      fontWeight: 'bold',
      color: '#FFFFFF',
      highlightColor: '#FFE135',
      highlightCurrentWord: true,
      strokeColor: '#000000',
      strokeWidth: 4,
      position: 'bottom',
      animation: 'pop',
      ...options.captionStyle,
    },
  };
}

/** Options for executeRender helper */
interface ExecuteRenderOptions {
  bundleLocation: string;
  renderProps: RenderPropsInput;
  outputPath: string;
  dimensions: { width: number; height: number };
  fps: number;
  totalDuration: number;
  compositionId: string;
  log: ReturnType<typeof createLogger>;
  onProgress?: (event: RenderProgressEvent) => void;
  browserExecutable?: string | null;
  chromeMode?: 'headless-shell' | 'chrome-for-testing';
}

/**
 * Execute Remotion render
 */
async function executeRender(opts: ExecuteRenderOptions): Promise<void> {
  const {
    bundleLocation,
    renderProps,
    outputPath,
    dimensions,
    fps,
    totalDuration,
    compositionId,
    log,
    onProgress,
  } = opts;
  const concurrencyOverride = Number.parseInt(
    process.env.CM_REMOTION_CONCURRENCY ?? process.env.REMOTION_CONCURRENCY ?? '',
    10
  );
  const concurrency =
    Number.isFinite(concurrencyOverride) && concurrencyOverride > 0
      ? concurrencyOverride
      : undefined;
  log.debug('Selecting composition');
  onProgress?.({ phase: 'select-composition', progress: 0, message: 'Selecting composition' });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: renderProps,
    browserExecutable: opts.browserExecutable ?? null,
    chromeMode: opts.chromeMode,
  });

  onProgress?.({ phase: 'select-composition', progress: 1, message: 'Composition selected' });

  const durationInFrames = Math.ceil(totalDuration * fps);
  log.info({ durationInFrames }, 'Rendering video');

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
      width: dimensions.width,
      height: dimensions.height,
      fps,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: renderProps,
    browserExecutable: opts.browserExecutable ?? null,
    chromeMode: opts.chromeMode,
    ...(concurrency ? { concurrency } : {}),
    onProgress: ({ progress }) => {
      log.debug({ progress: Math.round(progress * 100) }, 'Render progress');
      onProgress?.({ phase: 'render-media', progress, message: 'Rendering' });
    },
  });
}

/**
 * Render final video with Remotion
 */
// eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity
export async function renderVideo(options: RenderVideoOptions): Promise<RenderOutput> {
  const log = createLogger({ module: 'render', outputPath: options.outputPath });

  const safeProgress = (event: RenderProgressEvent): void => {
    try {
      options.onProgress?.(event);
    } catch (error) {
      log.debug({ error }, 'Render progress callback failed');
    }
  };

  const fps = options.fps ?? 30;
  const dimensions = DIMENSIONS[options.orientation];
  const hookDuration = options.hook?.duration ?? 0;
  const totalDuration = options.timestamps.totalDuration + hookDuration;
  const compositionId = options.compositionId ?? 'ShortVideo';
  const chromeMode =
    options.chromeMode ?? (options.browserExecutable ? 'chrome-for-testing' : undefined);

  await mkdir(dirname(options.outputPath), { recursive: true });

  log.info(
    {
      orientation: options.orientation,
      fps,
      duration: totalDuration,
      sceneCount: options.visuals.scenes.length,
      hook: options.hook?.id ?? options.hook?.path ?? null,
      mock: options.mock,
      compositionId,
    },
    'Starting video render'
  );

  if (options.mock) {
    safeProgress({ phase: 'mock', progress: 1, message: 'Mock render complete' });
    return generateMockRender(options, dimensions, fps, totalDuration);
  }

  try {
    const downloadAssets = options.downloadAssets !== false;
    const assetCacheRoot = resolveAssetCacheRoot();

    const visualPlan = buildVisualAssetBundlePlan(options.visuals as VisualsOutputInput);
    const remotePlan = {
      assets: visualPlan.assets.filter((asset) => asset.sourceUrl),
    };
    const localPlan = {
      assets: visualPlan.assets.filter((asset) => asset.sourcePath),
    };

    const localValidationAssets: LocalVideoAsset[] = localPlan.assets
      .filter((asset) => asset.sourcePath)
      .map((asset) => ({ path: asset.sourcePath as string, label: 'visual' }));
    const gameplayClipInput = options.visuals.gameplayClip;
    if (gameplayClipInput && isLocalFile(gameplayClipInput.path)) {
      localValidationAssets.push({ path: gameplayClipInput.path, label: 'gameplay' });
    }
    const hookClipInput = options.hook;
    if (hookClipInput && isLocalFile(hookClipInput.path)) {
      localValidationAssets.push({ path: hookClipInput.path, label: 'hook' });
    }
    await validateLocalVideoAssets(localValidationAssets, log);

    let stockExtraAssets: BundleAsset[] = [];
    let localExtraAssets: BundleAsset[] = [];
    let visualsWithBundledAssets: VisualsOutput | VisualsOutputInput = options.visuals;

    if (downloadAssets && remotePlan.assets.length) {
      safeProgress({ phase: 'prepare-assets', progress: 0, message: 'Preparing visual assets' });

      const { extraAssets, succeededUrls } = await downloadRemoteAssetsToCache(remotePlan, {
        cacheRoot: assetCacheRoot,
        log,
        onProgress: ({ progress, message }) =>
          safeProgress({ phase: 'prepare-assets', progress, message }),
      });

      const succeededPlan = {
        assets: remotePlan.assets.filter(
          (asset) => asset.sourceUrl && succeededUrls.has(asset.sourceUrl)
        ),
      };

      visualsWithBundledAssets = applyVisualAssetBundlePlan(
        options.visuals as VisualsOutputInput,
        succeededPlan
      );
      stockExtraAssets = extraAssets;
    } else if (downloadAssets) {
      safeProgress({
        phase: 'prepare-assets',
        progress: 1,
        message: 'No visual assets to download',
      });
    }

    if (localPlan.assets.length) {
      const seenDest = new Set<string>();
      const resolvedLocalAssets = localPlan.assets.filter((asset) => {
        if (!asset.sourcePath) return false;
        const resolvedPath = resolve(asset.sourcePath);
        if (!existsSync(resolvedPath)) {
          throw new CMError('FILE_NOT_FOUND', 'Local visual asset not found', {
            path: resolvedPath,
            fix: 'Ensure visuals.json assetPath points to an existing local file',
          });
        }
        if (seenDest.has(asset.bundlePath)) return false;
        seenDest.add(asset.bundlePath);
        localExtraAssets.push({ sourcePath: resolvedPath, destPath: asset.bundlePath });
        return true;
      });

      if (resolvedLocalAssets.length > 0) {
        visualsWithBundledAssets = applyVisualAssetBundlePlan(
          visualsWithBundledAssets as VisualsOutputInput,
          { assets: resolvedLocalAssets }
        );
      }
    }

    const gameplayClip = visualsWithBundledAssets.gameplayClip;
    const gameplayPublicPath =
      gameplayClip && isLocalFile(gameplayClip.path)
        ? `gameplay/${basename(gameplayClip.path)}`
        : null;
    const gameplayAssets =
      gameplayPublicPath && gameplayClip
        ? [{ sourcePath: gameplayClip.path, destPath: gameplayPublicPath }]
        : [];
    const hookClip = options.hook;
    const hookPublicPath =
      hookClip && isLocalFile(hookClip.path) ? `hooks/${basename(hookClip.path)}` : null;
    const hookAssets =
      hookPublicPath && hookClip ? [{ sourcePath: hookClip.path, destPath: hookPublicPath }] : [];
    const { fontAssets, fontSources, captionFontFamily } = resolveCaptionFontAssets(options);
    const mixResult = options.audioMix
      ? prepareAudioMixForRender({
          mix: options.audioMix,
          audioPath: options.audioPath,
          mixBaseDir: options.audioMixBaseDir,
        })
      : null;
    if (mixResult?.warnings.length) {
      log.warn({ warnings: mixResult.warnings }, 'Audio mix warnings');
    }
    const extraAssets = [
      ...stockExtraAssets,
      ...localExtraAssets,
      ...gameplayAssets,
      ...hookAssets,
      ...fontAssets,
      ...(mixResult?.assets ?? []),
    ];

    const { bundleLocation, audioFilename } = await bundleComposition(
      options.audioPath,
      log,
      safeProgress,
      extraAssets
    );
    const visualsForRender =
      gameplayPublicPath && gameplayClip
        ? {
            ...visualsWithBundledAssets,
            gameplayClip: { ...gameplayClip, path: gameplayPublicPath },
          }
        : visualsWithBundledAssets;
    const hookForRender =
      hookPublicPath && hookClip ? { ...hookClip, path: hookPublicPath } : hookClip;
    const audioMixForRender = mixResult
      ? { ...mixResult.mix, voicePath: audioFilename }
      : undefined;
    const renderProps = buildRenderProps(
      {
        ...options,
        visuals: visualsForRender,
        hook: hookForRender,
        fonts: fontSources,
        captionFontFamily,
        audioMix: audioMixForRender,
      },
      dimensions,
      fps,
      audioFilename,
      totalDuration
    );
    await executeRender({
      bundleLocation,
      renderProps,
      outputPath: options.outputPath,
      dimensions,
      fps,
      totalDuration,
      compositionId,
      log,
      onProgress: safeProgress,
      browserExecutable: options.browserExecutable ?? null,
      chromeMode,
    });

    const stats = await stat(options.outputPath);
    const output: RenderOutput = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      outputPath: options.outputPath,
      duration: totalDuration,
      width: dimensions.width,
      height: dimensions.height,
      fps,
      fileSize: stats.size,
      codec: 'h264',
      archetype: options.archetype,
    };

    const validated = RenderOutputSchema.parse(output);
    log.info(
      { duration: validated.duration, fileSize: validated.fileSize },
      'Video render complete'
    );
    return validated;
  } catch (error) {
    log.error({ error }, 'Video render failed');
    if (error instanceof CMError) {
      throw error;
    }
    throw new RenderError(
      `Video render failed: ${error instanceof Error ? error.message : String(error)}`,
      { outputPath: options.outputPath },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate mock render output for testing
 */
async function generateMockRender(
  options: RenderVideoOptions,
  dimensions: { width: number; height: number },
  fps: number,
  totalDuration: number
): Promise<RenderOutput> {
  const log = createLogger({ module: 'render', mock: true });

  // Create a small, valid MP4 placeholder so players/validators accept it.
  const mockVideoBuffer = Buffer.from(MOCK_MP4_BASE64, 'base64');
  await writeFile(options.outputPath, mockVideoBuffer);
  await probeVideoWithFfprobe(options.outputPath);

  const output: RenderOutput = {
    schemaVersion: RENDER_SCHEMA_VERSION,
    outputPath: options.outputPath,
    duration: totalDuration,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    fileSize: mockVideoBuffer.length,
    codec: 'h264',
    archetype: options.archetype,
  };

  log.info(
    {
      duration: output.duration,
      fileSize: output.fileSize,
    },
    'Mock video render complete'
  );

  return RenderOutputSchema.parse(output);
}

const MOCK_MP4_BASE64 = [
  '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',
  'AAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAG',
  'AAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAAcHN0Y28AAAAAAAAAGAAADToAAA2VAAAN5QAADjUAAA6OAAAO4AAADzAAAA+AAAAP2QAAECUAABB1AAAQxQAA',
  'ER4AABFwAAARwAAAEhAAABJpAAAStQAAEwUAABNVAAATrQAAE/8AABRPAAAUnwAAABpzZ3BkAQAAAHJvbGwAAAACAAAAAf//AAAAHHNiZ3AAAAAAcm9sbAAA',
  'AAEAAAAvAAAAAQAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAA',
  'AQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAAwtbWRhdAAAAq4GBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAt',
  'IEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25z',
  'OiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhl',
  'ZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9t',
  'YV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz02IGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0w',
  'IGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2Vp',
  'Z2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0yNSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2Fo',
  'ZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEu',
  'MDAAgAAAAatliIQAO//+906/AptUwioDklcK9sqkJlm5UmsB8qYAAAMAAAMAAAMAAAMAWpjfJAsMpk3poAAAAwAAY8ACUgAh4AJeADUABkgA4gAfwATIAQ0A',
  'PYAMUAOQAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAAD',
  'AAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAAD',
  'AAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAAD',
  'AAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADADihAAAAQ0GaJGxDv/6plgAA',
  'AwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAADQjeAgBMYXZjNjAuMzEuMTAyAEIgCMEYOAAAAEBBnkJ4hf8A',
  'AAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAA9JIRAEYIwcIRAEYIwcAAAAQAGeYXRCvwAAAwAAAwAAAwAA',
  'AwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAFTAhEARgjBwhEARgjBwAAABAAZ5jakK/AAADAAADAAADAAADAAADAAADAAAD',
  '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',
].join('');
