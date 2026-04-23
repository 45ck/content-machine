/**
 * Generate Command Sync Quality Check Tests
 *
 * TDD: Tests for --sync-quality-check, --min-sync-rating, --auto-retry-sync
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('generate command sync quality options', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('flag definitions', () => {
    it('should have --sync-quality-check option', async () => {
      const { generateCommand } = await import('./generate');

      const options = generateCommand.options;
      const syncQualityOption = options.find((o) => o.long === '--sync-quality-check');

      expect(syncQualityOption).toBeDefined();
    });

    it('should have --min-sync-rating option', async () => {
      const { generateCommand } = await import('./generate');

      const options = generateCommand.options;
      const minRatingOption = options.find((o) => o.long === '--min-sync-rating');

      expect(minRatingOption).toBeDefined();
    });

    it('should have --auto-retry-sync option', async () => {
      const { generateCommand } = await import('./generate');

      const options = generateCommand.options;
      const autoRetryOption = options.find((o) => o.long === '--auto-retry-sync');

      expect(autoRetryOption).toBeDefined();
    });

    it('should have --sync-preset option', async () => {
      const { generateCommand } = await import('./generate');

      const options = generateCommand.options;
      const presetOption = options.find((o) => o.long === '--sync-preset');

      expect(presetOption).toBeDefined();
    });
  });

  describe('help text', () => {
    it('should include sync quality flags in help output', async () => {
      const { generateCommand } = await import('./generate');

      const helpText = generateCommand.helpInformation();

      expect(helpText).toContain('--sync-quality-check');
      expect(helpText).toContain('--min-sync-rating');
      expect(helpText).toContain('--auto-retry-sync');
      expect(helpText).toContain('--sync-preset');
    });
  });
});

describe('SyncPreset configuration', () => {
  it('should export SYNC_PRESETS constant', async () => {
    const { SYNC_PRESETS } = await import('./generate');

    expect(SYNC_PRESETS).toBeDefined();
    expect(SYNC_PRESETS.fast).toBeDefined();
    expect(SYNC_PRESETS.standard).toBeDefined();
    expect(SYNC_PRESETS.quality).toBeDefined();
    expect(SYNC_PRESETS.maximum).toBeDefined();
  });

  it('fast preset should use standard pipeline without quality check', async () => {
    const { SYNC_PRESETS } = await import('./generate');

    expect(SYNC_PRESETS.fast.pipeline).toBe('standard');
    expect(SYNC_PRESETS.fast.syncQualityCheck).toBe(false);
  });

  it('quality preset should enable quality check', async () => {
    const { SYNC_PRESETS } = await import('./generate');

    expect(SYNC_PRESETS.quality.syncQualityCheck).toBe(true);
    expect(SYNC_PRESETS.quality.minSyncRating).toBeGreaterThan(0);
  });

  it('maximum preset should use audio-first and reconcile', async () => {
    const { SYNC_PRESETS } = await import('./generate');

    expect(SYNC_PRESETS.maximum.pipeline).toBe('audio-first');
    expect(SYNC_PRESETS.maximum.reconcile).toBe(true);
    expect(SYNC_PRESETS.maximum.syncQualityCheck).toBe(true);
  });
});
