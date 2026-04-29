import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_PACKAGE_NAME = '@45ck/video-evaluator';

export interface VideoEvaluatorAdapterOptions {
  packageName?: string;
  explicitRoot?: string;
  searchFrom?: string;
}

export interface VideoEvaluatorEntrypoint {
  source: 'package' | 'explicit-root' | 'sibling-root';
  specifier: string;
  root?: string;
}

export interface LayoutSafetyReviewRequest {
  videoPath: string;
  outputDir?: string;
  layoutPath?: string;
  frameCount?: number;
  samplingMode?: 'uniform' | 'hybrid';
  runOcr?: boolean;
  minOcrConfidence?: number;
  maxPairOverlapRatio?: number;
  maxCaptionZoneOverlapRatio?: number;
}

export interface LayoutSafetyReviewResult {
  reportPath?: string;
  report: {
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      code: string;
      message: string;
      timeSeconds?: number;
      details?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  };
}

export interface VideoEvaluatorAdapter {
  entrypoint: VideoEvaluatorEntrypoint;
  runLayoutSafetyReview?: (input: LayoutSafetyReviewRequest) => Promise<LayoutSafetyReviewResult>;
}

interface VideoEvaluatorModule {
  runLayoutSafetyReview?: (input: LayoutSafetyReviewRequest) => Promise<LayoutSafetyReviewResult>;
  reviewLayoutSafety?: (input: LayoutSafetyReviewRequest) => Promise<LayoutSafetyReviewResult>;
}

function isVideoEvaluatorModule(value: unknown): value is VideoEvaluatorModule {
  return Boolean(
    value &&
    typeof value === 'object' &&
    ('runLayoutSafetyReview' in value || 'reviewLayoutSafety' in value)
  );
}

function distEntrypoint(root: string): string | null {
  const entrypoint = join(root, 'dist', 'index.js');
  return existsSync(entrypoint) ? entrypoint : null;
}

function parentDir(path: string): string {
  return dirname(resolve(path));
}

/** Resolve import candidates for the optional video-evaluator runtime. */
export function resolveVideoEvaluatorEntrypoints(
  options: VideoEvaluatorAdapterOptions = {}
): VideoEvaluatorEntrypoint[] {
  const packageName = options.packageName ?? DEFAULT_PACKAGE_NAME;
  const searchFrom = resolve(options.searchFrom ?? process.cwd());
  const entrypoints: VideoEvaluatorEntrypoint[] = [{ source: 'package', specifier: packageName }];

  if (options.explicitRoot) {
    const root = resolve(options.explicitRoot);
    const explicit = distEntrypoint(root);
    if (explicit) {
      entrypoints.push({
        source: 'explicit-root',
        root,
        specifier: pathToFileURL(explicit).href,
      });
    }
  }

  const siblingRoot = resolve(parentDir(searchFrom), 'video-evaluator');
  const sibling = distEntrypoint(siblingRoot);
  if (sibling) {
    entrypoints.push({
      source: 'sibling-root',
      root: siblingRoot,
      specifier: pathToFileURL(sibling).href,
    });
  }

  return entrypoints;
}

/** Load the optional video-evaluator runtime from the package, explicit root, or sibling repo. */
export async function loadVideoEvaluatorAdapter(
  options: VideoEvaluatorAdapterOptions = {}
): Promise<VideoEvaluatorAdapter | null> {
  for (const entrypoint of resolveVideoEvaluatorEntrypoints(options)) {
    try {
      const mod = await import(entrypoint.specifier);
      if (!isVideoEvaluatorModule(mod)) continue;
      return {
        entrypoint,
        runLayoutSafetyReview: mod.runLayoutSafetyReview ?? mod.reviewLayoutSafety,
      };
    } catch {
      // Optional dependency: callers keep their local fallback when unavailable.
    }
  }
  return null;
}
