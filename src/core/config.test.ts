/**
 * Configuration System Tests
 * TDD: Write tests FIRST, then implement
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock environment before importing
const originalEnv = process.env;

describe('Config', () => {
  const testDir = join(process.cwd(), '.test-config');

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getApiKey', () => {
    it('should return API key from environment', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getApiKey } = await import('./config');
      const key = getApiKey('OPENAI_API_KEY');

      expect(key).toBe('sk-test-key');
    });

    it('should throw ConfigError when key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const { getApiKey } = await import('./config');

      expect(() => getApiKey('OPENAI_API_KEY')).toThrow('OPENAI_API_KEY');
    });
  });

  describe('getOptionalApiKey', () => {
    it('should return undefined when key is missing', async () => {
      delete process.env.SOME_KEY;

      const { getOptionalApiKey } = await import('./config');
      const key = getOptionalApiKey('SOME_KEY');

      expect(key).toBeUndefined();
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      const { loadConfig } = await import('./config');
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.defaults).toBeDefined();
      expect(config.defaults.archetype).toBe('listicle');
      expect(config.defaults.orientation).toBe('portrait');
    });

    it('should merge config file with defaults', async () => {
      // This would need an actual config file test
      const { loadConfig } = await import('./config');
      const config = loadConfig();

      expect(config.llm).toBeDefined();
      expect(config.llm.provider).toBeDefined();
    });
  });

  describe('ConfigSchema', () => {
    it('should validate correct config', async () => {
      const { ConfigSchema } = await import('./config');

      const validConfig = {
        defaults: {
          archetype: 'versus',
          orientation: 'landscape',
          voice: 'am_adam',
        },
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.8,
        },
        audio: {
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        visuals: {
          provider: 'pexels',
          cacheEnabled: true,
        },
        render: {
          width: 1080,
          height: 1920,
          fps: 30,
        },
      };

      const result = ConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid archetype', async () => {
      const { ConfigSchema } = await import('./config');

      const invalidConfig = {
        defaults: {
          archetype: 'invalid-archetype',
        },
      };

      const result = ConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});
