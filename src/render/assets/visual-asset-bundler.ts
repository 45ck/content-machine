/**
 * Visual asset bundling helpers.
 *
 * Remotion can render remote HTTP assets, but reliability and render speed are
 * significantly better when stock assets are downloaded and copied into the
 * bundle's `public/` folder.
 *
 * This module builds a deterministic download/copy plan for remote scene assets
 * and can rewrite `visuals.json` to use bundle-relative paths like `stock/<id>.mp4`.
 */
import { createHash } from 'crypto';
import { extname } from 'path';
import type { VisualsOutputInput } from '../../visuals/schema';

export interface VisualAssetBundlePlanItem {
  sourceUrl: string;
  bundlePath: string;
}

export interface VisualAssetBundlePlan {
  assets: VisualAssetBundlePlanItem[];
}

function isRemoteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function getUrlExtension(url: string): string {
  try {
    const parsed = new URL(url);
    const ext = extname(parsed.pathname);
    if (ext) return ext;
  } catch {
    // Fall through to default.
  }
  return '.mp4';
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function toBundlePath(url: string): string {
  const ext = getUrlExtension(url);
  return `stock/${hashUrl(url)}${ext}`;
}

export function buildVisualAssetBundlePlan(visuals: VisualsOutputInput): VisualAssetBundlePlan {
  const urls = new Set<string>();

  for (const scene of visuals.scenes ?? []) {
    if (!scene) continue;
    if (scene.source === 'fallback-color') continue;
    const path = scene.assetPath;
    if (typeof path !== 'string') continue;
    if (!isRemoteUrl(path)) continue;
    urls.add(path);
  }

  const assets = Array.from(urls).map((sourceUrl) => ({
    sourceUrl,
    bundlePath: toBundlePath(sourceUrl),
  }));

  return { assets };
}

export function applyVisualAssetBundlePlan(
  visuals: VisualsOutputInput,
  plan: VisualAssetBundlePlan
): VisualsOutputInput {
  if (!plan.assets.length) return visuals;

  const mapping = new Map<string, string>(
    plan.assets.map((asset) => [asset.sourceUrl, asset.bundlePath])
  );

  const rewrittenScenes = (visuals.scenes ?? []).map((scene) => {
    const replacement = mapping.get(scene.assetPath);
    return replacement ? { ...scene, assetPath: replacement } : scene;
  });

  return {
    ...visuals,
    scenes: rewrittenScenes,
  };
}
