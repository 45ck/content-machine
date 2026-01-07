# TASK-024: Add Sync Quality Check to cm generate

**Type:** Feature  
**Priority:** P2  
**Estimate:** M (4-8 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 3

---

## Description

Integrate `cm rate` as an optional quality gate in the `cm generate` pipeline. When enabled, the rendered video is automatically rated for sync quality, and the pipeline can:

1. Report the sync rating
2. Fail if rating is below threshold
3. Optionally retry with a better sync strategy

This creates a **closed-loop quality system** where generation can self-correct.

---

## Acceptance Criteria

- [ ] Given `--sync-quality-check`, when running cm generate, then cm rate runs after render
- [ ] Given `--min-sync-rating 80`, when rating is 75, then pipeline fails with clear message
- [ ] Given `--auto-retry-sync`, when rating fails, then retries with next-better strategy
- [ ] Given successful rating, when checking output, then rating is included in JSON envelope
- [ ] Given rating check disabled (default), when running cm generate, then no rating happens
- [ ] Given `--sync-preset quality`, when running cm generate, then quality check is enabled automatically

---

## Required Documentation

- [ ] Update `cm generate --help` with new options
- [ ] Document retry escalation order in implementation plan

---

## Testing Considerations

### What Needs Testing

- Integration with existing generate pipeline
- Rating subprocess spawning
- Retry logic with strategy escalation
- Threshold comparison logic
- JSON output format

### Edge Cases

- Rating subprocess fails
- All retries exhausted
- Video file deleted before rating
- Very fast videos (<5 seconds)

### Risks

- Significantly increased pipeline time
- Retry loop doesn't terminate
- Disk space for multiple renders

---

## Testing Plan

### Unit Tests - `src/cli/commands/generate.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('generate command sync quality check', () => {
  describe('--sync-quality-check flag', () => {
    it('calls rateSyncQuality after render when enabled', async () => {
      const rateSpy = vi.spyOn(syncRater, 'rateSyncQuality');

      await runGenerate({
        topic: 'Test topic',
        syncQualityCheck: true,
      });

      expect(rateSpy).toHaveBeenCalled();
    });

    it('does not rate when flag is not set', async () => {
      const rateSpy = vi.spyOn(syncRater, 'rateSyncQuality');

      await runGenerate({ topic: 'Test topic' });

      expect(rateSpy).not.toHaveBeenCalled();
    });
  });

  describe('--min-sync-rating threshold', () => {
    it('passes when rating >= threshold', async () => {
      vi.mocked(syncRater.rateSyncQuality).mockResolvedValue({
        rating: 85,
        ratingLabel: 'good',
        passed: true,
        // ... rest of mock
      });

      const result = await runGenerate({
        topic: 'Test topic',
        syncQualityCheck: true,
        minSyncRating: 80,
      });

      expect(result.success).toBe(true);
    });

    it('fails when rating < threshold', async () => {
      vi.mocked(syncRater.rateSyncQuality).mockResolvedValue({
        rating: 72,
        ratingLabel: 'fair',
        passed: false,
        // ...
      });

      await expect(
        runGenerate({
          topic: 'Test topic',
          syncQualityCheck: true,
          minSyncRating: 80,
        })
      ).rejects.toThrow(CMError);
    });
  });

  describe('--auto-retry-sync', () => {
    it('retries with audio-first when standard fails', async () => {
      const generateAudioSpy = vi.spyOn(audioPipeline, 'generateAudio');

      // First call with standard strategy fails
      vi.mocked(syncRater.rateSyncQuality)
        .mockResolvedValueOnce({ rating: 65, passed: false })
        .mockResolvedValueOnce({ rating: 88, passed: true });

      await runGenerate({
        topic: 'Test topic',
        syncQualityCheck: true,
        minSyncRating: 75,
        autoRetrySync: true,
      });

      // Should have called twice with different strategies
      expect(generateAudioSpy).toHaveBeenCalledTimes(2);
      expect(generateAudioSpy).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ strategy: 'standard' })
      );
      expect(generateAudioSpy).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ strategy: 'audio-first' })
      );
    });

    it('throws after max retries exhausted', async () => {
      vi.mocked(syncRater.rateSyncQuality).mockResolvedValue({
        rating: 50,
        passed: false,
      });

      await expect(
        runGenerate({
          topic: 'Test topic',
          syncQualityCheck: true,
          minSyncRating: 90,
          autoRetrySync: true,
          maxRetries: 2,
        })
      ).rejects.toThrow(/max retries/i);
    });
  });

  describe('--sync-preset', () => {
    it('quality preset enables quality check', async () => {
      const rateSpy = vi.spyOn(syncRater, 'rateSyncQuality');

      await runGenerate({
        topic: 'Test topic',
        syncPreset: 'quality',
      });

      expect(rateSpy).toHaveBeenCalled();
    });

    it('maximum preset uses forced-align strategy', async () => {
      const generateAudioSpy = vi.spyOn(audioPipeline, 'generateAudio');

      await runGenerate({
        topic: 'Test topic',
        syncPreset: 'maximum',
      });

      expect(generateAudioSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ strategy: 'forced-align' })
      );
    });
  });

  describe('JSON output', () => {
    it('includes sync rating in output when checked', async () => {
      vi.mocked(syncRater.rateSyncQuality).mockResolvedValue({
        rating: 92,
        ratingLabel: 'excellent',
        passed: true,
        metrics: {
          meanDriftMs: 35,
          maxDriftMs: 120,
          matchRatio: 0.95,
        },
      });

      const result = await runGenerate({
        topic: 'Test topic',
        syncQualityCheck: true,
        json: true,
      });

      expect(result.outputs.syncRating).toBe(92);
      expect(result.outputs.syncLabel).toBe('excellent');
      expect(result.outputs.meanDriftMs).toBe(35);
    });
  });
});
```

### Integration Tests

```typescript
describe('generate pipeline with rating', () => {
  it('full pipeline with quality check', async () => {
    // E2E test with real (mocked) video
    const result = await execSync(
      'node dist/cli/index.js generate "Test topic" ' + '--sync-preset quality ' + '--json',
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.data.outputs.syncRating).toBeDefined();
    expect(output.data.outputs.syncRating).toBeGreaterThanOrEqual(75);
  });
});
```

---

## Implementation Notes

### Updated Command Definition

```typescript
// src/cli/commands/generate.ts

export const generateCommand = new Command('generate')
  .description('Generate complete video from topic (full pipeline)')
  .argument('<topic>', 'Topic to generate video about')
  .option('-o, --output <path>', 'Output video.mp4 path', 'video.mp4')
  .option('--archetype <type>', 'Content archetype', 'listicle')
  // Existing options...

  // New sync quality options
  .option(
    '--sync-preset <preset>',
    'Sync quality preset: fast, standard, quality, maximum',
    'standard'
  )
  .option('--sync-quality-check', 'Run sync quality rating after render')
  .option('--min-sync-rating <n>', 'Minimum acceptable sync rating (0-100)', '75')
  .option('--auto-retry-sync', 'Retry with better strategy if rating fails')
  .option('--max-retries <n>', 'Maximum retry attempts for sync', '2')
  .action(async (topic: string, options: GenerateOptions) => {
    // Apply preset
    const presetConfig = SYNC_PRESETS[options.syncPreset];
    const mergedOptions = { ...presetConfig, ...options };

    // Run pipeline with quality check
    const result = await runPipelineWithQualityCheck(topic, mergedOptions);

    // Output result
  });
```

### Strategy Escalation Order

```typescript
const STRATEGY_ESCALATION = ['standard', 'audio-first', 'forced-align'] as const;

function getNextStrategy(current: string): string | null {
  const idx = STRATEGY_ESCALATION.indexOf(current as any);
  if (idx === -1 || idx >= STRATEGY_ESCALATION.length - 1) {
    return null;
  }
  return STRATEGY_ESCALATION[idx + 1];
}
```

### Quality Check Loop

```typescript
async function runPipelineWithQualityCheck(
  topic: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  let attempt = 0;
  let currentStrategy = options.syncStrategy ?? 'standard';

  while (attempt <= options.maxRetries) {
    // Run full pipeline
    const videoPath = await runPipeline(topic, {
      ...options,
      syncStrategy: currentStrategy,
    });

    // Skip quality check if not enabled
    if (!options.syncQualityCheck) {
      return { videoPath, attempts: attempt + 1 };
    }

    // Rate sync quality
    const rating = await rateSyncQuality(videoPath);

    if (rating.rating >= options.minSyncRating) {
      return {
        videoPath,
        attempts: attempt + 1,
        syncRating: rating,
      };
    }

    // Check if we should retry
    if (!options.autoRetrySync || attempt >= options.maxRetries) {
      throw new CMError(
        'SYNC_QUALITY_FAILED',
        `Sync rating ${rating.rating}/100 below threshold ${options.minSyncRating}`,
        { rating: rating.rating, threshold: options.minSyncRating }
      );
    }

    // Escalate to next strategy
    const nextStrategy = getNextStrategy(currentStrategy);
    if (!nextStrategy) {
      throw new CMError(
        'SYNC_QUALITY_FAILED',
        `All sync strategies exhausted. Best rating: ${rating.rating}/100`
      );
    }

    log.info({ attempt, currentStrategy, nextStrategy }, 'Retrying with better strategy');
    currentStrategy = nextStrategy;
    attempt++;
  }
}
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass
- [ ] Integration test passes
- [ ] `cm generate --help` shows new flags
- [ ] Retry loop terminates correctly
- [ ] JSON output includes rating info
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-020, TASK-022, TASK-023
- **Blocks:** None (final integration task)
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Existing:** [src/score/sync-rater.ts](../../src/score/sync-rater.ts)
