import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { CMError, NotFoundError } from '../core/errors';
import {
  HookAudioModeEnum,
  HookFitEnum,
  type HookClip,
  type HookAudioMode,
  type HookFit,
} from '../hooks/schema';
import { resolveHookSelection } from '../hooks/resolve';

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

export async function resolveHookFromCli(options: {
  hook?: unknown;
  hookLibrary?: unknown;
  hooksDir?: unknown;
  downloadHook?: unknown;
  hookDuration?: unknown;
  hookTrim?: unknown;
  hookAudio?: unknown;
  hookFit?: unknown;
}): Promise<HookClip | null> {
  const log = createLogger({ module: 'hooks' });
  const config = loadConfig();
  const hookFromCli = options.hook !== undefined && options.hook !== null;
  const rawHookValue = options.hook ? String(options.hook) : config.hooks.defaultHook;
  const hookValue = normalizeHookValue(rawHookValue);
  if (!hookValue) {
    if (options.hook !== undefined) {
      options.hook = undefined;
    }
    return null;
  }
  const durationSeconds = parseOptionalNumber(options.hookDuration);
  const trimDurationSeconds = normalizeTrimDuration(
    parseOptionalNumber(options.hookTrim ?? config.hooks.trimDuration)
  );
  if (options.hookTrim === undefined && trimDurationSeconds !== undefined) {
    options.hookTrim = String(trimDurationSeconds);
  }
  const audio = parseHookAudio(options.hookAudio ?? config.hooks.audio);
  const fit = parseHookFit(options.hookFit ?? config.hooks.fit);
  const downloadMissing = Boolean(options.downloadHook);

  try {
    return await resolveHookSelection({
      hook: hookValue,
      library: options.hookLibrary ? String(options.hookLibrary) : config.hooks.library,
      hooksDir: options.hooksDir ? String(options.hooksDir) : config.hooks.dir,
      downloadMissing,
      durationSeconds,
      trimDurationSeconds,
      audio,
      fit,
      maxDurationSeconds: config.hooks.maxDuration,
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
