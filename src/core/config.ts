/**
 * Configuration System for content-machine
 *
 * Loads configuration from:
 * 1. Environment variables (secrets)
 * 2. .content-machine.toml (project settings)
 * 3. Default values
 */
import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { homedir } from 'node:os';
import { ConfigError } from './errors.js';
import { createRequireSafe } from './require';
import { FONT_STACKS } from '../render/tokens/font';
import { CAPTION_STYLE_PRESETS, type CaptionPresetName } from '../render/captions/presets';
import { CaptionConfigSchema } from '../render/captions/config';
import { HookAudioModeEnum, HookFitEnum, MotionStrategyEnum } from '../domain';
import { AudioMixPresetIdSchema, SfxPackIdSchema, SfxPlacementEnum } from '../audio/mix/presets';
import { ArchetypeIdSchema } from '../domain/ids';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Ubiquitous Language: Script archetype id schema.
 *
 * Archetypes are data-defined (builtin + user + project), so we do not hardcode an enum.
 * We only validate that the value is a canonical archetype id (kebab-case).
 *
 * See: `docs/reference/GLOSSARY.md`.
 */
export const ArchetypeEnum = ArchetypeIdSchema;

export const OrientationEnum = z.enum(['portrait', 'landscape', 'square']);

const LLMProviderEnum = z.enum(['openai', 'anthropic', 'gemini']);

const DefaultsSchema = z.object({
  archetype: ArchetypeEnum.default('listicle'),
  orientation: OrientationEnum.default('portrait'),
  voice: z.string().default('af_heart'),
});

const LLMConfigSchema = z.object({
  provider: LLMProviderEnum.default('openai'),
  model: z.string().default('gpt-4o'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxRetries: z.number().int().min(0).default(2),
});

const AudioConfigSchema = z.object({
  ttsEngine: z.enum(['kokoro', 'edge']).default('kokoro'),
  asrEngine: z.enum(['whisper']).default('whisper'),
  asrModel: z.enum(['tiny', 'base', 'small', 'medium', 'large']).default('base'),
});

const AudioMixConfigSchema = z.object({
  preset: AudioMixPresetIdSchema.default('clean'),
  lufsTarget: z.number().default(-16),
});

const MusicConfigSchema = z.object({
  default: z.string().optional(),
  volumeDb: z.number().default(-18),
  duckDb: z.number().default(-8),
  loop: z.boolean().default(true),
  fadeInMs: z.number().int().nonnegative().default(400),
  fadeOutMs: z.number().int().nonnegative().default(600),
});

const SfxConfigSchema = z.object({
  pack: SfxPackIdSchema.optional(),
  volumeDb: z.number().default(-12),
  placement: SfxPlacementEnum.default('scene'),
  minGapMs: z.number().int().nonnegative().default(800),
  durationSeconds: z.number().positive().default(0.4),
});

const AmbienceConfigSchema = z.object({
  default: z.string().optional(),
  volumeDb: z.number().default(-26),
  loop: z.boolean().default(true),
  fadeInMs: z.number().int().nonnegative().default(200),
  fadeOutMs: z.number().int().nonnegative().default(400),
});

const VisualsProviderEnum = z.enum(['pexels', 'pixabay', 'nanobanana', 'local', 'localimage']);

const NanoBananaConfigSchema = z.object({
  /** Gemini image generation model id (Gemini Developer API). */
  model: z.string().default('gemini-2.5-flash-image'),
  /** Optional override of per-image cost in USD for budgeting/estimation. */
  costPerAssetUsd: z.number().positive().optional(),
  /** Optional directory to store generated images. Defaults to ~/.cm/assets/generated/nanobanana */
  cacheDir: z.string().optional(),
  /** Base URL for the Gemini Developer API. */
  apiBaseUrl: z.string().default('https://generativelanguage.googleapis.com'),
  /** API version path segment (e.g. v1beta). */
  apiVersion: z.string().default('v1beta'),
  /** Request timeout for image generation (ms). */
  timeoutMs: z.number().int().positive().default(60_000),
});

const VisualsConfigSchema = z.object({
  provider: VisualsProviderEnum.default('pexels'),
  /** Fallback providers (used in order) if the primary provider cannot return a scene asset. */
  fallbackProviders: z.array(VisualsProviderEnum).default([]),
  /** Default motion strategy for image-based providers. */
  motionStrategy: MotionStrategyEnum.default('kenburns'),
  nanobanana: NanoBananaConfigSchema.default({}),
  cacheEnabled: z.boolean().default(true),
  cacheTtl: z.number().int().positive().default(3600),
  /** Max concurrent generation/search requests in the visuals stage. */
  generationConcurrency: z.number().int().min(1).max(8).default(2),
  /** Hard cap on estimated generation spend (USD). */
  maxGenerationCostUsd: z.number().nonnegative().optional(),
  /** @deprecated Use maxGenerationCostUsd. Kept for backward compatibility with older docs/configs. */
  maxGenerationCost: z.number().nonnegative().optional(),
  /** Warn (log) if estimated generation spend exceeds this (USD). */
  warnAtGenerationCostUsd: z.number().nonnegative().optional(),
  /** @deprecated Use warnAtGenerationCostUsd. Kept for backward compatibility with older docs/configs. */
  warnAtCost: z.number().nonnegative().optional(),
  local: z
    .object({
      /** Folder containing user-provided assets for the local provider. */
      dir: z.string().optional(),
      /** Optional manifest JSON to deterministically map sceneId -> asset path. */
      manifest: z.string().optional(),
      /** Recursively scan subfolders when indexing assets. */
      recursive: z.boolean().default(true),
    })
    .default({}),
});

const RenderConfigSchema = z.object({
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().min(24).max(60).default(30),
  codec: z.enum(['h264', 'h265', 'vp9']).default('h264'),
  crf: z.number().int().min(0).max(51).default(23),
  /** Default video template id or path to template.json */
  template: z.string().optional(),
  /**
   * Allow executing Remotion code shipped inside template packs.
   *
   * Security: This executes arbitrary JS/TS during bundling and rendering.
   * Default: false.
   */
  allowTemplateCode: z.boolean().default(false),
  /**
   * Template dependency installation mode when a code template has a package.json.
   *
   * - prompt: ask in interactive CLIs, error in non-interactive
   * - auto: install automatically when missing (respects --offline)
   * - never: never install automatically
   */
  templateDeps: z.enum(['prompt', 'auto', 'never']).default('prompt'),
  /** Preferred package manager for template dependency installs (optional). */
  templatePackageManager: z.enum(['npm', 'pnpm', 'yarn']).optional(),
});

const FontWeightSchema = z.union([
  z.number().int().min(100).max(900),
  z.enum(['normal', 'bold', 'black']),
]);

const FontStyleSchema = z.enum(['normal', 'italic', 'oblique']);

const CaptionFontSchema = z.object({
  family: z.string(),
  src: z.string(),
  weight: FontWeightSchema.optional(),
  style: FontStyleSchema.optional(),
});

const CaptionPresetNameSchema = z.enum(
  Object.keys(CAPTION_STYLE_PRESETS) as [CaptionPresetName, ...CaptionPresetName[]]
);

const CaptionsConfigSchema = z.object({
  fontFamily: z.string().default(FONT_STACKS.body),
  fontWeight: FontWeightSchema.default('bold'),
  fontFile: z.string().optional(),
  fonts: z.array(CaptionFontSchema).default([]),
  /** Default caption style preset (e.g. capcut, tiktok) */
  preset: CaptionPresetNameSchema.optional(),
  /** Deep-partial CaptionConfig overrides merged on top of the preset */
  config: CaptionConfigSchema.deepPartial().optional(),
});

const GenerateConfigSchema = z.object({
  /** Default workflow id or path to workflow.json for `cm generate` */
  workflow: z.string().optional(),
});

const HooksConfigSchema = z.object({
  library: z.string().default('transitionalhooks'),
  dir: z.string().default('~/.cm/assets/hooks'),
  audio: HookAudioModeEnum.default('keep'),
  fit: HookFitEnum.default('cover'),
  maxDuration: z.number().positive().default(3),
  trimDuration: z.number().positive().optional(),
  defaultHook: z.string().default('no-crunch'),
});

// ============================================================================
// Sync Configuration Schema (TASK-018)
// ============================================================================

/**
 * Sync strategy determines how word-level timestamps are generated.
 *
 * - `standard`: Uses whisper when available, falls back to estimation
 * - `audio-first`: Requires whisper, no fallback (higher accuracy)
 * - `forced-align`: Uses phoneme-level alignment (highest accuracy)
 * - `hybrid`: Combines multiple approaches (future)
 */
const SyncStrategyEnum = z.enum(['standard', 'audio-first', 'forced-align', 'hybrid']);

/**
 * Drift correction mode for timestamp adjustment.
 *
 * - `none`: No drift detection or correction
 * - `detect`: Analyze drift, log warnings, no correction
 * - `auto`: Detect and automatically correct drift
 */
const DriftCorrectionEnum = z.enum(['none', 'detect', 'auto']);

/**
 * Configuration for audio-video synchronization.
 *
 * Controls how word-level timestamps are generated and validated,
 * enabling high-quality caption synchronization.
 */
export const SyncConfigSchema = z.object({
  /**
   * Sync strategy for timestamp extraction.
   * @default "standard"
   */
  strategy: SyncStrategyEnum.default('standard'),

  /**
   * Require whisper.cpp - fail if unavailable instead of falling back.
   * @default false
   */
  requireWhisper: z.boolean().default(false),

  /**
   * ASR model size for whisper.cpp.
   * Larger models are more accurate but slower.
   * @default "base"
   */
  asrModel: z.enum(['tiny', 'base', 'small', 'medium', 'large']).default('base'),

  /**
   * Reconcile ASR transcription to original script text.
   * Fixes issues like "10x" being transcribed as "tenex".
   * @default false
   */
  reconcileToScript: z.boolean().default(false),

  /**
   * Minimum Levenshtein similarity for word matching during reconciliation.
   * @default 0.7
   */
  minSimilarity: z.number().min(0).max(1).default(0.7),

  /**
   * Drift correction mode.
   * @default "none"
   */
  driftCorrection: DriftCorrectionEnum.default('none'),

  /**
   * Maximum acceptable drift in milliseconds before warning/correction.
   * @default 80
   */
  maxDriftMs: z.number().positive().default(80),

  /**
   * Validate timestamps before render.
   * @default true
   */
  validateTimestamps: z.boolean().default(true),

  /**
   * Automatically repair invalid timestamps.
   * @default true
   */
  autoRepair: z.boolean().default(true),

  /**
   * Run sync quality check after render (cm rate).
   * @default false
   */
  qualityCheck: z.boolean().default(false),

  /**
   * Minimum acceptable sync rating (0-100).
   * Only used when qualityCheck is enabled.
   * @default 75
   */
  minRating: z.number().min(0).max(100).default(75),

  /**
   * Retry with better strategy if sync rating fails.
   * @default false
   */
  autoRetry: z.boolean().default(false),

  /**
   * Maximum retry attempts for sync quality.
   * @default 2
   */
  maxRetries: z.number().int().nonnegative().default(2),
});

export const ConfigSchema = z.object({
  defaults: DefaultsSchema.default({}),
  llm: LLMConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  audioMix: AudioMixConfigSchema.default({}),
  music: MusicConfigSchema.default({}),
  sfx: SfxConfigSchema.default({}),
  ambience: AmbienceConfigSchema.default({}),
  visuals: VisualsConfigSchema.default({}),
  render: RenderConfigSchema.default({}),
  captions: CaptionsConfigSchema.default({}),
  hooks: HooksConfigSchema.default({}),
  sync: SyncConfigSchema.default({}),
  generate: GenerateConfigSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Archetype = z.infer<typeof ArchetypeEnum>;
export type Orientation = z.infer<typeof OrientationEnum>;
export type LLMProviderType = z.infer<typeof LLMProviderEnum>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type SyncStrategy = z.infer<typeof SyncStrategyEnum>;
export type DriftCorrection = z.infer<typeof DriftCorrectionEnum>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type CaptionsConfig = z.infer<typeof CaptionsConfigSchema>;
export type CaptionFontConfig = z.infer<typeof CaptionFontSchema>;
export type AudioMixConfig = z.infer<typeof AudioMixConfigSchema>;
export type MusicConfig = z.infer<typeof MusicConfigSchema>;
export type SfxConfig = z.infer<typeof SfxConfigSchema>;
export type AmbienceConfig = z.infer<typeof AmbienceConfigSchema>;
export type GenerateConfig = z.infer<typeof GenerateConfigSchema>;

// ============================================================================
// API Key Management
// ============================================================================

/**
 * Get a required API key from environment
 * @throws ConfigError if key is not set
 */
export function getApiKey(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigError(
      `Required environment variable ${key} is not set. ` +
        `Add it to your .env file or set it in your environment.`,
      { key }
    );
  }
  return value;
}

/**
 * Get an optional API key from environment
 * @returns The key value or undefined if not set
 */
export function getOptionalApiKey(key: string): string | undefined {
  return process.env[key];
}

// ============================================================================
// Configuration Loading
// ============================================================================

const CONFIG_FILENAMES = ['.content-machine.toml', 'content-machine.toml', '.cmrc.json'];

let cachedConfig: Config | null = null;

/**
 * Find the config file path in the current directory
 */
function resolveHomeDir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? homedir();
}

function expandTilde(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return resolveHomeDir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(resolveHomeDir(), inputPath.slice(2));
  }
  return inputPath;
}

function isGitRoot(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

/**
 * Find the project config file path by walking up from the current directory.
 *
 * Stops at the first directory containing `.git` (repo root) if present.
 */
function findProjectConfigFile(startDir: string = process.cwd()): string | null {
  let current = resolve(startDir);

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = join(current, filename);
      if (existsSync(candidate)) return candidate;
    }

    if (isGitRoot(current)) return null;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function findUserConfigFile(): string | null {
  const home = resolveHomeDir();
  const candidates = [
    join(home, '.cm', 'config.toml'),
    join(home, '.cm', 'config.json'),
    join(home, '.cmrc.json'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Parse TOML config file.
 */
function parseToml(content: string): unknown {
  try {
    const require = createRequireSafe(import.meta.url);
    const toml = require('@iarna/toml') as { parse: (input: string) => unknown };
    // @iarna/toml rejects raw CR characters; normalize CRLF/CR → LF to accept
    // config files created on Windows or via copy/paste.
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return toml.parse(normalized);
  } catch (error) {
    throw new ConfigError('Failed to parse TOML config', { error: String(error) });
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => String(c).toUpperCase());
}

function normalizeConfigKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => normalizeConfigKeys(entry));
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[toCamelCaseKey(key)] = normalizeConfigKeys(child);
  }
  return out;
}

function isRemoteAsset(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('data:');
}

function looksLikePathSpec(spec: string): boolean {
  return (
    spec.includes('/') ||
    spec.includes('\\') ||
    spec.startsWith('.') ||
    spec.startsWith('~') ||
    /^[a-zA-Z]:[\\/]/.test(spec) ||
    spec.endsWith('.json')
  );
}

function resolvePathFromConfig(value: unknown, baseDir: string): unknown {
  if (typeof value !== 'string') return value;
  const expanded = expandTilde(value);
  if (!expanded || isRemoteAsset(expanded)) return expanded;
  if (expanded.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(expanded)) return expanded;
  return resolve(baseDir, expanded);
}

function resolveConfigPaths(
  config: Record<string, unknown>,
  baseDir: string
): Record<string, unknown> {
  const next = { ...config };

  // captions.fontFile
  if (isPlainObject(next.captions)) {
    const captions = next.captions as Record<string, unknown>;
    if ('fontFile' in captions) {
      captions.fontFile = resolvePathFromConfig(captions.fontFile, baseDir);
    }

    // captions.fonts[].src
    if (Array.isArray(captions.fonts)) {
      captions.fonts = captions.fonts.map((font) => {
        if (!isPlainObject(font)) return font;
        const entry = { ...font };
        if ('src' in entry) {
          entry.src = resolvePathFromConfig(entry.src, baseDir);
        }
        return entry;
      });
    }

    next.captions = captions;
  }

  // hooks.dir
  if (isPlainObject(next.hooks)) {
    const hooks = next.hooks as Record<string, unknown>;
    if ('dir' in hooks) {
      hooks.dir = resolvePathFromConfig(hooks.dir, baseDir);
    }
    next.hooks = hooks;
  }

  // render.template (resolve only if it looks like a path)
  if (isPlainObject(next.render)) {
    const render = next.render as Record<string, unknown>;
    if (typeof render.template === 'string' && looksLikePathSpec(render.template)) {
      render.template = resolvePathFromConfig(render.template, baseDir);
    }
    next.render = render;
  }

  // generate.workflow (resolve only if it looks like a path)
  if (isPlainObject(next.generate)) {
    const generate = next.generate as Record<string, unknown>;
    if (typeof generate.workflow === 'string' && looksLikePathSpec(generate.workflow)) {
      generate.workflow = resolvePathFromConfig(generate.workflow, baseDir);
    }
    next.generate = generate;
  }

  return next;
}

function deepMerge<T extends unknown>(base: T, override: unknown): T {
  if (Array.isArray(base) || Array.isArray(override)) {
    return (override !== undefined ? override : base) as T;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;
      const existing = out[key];
      out[key] = deepMerge(existing, value);
    }
    return out as T;
  }

  return (override !== undefined ? override : base) as T;
}

function loadConfigFile(path: string): Record<string, unknown> {
  const content = readFileSync(path, 'utf-8');
  const parsedRaw = path.endsWith('.json') ? JSON.parse(content) : parseToml(content);
  const normalized = normalizeConfigKeys(parsedRaw);
  if (!isPlainObject(normalized)) {
    throw new ConfigError(`Invalid config file: expected an object at root`, { path });
  }
  return resolveConfigPaths(normalized, dirname(path));
}

export interface ResolvedConfigFiles {
  userConfigPath: string | null;
  projectConfigPath: string | null;
  envConfigPath: string | null;
  explicitConfigPath: string | null;
  loadedConfigPaths: string[];
}

/**
 * Resolve config file paths to load (user + project), optionally overriding via `--config` or `CM_CONFIG`.
 */
export function resolveConfigFiles(configPath?: string): ResolvedConfigFiles {
  const envRaw = typeof process.env.CM_CONFIG === 'string' ? process.env.CM_CONFIG.trim() : '';
  const envConfigPath = envRaw ? resolve(expandTilde(envRaw)) : null;
  const explicitConfigPath = configPath ? resolve(expandTilde(configPath)) : null;

  const projectConfigPath = explicitConfigPath ?? envConfigPath ?? findProjectConfigFile();
  const userConfigPath = findUserConfigFile();

  const loadedConfigPaths: string[] = [];
  if (userConfigPath) loadedConfigPaths.push(userConfigPath);
  if (projectConfigPath && projectConfigPath !== userConfigPath)
    loadedConfigPaths.push(projectConfigPath);

  return {
    userConfigPath,
    projectConfigPath,
    envConfigPath,
    explicitConfigPath,
    loadedConfigPaths,
  };
}

/**
 * Load configuration from file and environment
 */
export function loadConfig(configPath?: string): Config {
  if (cachedConfig && !configPath) {
    return cachedConfig;
  }

  let mergedConfig: Record<string, unknown> = {};
  const resolved = resolveConfigFiles(configPath);

  for (const path of resolved.loadedConfigPaths) {
    try {
      mergedConfig = deepMerge(mergedConfig, loadConfigFile(path));
    } catch (error) {
      throw new ConfigError(`Failed to parse config file: ${path}`, { path, error: String(error) });
    }
  }

  // Parse and validate with defaults
  const result = ConfigSchema.safeParse(mergedConfig);
  if (!result.success) {
    throw new ConfigError(
      `Invalid configuration: ${result.error.issues.map((i) => i.message).join(', ')}`,
      { issues: result.error.issues }
    );
  }

  cachedConfig = result.data;
  return result.data;
}

/**
 * Clear the cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
