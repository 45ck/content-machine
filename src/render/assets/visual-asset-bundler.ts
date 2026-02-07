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
import { extname, resolve } from 'path';
import type { VisualsOutputInput } from '../../domain';

export interface VisualAssetBundlePlanItem {
  sourceUrl?: string;
  sourcePath?: string;
  bundlePath: string;
}

export interface VisualAssetBundlePlan {
  assets: VisualAssetBundlePlanItem[];
}

function isRemoteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isLocalPathCandidate(path: string): boolean {
  if (!path) return false;
  if (isRemoteUrl(path)) return false;
  if (path.startsWith('#')) return false;
  return true;
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

function hashPath(path: string): string {
  return createHash('sha256').update(path).digest('hex').slice(0, 16);
}

function toBundlePath(url: string): string {
  const ext = getUrlExtension(url);
  return `stock/${hashUrl(url)}${ext}`;
}

function getPathExtension(path: string): string {
  const ext = extname(path);
  return ext || '.mp4';
}

function toLocalBundlePath(path: string): string {
  const ext = getPathExtension(path);
  const resolved = resolve(path);
  return `user/${hashPath(resolved)}${ext}`;
}

export function buildVisualAssetBundlePlan(visuals: VisualsOutputInput): VisualAssetBundlePlan {
  const urls = new Set<string>();
  const locals = new Set<string>();

  for (const scene of visuals.scenes ?? []) {
    if (!scene) continue;
    if (scene.source === 'fallback-color') continue;
    const path = scene.assetPath;
    if (typeof path !== 'string') continue;
    if (isRemoteUrl(path)) {
      urls.add(path);
      continue;
    }
    if (!isLocalPathCandidate(path)) continue;
    const isUserOrGenerated =
      scene.source === 'user-footage' ||
      scene.source === 'generated-nanobanana' ||
      scene.source === 'generated-dalle' ||
      scene.source === 'stock-unsplash' ||
      scene.source === 'mock';
    if (!isUserOrGenerated) continue;
    locals.add(path);
  }

  const assets = Array.from(urls).map((sourceUrl) => ({
    sourceUrl,
    bundlePath: toBundlePath(sourceUrl),
  }));
  const localAssets = Array.from(locals).map((sourcePath) => ({
    sourcePath,
    bundlePath: toLocalBundlePath(sourcePath),
  }));

  return { assets: [...assets, ...localAssets] };
}

export function applyVisualAssetBundlePlan(
  visuals: VisualsOutputInput,
  plan: VisualAssetBundlePlan
): VisualsOutputInput {
  if (!plan.assets.length) return visuals;

  const mapping = new Map<string, string>(
    plan.assets.flatMap((asset) => {
      const entries: Array<[string, string]> = [];
      if (asset.sourceUrl) entries.push([asset.sourceUrl, asset.bundlePath]);
      if (asset.sourcePath) {
        entries.push([asset.sourcePath, asset.bundlePath]);
        entries.push([resolve(asset.sourcePath), asset.bundlePath]);
      }
      return entries;
    })
  );

  const rewrittenScenes = (visuals.scenes ?? []).map((scene) => {
    const assetPath = scene.assetPath;
    if (typeof assetPath !== 'string') return scene;
    const replacement = mapping.get(assetPath);
    if (replacement) {
      return { ...scene, assetPath: replacement };
    }
    if (!isLocalPathCandidate(assetPath)) return scene;
    const resolved = mapping.get(resolve(assetPath));
    return resolved ? { ...scene, assetPath: resolved } : scene;
  });

  return {
    ...visuals,
    scenes: rewrittenScenes,
  };
}
