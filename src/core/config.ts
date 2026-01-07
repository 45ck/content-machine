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
import { join } from 'path';
import { ConfigError } from './errors.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const ArchetypeEnum = z.enum(['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take']);

export const OrientationEnum = z.enum(['portrait', 'landscape', 'square']);

const LLMProviderEnum = z.enum(['openai', 'anthropic']);

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

const VisualsConfigSchema = z.object({
  provider: z.enum(['pexels', 'pixabay']).default('pexels'),
  cacheEnabled: z.boolean().default(true),
  cacheTtl: z.number().int().positive().default(3600),
});

const RenderConfigSchema = z.object({
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().min(24).max(60).default(30),
  codec: z.enum(['h264', 'h265', 'vp9']).default('h264'),
  crf: z.number().int().min(0).max(51).default(23),
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
  visuals: VisualsConfigSchema.default({}),
  render: RenderConfigSchema.default({}),
  sync: SyncConfigSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Archetype = z.infer<typeof ArchetypeEnum>;
export type Orientation = z.infer<typeof OrientationEnum>;
export type LLMProviderType = z.infer<typeof LLMProviderEnum>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type SyncStrategy = z.infer<typeof SyncStrategyEnum>;
export type DriftCorrection = z.infer<typeof DriftCorrectionEnum>;

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
function findConfigFile(): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const path = join(process.cwd(), filename);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Parse a TOML value string into its typed value
 */
function parseTomlValue(rawValue: string): unknown {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  if (/^-?\d+$/.test(rawValue)) return parseInt(rawValue, 10);
  if (/^-?\d+\.\d+$/.test(rawValue)) return parseFloat(rawValue);
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
}

/**
 * Parse TOML config file (simplified parser for our use case)
 */
function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection: Record<string, unknown> = result;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section header
    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      result[sectionName] = result[sectionName] || {};
      currentSection = result[sectionName] as Record<string, unknown>;
      continue;
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const [, key, rawValue] = kvMatch;
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      currentSection[camelKey] = parseTomlValue(rawValue);
    }
  }

  return result;
}

/**
 * Load configuration from file and environment
 */
export function loadConfig(configPath?: string): Config {
  if (cachedConfig && !configPath) {
    return cachedConfig;
  }

  let fileConfig: Record<string, unknown> = {};

  // Try to load config file
  const path = configPath ?? findConfigFile();
  if (path && existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf-8');
      if (path.endsWith('.json')) {
        fileConfig = JSON.parse(content);
      } else {
        fileConfig = parseToml(content);
      }
    } catch (error) {
      throw new ConfigError(`Failed to parse config file: ${path}`, { path, error: String(error) });
    }
  }

  // Parse and validate with defaults
  const result = ConfigSchema.safeParse(fileConfig);
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
