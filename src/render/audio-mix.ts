/**
 * Audio mix preparation for rendering.
 *
 * Resolves mix layer assets, filters missing files, and maps local paths
 * into Remotion bundle-relative public paths.
 */
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { basename, extname, isAbsolute, resolve } from 'path';
import type { AudioMixLayer, AudioMixOutput } from '../domain';

export interface BundleAsset {
  sourcePath: string;
  destPath: string;
}

export interface PreparedAudioMix {
  mix: AudioMixOutput;
  assets: BundleAsset[];
  warnings: string[];
}

function isRemoteSource(path: string): boolean {
  return /^https?:\/\//i.test(path) || path.startsWith('data:');
}

function resolveLocalPath(path: string, baseDir: string): { resolved: string; exists: boolean } {
  const resolved = resolve(baseDir, path);
  if (existsSync(resolved)) {
    return { resolved, exists: true };
  }
  if (!isAbsolute(path)) {
    const fallback = resolve(process.cwd(), path);
    if (existsSync(fallback)) {
      return { resolved: fallback, exists: true };
    }
  }
  return { resolved, exists: false };
}

function buildDestPath(
  layerType: AudioMixLayer['type'],
  resolvedPath: string,
  destinations: Map<string, string>
): string {
  const base = basename(resolvedPath);
  const initial = `audio/${layerType}/${base}`;
  const existing = destinations.get(initial);
  if (!existing || existing === resolvedPath) {
    return initial;
  }

  const ext = extname(base);
  const stem = base.slice(0, base.length - ext.length);
  const hash = createHash('sha1').update(resolvedPath).digest('hex').slice(0, 8);
  let candidate = `audio/${layerType}/${stem}-${hash}${ext}`;
  let counter = 1;
  while (destinations.has(candidate) && destinations.get(candidate) !== resolvedPath) {
    candidate = `audio/${layerType}/${stem}-${hash}-${counter}${ext}`;
    counter += 1;
  }
  return candidate;
}

function normalizeLayerPath(
  layer: AudioMixLayer,
  baseDir: string,
  destinations: Map<string, string>
): {
  layer?: AudioMixLayer;
  asset?: BundleAsset;
  warning?: string;
} {
  if (isRemoteSource(layer.path)) {
    return { layer };
  }

  const resolvedResult = resolveLocalPath(layer.path, baseDir);
  if (!resolvedResult.exists) {
    return { warning: `Missing audio asset: ${layer.path}` };
  }

  const destPath = buildDestPath(layer.type, resolvedResult.resolved, destinations);
  const existingSource = destinations.get(destPath);
  if (!existingSource) {
    destinations.set(destPath, resolvedResult.resolved);
  }
  return {
    layer: { ...layer, path: destPath },
    asset: existingSource ? undefined : { sourcePath: resolvedResult.resolved, destPath },
  };
}

export function prepareAudioMixForRender(params: {
  mix: AudioMixOutput;
  audioPath: string;
  mixBaseDir?: string;
}): PreparedAudioMix {
  const baseDir = params.mixBaseDir ?? process.cwd();
  const assets: BundleAsset[] = [];
  const warnings: string[] = [];
  const layers: AudioMixLayer[] = [];
  const destinations = new Map<string, string>();

  if (params.mix.voicePath && params.mix.voicePath !== params.audioPath) {
    warnings.push(`Audio mix voicePath differs from render audio: ${params.mix.voicePath}`);
  }

  for (const layer of params.mix.layers) {
    const normalized = normalizeLayerPath(layer, baseDir, destinations);
    if (normalized.warning) {
      warnings.push(normalized.warning);
      continue;
    }
    if (normalized.layer) {
      layers.push(normalized.layer);
    }
    if (normalized.asset) {
      assets.push(normalized.asset);
    }
  }

  return {
    mix: {
      ...params.mix,
      voicePath: params.audioPath,
      layers,
      warnings: [...(params.mix.warnings ?? []), ...warnings],
    },
    assets,
    warnings,
  };
}
