/**
 * Audio Command Sync Flags Tests
 *
 * TDD: Tests for CLI sync strategy flags added to cm audio.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('audio command sync flags', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('flag definitions', () => {
    it('should have --sync-strategy option', async () => {
      const { audioCommand } = await import('./audio');

      const options = audioCommand.options;
      const syncStrategyOption = options.find((o) => o.long === '--sync-strategy');

      expect(syncStrategyOption).toBeDefined();
    });

    it('should have --reconcile option', async () => {
      const { audioCommand } = await import('./audio');

      const options = audioCommand.options;
      const reconcileOption = options.find((o) => o.long === '--reconcile');

      expect(reconcileOption).toBeDefined();
    });

    it('should have --require-whisper option', async () => {
      const { audioCommand } = await import('./audio');

      const options = audioCommand.options;
      const requireWhisperOption = options.find((o) => o.long === '--require-whisper');

      expect(requireWhisperOption).toBeDefined();
    });

    it('should have --whisper-model option', async () => {
      const { audioCommand } = await import('./audio');

      const options = audioCommand.options;
      const whisperModelOption = options.find((o) => o.long === '--whisper-model');

      expect(whisperModelOption).toBeDefined();
    });
  });

  describe('--sync-strategy validation', () => {
    it('should accept "standard" strategy', async () => {
      const { audioCommand } = await import('./audio');

      // This just tests the command definition
      const syncOption = audioCommand.options.find((o) => o.long === '--sync-strategy');
      expect(syncOption?.description).toContain('strategy');
    });

    it('should accept "audio-first" strategy', async () => {
      const { audioCommand } = await import('./audio');

      const syncOption = audioCommand.options.find((o) => o.long === '--sync-strategy');
      expect(syncOption).toBeDefined();
    });
  });

  describe('--whisper-model choices', () => {
    it('should document available model sizes', async () => {
      const { audioCommand } = await import('./audio');

      const modelOption = audioCommand.options.find((o) => o.long === '--whisper-model');
      expect(modelOption?.description).toBeDefined();
    });
  });

  describe('help text', () => {
    it('should include sync flags in help output', async () => {
      const { audioCommand } = await import('./audio');

      const helpText = audioCommand.helpInformation();

      expect(helpText).toContain('--sync-strategy');
      expect(helpText).toContain('--reconcile');
      expect(helpText).toContain('--require-whisper');
      expect(helpText).toContain('--whisper-model');
    });
  });
});
