import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { CMError, NotFoundError } from '../core/errors';
import {
  HookAudioModeEnum,
  HookFitEnum,
  type HookClip,
  type HookAudioMode,
  type HookFit,
} from '../domain';
import { resolveHookSelection } from '../hooks/resolve';
import { getCliRuntime } from './runtime';

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseHookAudio(value: unknown): HookAudioMode | undefined {
  if (value == null) return undefined;
  const parsed = HookAudioModeEnum.safeParse(String(value));
  if (parsed.success) return parsed.data;
  throw new CMError('INVALID_ARGUMENT', `Invalid --hook-audio value: ${value}`, {
    fix: 'Use one of: mute, keep',
  });
}

function parseHookFit(value: unknown): HookFit | undefined {
  if (value == null) return undefined;
  const parsed = HookFitEnum.safeParse(String(value));
  if (parsed.success) return parsed.data;
  throw new CMError('INVALID_ARGUMENT', `Invalid --hook-fit value: ${value}`, {
    fix: 'Use one of: cover, contain',
  });
}

function normalizeHookValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (['none', 'off', 'false', '0'].includes(lowered)) return null;
  return trimmed;
}

function normalizeTrimDuration(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  if (value <= 0) return undefined;
  return value;
}

function resolveHookDefaults(options: {
  hook?: unknown;
  hookTrim?: unknown;
  hookDuration?: unknown;
  hookAudio?: unknown;
  hookFit?: unknown;
}): {
  hookValue: string | null;
  durationSeconds: number | undefined;
  trimDurationSeconds: number | undefined;
  audio: HookAudioMode | undefined;
  fit: HookFit | undefined;
} {
  const config = loadConfig();
  const rawHookValue = options.hook ? String(options.hook) : config.hooks.defaultHook;
  const hookValue = normalizeHookValue(rawHookValue);
  const durationSeconds = parseOptionalNumber(options.hookDuration);
  const trimDurationSeconds = normalizeTrimDuration(
    parseOptionalNumber(options.hookTrim ?? config.hooks.trimDuration)
  );
  const audio = parseHookAudio(options.hookAudio ?? config.hooks.audio);
  const fit = parseHookFit(options.hookFit ?? config.hooks.fit);

  return { hookValue, durationSeconds, trimDurationSeconds, audio, fit };
}

async function resolveHookClip(params: {
  hookValue: string;
  durationSeconds: number | undefined;
  trimDurationSeconds: number | undefined;
  audio: HookAudioMode | undefined;
  fit: HookFit | undefined;
  hookLibrary?: unknown;
  hooksDir?: unknown;
  downloadMissing?: boolean;
}): Promise<HookClip | null> {
  const config = loadConfig();
  return resolveHookSelection({
    hook: params.hookValue,
    library: params.hookLibrary ? String(params.hookLibrary) : config.hooks.library,
    hooksDir: params.hooksDir ? String(params.hooksDir) : config.hooks.dir,
    downloadMissing: params.downloadMissing,
    durationSeconds: params.durationSeconds,
    trimDurationSeconds: params.trimDurationSeconds,
    audio: params.audio,
    fit: params.fit,
    maxDurationSeconds: config.hooks.maxDuration,
  });
}

export async function resolveHookFromCli(options: {
  hook?: unknown;
  hookLibrary?: unknown;
  hooksDir?: unknown;
  hookDuration?: unknown;
  hookTrim?: unknown;
  hookAudio?: unknown;
  hookFit?: unknown;
  downloadHook?: unknown;
}): Promise<HookClip | null> {
  const log = createLogger({ module: 'hooks' });
  const runtime = getCliRuntime();
  const hookFromCli = options.hook !== undefined && options.hook !== null;
  const { hookValue, durationSeconds, trimDurationSeconds, audio, fit } =
    resolveHookDefaults(options);
  if (!hookValue) {
    if (options.hook !== undefined) {
      options.hook = undefined;
    }
    return null;
  }
  if (options.hookTrim === undefined && trimDurationSeconds !== undefined) {
    options.hookTrim = String(trimDurationSeconds);
  }

  try {
    const downloadMissing = !runtime.offline && (runtime.yes || Boolean(options.downloadHook));
    return await resolveHookClip({
      hookValue,
      durationSeconds,
      trimDurationSeconds,
      audio,
      fit,
      hookLibrary: options.hookLibrary,
      hooksDir: options.hooksDir,
      downloadMissing,
    });
  } catch (error) {
    if (!hookFromCli && error instanceof NotFoundError) {
      if (options.hookTrim !== undefined) {
        options.hookTrim = undefined;
      }
      log.warn(
        { hook: hookValue, fix: error.context?.fix },
        'Default hook unavailable, skipping hook'
      );
      return null;
    }
    throw error;
  }
}
