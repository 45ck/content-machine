/**
 * Gameplay library selection
 *
 * Resolves a gameplay clip from a user-provided library or direct path.
 */
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, resolve, relative } from 'path';
import { homedir } from 'os';
import { createLogger } from '../core/logger';
import { CMError, NotFoundError } from '../core/errors';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import type { GameplayClip } from './schema';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm']);

export interface GameplaySelectionOptions {
  /** Library directory containing gameplay clips. */
  library?: string;
  /** Optional style subfolder name (e.g., subway-surfers). */
  style?: string;
  /** Direct clip path (overrides library selection). */
  clip?: string;
  /** Target duration for the clip (seconds). */
  targetDuration: number;
  /** Throw when missing gameplay assets. */
  strict?: boolean;
  /** Deterministic random for testing. */
  random?: () => number;
}

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function isVideoFile(path: string): boolean {
  return VIDEO_EXTENSIONS.has(extname(path).toLowerCase());
}

async function listVideoFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listVideoFiles(entryPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && isVideoFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function pickRandom<T>(items: T[], random: () => number): T {
  const index = Math.max(0, Math.min(items.length - 1, Math.floor(random() * items.length)));
  return items[index];
}

function inferStyleFromPath(library: string, clipPath: string): string | undefined {
  const rel = relative(library, clipPath);
  const parts = rel.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[0] : undefined;
}

async function buildGameplayClip(params: {
  path: string;
  style?: string;
  targetDuration: number;
}): Promise<GameplayClip> {
  const log = createLogger({ module: 'gameplay' });
  let duration = params.targetDuration;
  let width: number | undefined;
  let height: number | undefined;

  try {
    const info = await probeVideoWithFfprobe(params.path);
    duration = info.durationSeconds;
    width = info.width;
    height = info.height;
  } catch (error) {
    log.debug({ error, path: params.path }, 'Failed to probe gameplay clip, using target duration');
  }

  return {
    path: params.path,
    duration,
    width,
    height,
    style: params.style,
  };
}

export async function selectGameplayClip(
  options: GameplaySelectionOptions
): Promise<GameplayClip | null> {
  const log = createLogger({ module: 'gameplay' });
  const random = options.random ?? Math.random;
  let resolvedClip: string | undefined = options.clip;
  let resolvedLibrary = options.library;

  if (!Number.isFinite(options.targetDuration) || options.targetDuration <= 0) {
    throw new CMError('INVALID_ARGUMENT', 'Gameplay targetDuration must be > 0', {
      targetDuration: options.targetDuration,
    });
  }

  if (!resolvedClip && resolvedLibrary) {
    const maybePath = resolve(expandTilde(resolvedLibrary));
    if (existsSync(maybePath)) {
      const stats = await stat(maybePath);
      if (stats.isFile()) {
        resolvedClip = maybePath;
        resolvedLibrary = undefined;
      }
    }
  }

  if (resolvedClip) {
    const clipPath = resolve(expandTilde(resolvedClip));
    if (!existsSync(clipPath)) {
      throw new NotFoundError(`Gameplay clip not found: ${clipPath}`, {
        resource: 'gameplay-clip',
        identifier: clipPath,
        fix: 'Provide a valid file path for --gameplay',
      });
    }
    return buildGameplayClip({
      path: clipPath,
      style: options.style,
      targetDuration: options.targetDuration,
    });
  }

  const library = resolve(expandTilde(resolvedLibrary ?? join('~', '.cm', 'assets', 'gameplay')));
  if (!existsSync(library)) {
    if (options.strict) {
      throw new NotFoundError(`Gameplay library not found: ${library}`, {
        resource: 'gameplay-library',
        identifier: library,
        fix: 'Create the directory or pass --gameplay <path>',
      });
    }
    log.warn({ library }, 'Gameplay library not found, skipping gameplay selection');
    return null;
  }

  const stats = await stat(library);
  if (!stats.isDirectory()) {
    if (options.strict) {
      throw new NotFoundError(`Gameplay library is not a directory: ${library}`, {
        resource: 'gameplay-library',
        identifier: library,
        fix: 'Provide a directory path for --gameplay',
      });
    }
    log.warn({ library }, 'Gameplay library is not a directory, skipping selection');
    return null;
  }

  const styleDir = options.style ? join(library, options.style) : library;
  const searchRoot = options.style ? styleDir : library;

  if (options.style && !existsSync(styleDir)) {
    if (options.strict) {
      throw new NotFoundError(`Gameplay style folder not found: ${styleDir}`, {
        resource: 'gameplay-style',
        identifier: options.style,
        fix: 'Check the style name or remove --gameplay-style',
      });
    }
    log.warn({ styleDir }, 'Gameplay style folder not found, skipping gameplay selection');
    return null;
  }

  const candidates = await listVideoFiles(searchRoot);
  if (candidates.length === 0) {
    if (options.strict) {
      throw new NotFoundError(`No gameplay clips found in: ${searchRoot}`, {
        resource: 'gameplay-clip',
        identifier: searchRoot,
        fix: 'Add gameplay clips or point --gameplay to a populated directory',
      });
    }
    log.warn({ searchRoot }, 'No gameplay clips found, skipping gameplay selection');
    return null;
  }

  const selected = pickRandom(candidates, random);
  const style = options.style ?? inferStyleFromPath(library, selected);

  log.info({ selected, style }, 'Gameplay clip selected');
  return buildGameplayClip({ path: selected, style, targetDuration: options.targetDuration });
}
