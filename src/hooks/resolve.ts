import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { createLogger } from '../core/logger';
import { CMError, NotFoundError } from '../core/errors';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import {
  DEFAULT_HOOK_AUDIO,
  DEFAULT_HOOK_FIT,
  DEFAULT_HOOK_LIBRARY,
  DEFAULT_HOOK_MAX_DURATION,
  DEFAULT_HOOKS_DIR,
} from './constants';
import type { HookAudioMode, HookClip, HookDefinition, HookFit } from '../domain';
import { TRANSITIONAL_HOOKS } from './libraries/transitionalhooks';
import { downloadHookClip } from './download';

export interface ResolveHookOptions {
  hook?: string;
  library?: string;
  hooksDir?: string;
  downloadMissing?: boolean;
  durationSeconds?: number;
  trimDurationSeconds?: number;
  audio?: HookAudioMode;
  fit?: HookFit;
  maxDurationSeconds?: number;
}

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveHookDefinition(library: string, hookId: string): HookDefinition | undefined {
  if (library === 'transitionalhooks') {
    return TRANSITIONAL_HOOKS.find((entry) => entry.id === hookId);
  }
  return undefined;
}

function validateTrimDuration(trimDuration?: number): void {
  if (trimDuration === undefined) return;
  if (!Number.isFinite(trimDuration) || trimDuration <= 0) {
    throw new CMError('INVALID_ARGUMENT', 'Hook trim duration must be a positive number', {
      trimDurationSeconds: trimDuration,
    });
  }
}

async function resolveHookSource(params: {
  hookValue: string;
  library: string;
  hooksDir: string;
  downloadMissing: boolean;
  log: ReturnType<typeof createLogger>;
}): Promise<{
  source: 'library' | 'file' | 'url';
  hookPath: string;
  definition?: HookDefinition;
}> {
  const { hookValue, library, hooksDir, downloadMissing, log } = params;

  if (isRemoteUrl(hookValue)) {
    return { source: 'url', hookPath: hookValue };
  }

  const resolvedPath = resolve(expandTilde(hookValue));
  const looksLikePath = /[\\/]/.test(hookValue) || /\.(mp4|mov|mkv|webm)$/i.test(hookValue);
  if (existsSync(resolvedPath)) {
    return { source: 'file', hookPath: resolvedPath };
  }
  if (looksLikePath) {
    throw new NotFoundError(`Hook file not found: ${resolvedPath}`, {
      resource: 'hook-file',
      identifier: resolvedPath,
      fix: 'Provide a valid file path or download the hook library',
    });
  }

  const hookId = hookValue.toLowerCase();
  const definition = resolveHookDefinition(library, hookId);
  if (!definition && library !== 'transitionalhooks') {
    throw new NotFoundError(`Hook library not found: ${library}`, {
      resource: 'hook-library',
      identifier: library,
      fix: 'Use a known library id or pass a local hook path',
    });
  }
  if (!definition) {
    throw new NotFoundError(`Hook not found: ${hookValue}`, {
      resource: 'hook',
      identifier: hookValue,
      fix: `Check the hook id or run the hook sync script for ${library}`,
    });
  }

  const libraryRoot = resolve(expandTilde(hooksDir), library);
  const hookPath = resolve(libraryRoot, definition.filename);
  if (!existsSync(hookPath)) {
    if (downloadMissing) {
      log.info(
        { hook: definition.id, library, destination: hookPath },
        'Downloading missing hook clip'
      );
      await downloadHookClip(definition, { destinationPath: hookPath });
    }
    if (existsSync(hookPath)) {
      log.info({ hook: definition.id, path: hookPath }, 'Hook clip ready');
    } else {
      throw new NotFoundError(`Hook file not found: ${hookPath}`, {
        resource: 'hook-file',
        identifier: hookPath,
        fix: `Run: cm hooks download ${definition.id} --library ${library}`,
      });
    }
  }

  return { source: 'library', hookPath, definition };
}

async function resolveHookDuration(params: {
  source: 'library' | 'file' | 'url';
  hookId?: string;
  hookPath: string;
  definition?: HookDefinition;
  durationOverride?: number;
  trimDurationSeconds?: number;
}): Promise<number> {
  if (params.durationOverride !== undefined) {
    if (!Number.isFinite(params.durationOverride) || params.durationOverride <= 0) {
      throw new CMError('INVALID_ARGUMENT', 'Hook duration must be a positive number', {
        durationSeconds: params.durationOverride,
      });
    }
    return params.durationOverride;
  }

  if (params.trimDurationSeconds !== undefined && params.source === 'url') {
    if (!Number.isFinite(params.trimDurationSeconds) || params.trimDurationSeconds <= 0) {
      throw new CMError('INVALID_ARGUMENT', 'Hook trim duration must be a positive number', {
        trimDurationSeconds: params.trimDurationSeconds,
      });
    }
    return params.trimDurationSeconds;
  }

  if (params.definition?.duration) {
    return params.definition.duration;
  }

  if (params.source === 'url') {
    throw new CMError('HOOK_DURATION_REQUIRED', 'Hook duration is required for remote URLs', {
      hookPath: params.hookPath,
      fix: 'Pass --hook-duration <seconds> or download the hook locally',
    });
  }

  try {
    const info = await probeVideoWithFfprobe(params.hookPath);
    return info.durationSeconds;
  } catch (error) {
    throw new CMError(
      'HOOK_DURATION_UNAVAILABLE',
      'Failed to determine hook duration',
      {
        hookPath: params.hookPath,
        hookId: params.hookId,
        fix: 'Install ffprobe or pass --hook-duration <seconds>',
      },
      error instanceof Error ? error : undefined
    );
  }
}

export async function resolveHookSelection(options: ResolveHookOptions): Promise<HookClip | null> {
  const hookValue = options.hook?.trim();
  if (!hookValue) return null;

  const log = createLogger({ module: 'hooks' });
  const library = options.library ?? DEFAULT_HOOK_LIBRARY;
  const hooksDir = options.hooksDir ?? DEFAULT_HOOKS_DIR;
  const downloadMissing = Boolean(options.downloadMissing);
  const audio = options.audio ?? DEFAULT_HOOK_AUDIO;
  const fit = options.fit ?? DEFAULT_HOOK_FIT;
  const maxDuration = options.maxDurationSeconds ?? DEFAULT_HOOK_MAX_DURATION;
  const trimDuration = options.trimDurationSeconds;

  const { source, hookPath, definition } = await resolveHookSource({
    hookValue,
    library,
    hooksDir,
    downloadMissing,
    log,
  });

  validateTrimDuration(trimDuration);

  let duration: number;
  try {
    duration = await resolveHookDuration({
      source,
      hookId: definition?.id,
      hookPath,
      definition,
      durationOverride: options.durationSeconds,
      trimDurationSeconds: trimDuration,
    });
  } catch (error) {
    if (
      trimDuration !== undefined &&
      error instanceof CMError &&
      error.code === 'HOOK_DURATION_UNAVAILABLE'
    ) {
      log.warn(
        { hook: hookValue, trimDurationSeconds: trimDuration },
        'Hook duration probe failed; using trim duration'
      );
      duration = trimDuration;
    } else {
      throw error;
    }
  }

  const effectiveDuration =
    trimDuration !== undefined ? Math.min(duration, trimDuration) : duration;

  if (trimDuration !== undefined && effectiveDuration < duration) {
    log.info(
      { hook: hookValue, originalDuration: duration, trimmedDuration: effectiveDuration },
      'Trimming hook duration'
    );
  }

  if (Number.isFinite(maxDuration) && effectiveDuration > maxDuration) {
    log.warn(
      { duration: effectiveDuration, maxDuration, hook: hookValue },
      'Hook duration exceeds recommended 3s window'
    );
  }

  return {
    path: hookPath,
    duration: effectiveDuration,
    mute: audio !== 'keep',
    fit,
    source,
    id: definition?.id,
    title: definition?.title,
  };
}
