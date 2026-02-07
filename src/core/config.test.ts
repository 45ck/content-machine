/**
 * Configuration System Tests
 * TDD: Write tests FIRST, then implement
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock environment before importing
const originalEnv = process.env;
const originalCwd = process.cwd();

describe('Config', () => {
  let testDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    testDir = mkdtempSync(join(tmpdir(), 'content-machine-config-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
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
      process.chdir(testDir);
      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.defaults).toBeDefined();
      expect(config.defaults.archetype).toBe('listicle');
      expect(config.defaults.orientation).toBe('portrait');
    });

    it('should merge config file with defaults', async () => {
      process.chdir(testDir);
      const configPath = join(testDir, '.content-machine.toml');
      const expectedFontPath = join(testDir, 'assets/fonts/Montserrat-Bold.woff2');
      writeFileSync(
        configPath,
        [
          '[defaults]',
          'archetype = "versus"',
          'orientation = "landscape"',
          'voice = "am_adam"',
          '',
          '[llm]',
          'provider = "anthropic"',
          'model = "claude-3-5-sonnet-20241022"',
          'temperature = 0.5',
          '',
          '[captions]',
          'font_family = "Montserrat"',
          'font_weight = 700',
          'font_file = "assets/fonts/Montserrat-Bold.woff2"',
          '',
          '[[captions.fonts]]',
          'family = "Montserrat"',
          'src = "assets/fonts/Montserrat-Bold.woff2"',
          'weight = 700',
          'style = "normal"',
          '',
        ].join('\n'),
        'utf-8'
      );

      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config.defaults.archetype).toBe('versus');
      expect(config.defaults.orientation).toBe('landscape');
      expect(config.defaults.voice).toBe('am_adam');

      expect(config.llm.provider).toBe('anthropic');
      expect(config.llm.model).toBe('claude-3-5-sonnet-20241022');
      expect(config.llm.temperature).toBe(0.5);

      expect(config.captions.fontFamily).toBe('Montserrat');
      expect(config.captions.fontWeight).toBe(700);
      expect(config.captions.fontFile).toBe(expectedFontPath);
      expect(config.captions.fonts).toHaveLength(1);
      expect(config.captions.fonts[0].family).toBe('Montserrat');
    });

    it('should parse TOML files with CRLF line endings', async () => {
      process.chdir(testDir);
      const configPath = join(testDir, '.content-machine.toml');
      writeFileSync(
        configPath,
        ['[defaults]', 'archetype = "story"', 'orientation = "square"', ''].join('\r\n'),
        'utf-8'
      );

      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config.defaults.archetype).toBe('story');
      expect(config.defaults.orientation).toBe('square');
    });

    it('should load caption font settings from JSON config', async () => {
      const configPath = join(testDir, '.cmrc.json');
      const expectedFontPath = join(testDir, 'assets/fonts/Montserrat-Bold.woff2');
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            captions: {
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontFile: 'assets/fonts/Montserrat-Bold.woff2',
              fonts: [
                {
                  family: 'Montserrat',
                  src: 'assets/fonts/Montserrat-Bold.woff2',
                  weight: 700,
                  style: 'normal',
                },
              ],
            },
          },
          null,
          2
        ),
        'utf-8'
      );

      process.chdir(testDir);

      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config.captions).toBeDefined();
      expect(config.captions.fontFamily).toBe('Montserrat');
      expect(config.captions.fontWeight).toBe(700);
      expect(config.captions.fontFile).toBe(expectedFontPath);
      expect(config.captions.fonts).toHaveLength(1);
      expect(config.captions.fonts[0].family).toBe('Montserrat');
    });

    it('should discover project config by walking up directories', async () => {
      const configPath = join(testDir, '.content-machine.toml');
      writeFileSync(
        configPath,
        ['[defaults]', 'archetype = "howto"', 'voice = "am_adam"', ''].join('\n'),
        'utf-8'
      );

      const nestedDir = join(testDir, 'a', 'b', 'c');
      mkdirSync(nestedDir, { recursive: true });
      process.chdir(nestedDir);

      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config.defaults.archetype).toBe('howto');
      expect(config.defaults.voice).toBe('am_adam');
    });

    it('should merge user config and project config (project wins)', async () => {
      const fakeHome = join(testDir, 'home');
      const userConfigDir = join(fakeHome, '.cm');
      mkdirSync(userConfigDir, { recursive: true });
      process.env.HOME = fakeHome;

      writeFileSync(
        join(userConfigDir, 'config.toml'),
        [
          '[captions]',
          'font_family = "UserFont"',
          '',
          '[music]',
          'volume_db = -10',
          '',
          '[sync]',
          'strategy = "audio-first"',
          '',
        ].join('\n'),
        'utf-8'
      );

      writeFileSync(
        join(testDir, '.content-machine.toml'),
        [
          '[captions]',
          'font_family = "ProjectFont"',
          '',
          '[sync]',
          'reconcile_to_script = true',
          '',
        ].join('\n'),
        'utf-8'
      );

      process.chdir(testDir);

      const { loadConfig, clearConfigCache } = await import('./config');
      clearConfigCache();
      const config = loadConfig();

      expect(config.captions.fontFamily).toBe('ProjectFont');
      expect(config.music.volumeDb).toBe(-10);
      expect(config.sync.strategy).toBe('audio-first');
      expect(config.sync.reconcileToScript).toBe(true);
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
        captions: {
          fontFamily: 'Roboto',
          fontWeight: 700,
          fontFile: 'assets/fonts/Roboto-Bold.woff2',
          fonts: [
            {
              family: 'Roboto',
              src: 'assets/fonts/Roboto-Bold.woff2',
              weight: 700,
            },
          ],
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

    it('should apply caption font defaults', async () => {
      const { ConfigSchema } = await import('./config');

      const result = ConfigSchema.parse({});

      expect(result.captions).toBeDefined();
      expect(result.captions.fontFamily).toBeDefined();
    });
  });

  // ==========================================================================
  // TASK-018: SyncConfigSchema Tests (TDD - RED PHASE)
  // ==========================================================================
  describe('SyncConfigSchema', () => {
    describe('defaults', () => {
      it('should apply default strategy as "standard"', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result.strategy).toBe('standard');
      });

      it('should apply default requireWhisper as false', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result.requireWhisper).toBe(false);
      });

      it('should apply default asrModel as "base"', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result.asrModel).toBe('base');
      });

      it('should apply default reconcileToScript as false', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result.reconcileToScript).toBe(false);
      });

      it('should apply default driftCorrection as "none"', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result.driftCorrection).toBe('none');
      });

      it('should apply all defaults for empty object', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({});

        expect(result).toEqual({
          strategy: 'standard',
          requireWhisper: false,
          asrModel: 'base',
          reconcileToScript: false,
          minSimilarity: 0.7,
          driftCorrection: 'none',
          maxDriftMs: 80,
          validateTimestamps: true,
          autoRepair: true,
          qualityCheck: false,
          minRating: 75,
          autoRetry: false,
          maxRetries: 2,
        });
      });
    });

    describe('strategy validation', () => {
      it('should accept "standard" strategy', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ strategy: 'standard' });

        expect(result.success).toBe(true);
      });

      it('should accept "audio-first" strategy', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ strategy: 'audio-first' });

        expect(result.success).toBe(true);
      });

      it('should accept "forced-align" strategy', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ strategy: 'forced-align' });

        expect(result.success).toBe(true);
      });

      it('should accept "hybrid" strategy', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ strategy: 'hybrid' });

        expect(result.success).toBe(true);
      });

      it('should reject invalid strategy value', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ strategy: 'invalid' });

        expect(result.success).toBe(false);
      });
    });

    describe('driftCorrection validation', () => {
      it('should accept "none" drift correction', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ driftCorrection: 'none' });

        expect(result.success).toBe(true);
      });

      it('should accept "detect" drift correction', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ driftCorrection: 'detect' });

        expect(result.success).toBe(true);
      });

      it('should accept "auto" drift correction', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ driftCorrection: 'auto' });

        expect(result.success).toBe(true);
      });

      it('should reject invalid drift correction value', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ driftCorrection: 'invalid' });

        expect(result.success).toBe(false);
      });
    });

    describe('numeric constraints', () => {
      it('should accept minSimilarity at lower bound (0)', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minSimilarity: 0 });

        expect(result.success).toBe(true);
      });

      it('should accept minSimilarity at upper bound (1)', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minSimilarity: 1 });

        expect(result.success).toBe(true);
      });

      it('should reject minSimilarity below 0', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minSimilarity: -0.1 });

        expect(result.success).toBe(false);
      });

      it('should reject minSimilarity above 1', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minSimilarity: 1.5 });

        expect(result.success).toBe(false);
      });

      it('should accept minRating at lower bound (0)', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minRating: 0 });

        expect(result.success).toBe(true);
      });

      it('should accept minRating at upper bound (100)', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minRating: 100 });

        expect(result.success).toBe(true);
      });

      it('should reject minRating below 0', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minRating: -1 });

        expect(result.success).toBe(false);
      });

      it('should reject minRating above 100', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ minRating: 101 });

        expect(result.success).toBe(false);
      });

      it('should accept positive maxDriftMs', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ maxDriftMs: 150 });

        expect(result.success).toBe(true);
      });

      it('should accept positive maxRetries', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.safeParse({ maxRetries: 5 });

        expect(result.success).toBe(true);
      });
    });

    describe('partial config merging', () => {
      it('should merge partial config with defaults', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({
          strategy: 'audio-first',
          reconcileToScript: true,
        });

        expect(result.strategy).toBe('audio-first');
        expect(result.reconcileToScript).toBe(true);
        expect(result.driftCorrection).toBe('none'); // default preserved
        expect(result.requireWhisper).toBe(false); // default preserved
      });

      it('should allow overriding multiple fields', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({
          strategy: 'forced-align',
          requireWhisper: true,
          reconcileToScript: true,
          driftCorrection: 'auto',
          minRating: 90,
        });

        expect(result.strategy).toBe('forced-align');
        expect(result.requireWhisper).toBe(true);
        expect(result.reconcileToScript).toBe(true);
        expect(result.driftCorrection).toBe('auto');
        expect(result.minRating).toBe(90);
      });
    });

    describe('boolean fields', () => {
      it('should accept true for requireWhisper', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({ requireWhisper: true });

        expect(result.requireWhisper).toBe(true);
      });

      it('should accept true for validateTimestamps', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({ validateTimestamps: true });

        expect(result.validateTimestamps).toBe(true);
      });

      it('should accept false for autoRepair', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({ autoRepair: false });

        expect(result.autoRepair).toBe(false);
      });

      it('should accept true for qualityCheck', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({ qualityCheck: true });

        expect(result.qualityCheck).toBe(true);
      });

      it('should accept true for autoRetry', async () => {
        const { SyncConfigSchema } = await import('./config');

        const result = SyncConfigSchema.parse({ autoRetry: true });

        expect(result.autoRetry).toBe(true);
      });
    });
  });

  describe('ConfigSchema with sync section', () => {
    it('should include sync config with defaults when not provided', async () => {
      const { ConfigSchema } = await import('./config');

      const result = ConfigSchema.parse({});

      expect(result.sync).toBeDefined();
      expect(result.sync.strategy).toBe('standard');
    });

    it('should include hooks config with defaults when not provided', async () => {
      const { ConfigSchema } = await import('./config');

      const result = ConfigSchema.parse({});

      expect(result.hooks).toBeDefined();
      expect(result.hooks.library).toBe('transitionalhooks');
      expect(result.hooks.audio).toBe('keep');
      expect(result.hooks.defaultHook).toBe('no-crunch');
    });

    it('should include audio mix defaults when not provided', async () => {
      const { ConfigSchema } = await import('./config');

      const result = ConfigSchema.parse({});

      expect(result.audioMix.preset).toBe('clean');
      expect(result.music.volumeDb).toBe(-18);
      expect(result.sfx.placement).toBe('scene');
      expect(result.ambience.volumeDb).toBe(-26);
    });

    it('should accept config with sync section', async () => {
      const { ConfigSchema } = await import('./config');

      const config = {
        sync: {
          strategy: 'audio-first',
          reconcileToScript: true,
        },
      };

      const result = ConfigSchema.parse(config);

      expect(result.sync.strategy).toBe('audio-first');
      expect(result.sync.reconcileToScript).toBe(true);
    });

    it('should merge sync with other config sections', async () => {
      const { ConfigSchema } = await import('./config');

      const config = {
        defaults: {
          archetype: 'versus',
        },
        sync: {
          strategy: 'forced-align',
          minRating: 85,
        },
      };

      const result = ConfigSchema.parse(config);

      expect(result.defaults.archetype).toBe('versus');
      expect(result.sync.strategy).toBe('forced-align');
      expect(result.sync.minRating).toBe(85);
    });
  });

  describe('SyncConfig type export', () => {
    it('should export SyncConfig type', async () => {
      const configModule = await import('./config');

      // TypeScript compile-time check - if SyncConfig is exported, this works
      type TestSyncConfig = typeof configModule.SyncConfigSchema;
      const schema: TestSyncConfig = configModule.SyncConfigSchema;

      expect(schema).toBeDefined();
    });
  });
});
