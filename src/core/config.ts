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

export const ArchetypeEnum = z.enum([
  'listicle',
  'versus',
  'howto',
  'myth',
  'story',
  'hot-take',
]);

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

export const ConfigSchema = z.object({
  defaults: DefaultsSchema.default({}),
  llm: LLMConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  visuals: VisualsConfigSchema.default({}),
  render: RenderConfigSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Archetype = z.infer<typeof ArchetypeEnum>;
export type Orientation = z.infer<typeof OrientationEnum>;
export type LLMProviderType = z.infer<typeof LLMProviderEnum>;

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

const CONFIG_FILENAMES = [
  '.content-machine.toml',
  'content-machine.toml',
  '.cmrc.json',
];

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
 * Parse TOML config file (simplified parser for our use case)
 */
function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection: Record<string, unknown> = result;
  let currentSectionName = '';

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Section header
    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      currentSectionName = sectionMatch[1];
      result[currentSectionName] = result[currentSectionName] || {};
      currentSection = result[currentSectionName] as Record<string, unknown>;
      continue;
    }
    
    // Key-value pair
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const [, key, rawValue] = kvMatch;
      let value: unknown;
      
      // Parse value
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else if (/^-?\d+$/.test(rawValue)) value = parseInt(rawValue, 10);
      else if (/^-?\d+\.\d+$/.test(rawValue)) value = parseFloat(rawValue);
      else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        value = rawValue.slice(1, -1);
      } else {
        value = rawValue;
      }
      
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      currentSection[camelKey] = value;
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
      throw new ConfigError(
        `Failed to parse config file: ${path}`,
        { path, error: String(error) }
      );
    }
  }
  
  // Parse and validate with defaults
  const result = ConfigSchema.safeParse(fileConfig);
  if (!result.success) {
    throw new ConfigError(
      `Invalid configuration: ${result.error.issues.map(i => i.message).join(', ')}`,
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
