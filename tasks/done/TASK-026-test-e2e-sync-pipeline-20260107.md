# TASK-026: E2E Tests for Sync Quality Pipeline

**Type:** Test  
**Priority:** P2  
**Estimate:** L (8-16 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 3

---

## Description

Create comprehensive end-to-end tests that validate the full sync quality pipeline:

1. Generate video with different sync strategies
2. Run `cm rate` to measure sync quality
3. Verify ratings meet expected thresholds
4. Test auto-retry and quality gate features

These tests ensure the entire system works together correctly.

---

## Acceptance Criteria

- [ ] Given sync strategy "standard", when running full pipeline, then video is generated and rateable
- [ ] Given sync strategy "audio-first", when running full pipeline, then rating is higher than standard
- [ ] Given `--sync-quality-check` with high threshold, when rating fails, then pipeline fails correctly
- [ ] Given `--auto-retry-sync`, when first attempt fails, then retries with better strategy
- [ ] Given all strategies, when comparing ratings, then forced-align >= audio-first >= standard

---

## Required Documentation

- [ ] Document test fixtures and how to update them
- [ ] Document CI requirements for running E2E tests

---

## Testing Considerations

### What Needs Testing

- Full pipeline integration
- Strategy comparison
- Quality gate behavior
- Retry logic
- Output artifacts

### Edge Cases

- Very short scripts (1 sentence)
- Very long scripts (60+ seconds)
- Scripts with numbers/symbols
- Scripts with multiple languages

### Risks

- Tests are slow (video generation)
- Tests are flaky (non-deterministic LLM/TTS)
- Tests require external dependencies (whisper, ffmpeg)

---

## Testing Plan

### E2E Test Suite - `tests/e2e/sync-pipeline.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_OUTPUT_DIR = 'test-e2e-output/sync';

describe('Sync Pipeline E2E', () => {
  beforeAll(() => {
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup after tests
    if (process.env.CI) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('strategy comparison', () => {
    const testScript = {
      title: 'E2E Test Script',
      hook: 'This is a test of the sync system.',
      scenes: [
        { text: 'Testing word-level timestamps.' },
        { text: 'Each word should align correctly.' },
      ],
      cta: 'Thanks for watching.',
    };

    it('generates video with standard strategy', async () => {
      const outputPath = join(TEST_OUTPUT_DIR, 'standard.mp4');

      execSync(
        `node dist/cli/index.js audio ` +
          `-i test-fixtures/script.json ` +
          `-o ${TEST_OUTPUT_DIR}/standard-audio.wav ` +
          `--timestamps ${TEST_OUTPUT_DIR}/standard-timestamps.json ` +
          `--sync-strategy standard`,
        { encoding: 'utf-8' }
      );

      execSync(
        `node dist/cli/index.js render ` +
          `--audio ${TEST_OUTPUT_DIR}/standard-audio.wav ` +
          `--timestamps ${TEST_OUTPUT_DIR}/standard-timestamps.json ` +
          `--output ${outputPath}`,
        { encoding: 'utf-8' }
      );

      expect(existsSync(outputPath)).toBe(true);
    }, 120_000); // 2 minute timeout

    it('generates video with audio-first strategy', async () => {
      const outputPath = join(TEST_OUTPUT_DIR, 'audio-first.mp4');

      execSync(
        `node dist/cli/index.js audio ` +
          `-i test-fixtures/script.json ` +
          `-o ${TEST_OUTPUT_DIR}/audio-first-audio.wav ` +
          `--timestamps ${TEST_OUTPUT_DIR}/audio-first-timestamps.json ` +
          `--sync-strategy audio-first ` +
          `--reconcile`,
        { encoding: 'utf-8' }
      );

      execSync(
        `node dist/cli/index.js render ` +
          `--audio ${TEST_OUTPUT_DIR}/audio-first-audio.wav ` +
          `--timestamps ${TEST_OUTPUT_DIR}/audio-first-timestamps.json ` +
          `--output ${outputPath}`,
        { encoding: 'utf-8' }
      );

      expect(existsSync(outputPath)).toBe(true);
    }, 120_000);

    it('audio-first produces higher or equal rating than standard', async () => {
      // Rate both videos
      const standardRating = JSON.parse(
        execSync(
          `node dist/cli/index.js rate ` +
            `-i ${TEST_OUTPUT_DIR}/standard.mp4 ` +
            `-o ${TEST_OUTPUT_DIR}/standard-rating.json ` +
            `--json`,
          { encoding: 'utf-8' }
        )
      );

      const audioFirstRating = JSON.parse(
        execSync(
          `node dist/cli/index.js rate ` +
            `-i ${TEST_OUTPUT_DIR}/audio-first.mp4 ` +
            `-o ${TEST_OUTPUT_DIR}/audio-first-rating.json ` +
            `--json`,
          { encoding: 'utf-8' }
        )
      );

      expect(audioFirstRating.data.outputs.rating).toBeGreaterThanOrEqual(
        standardRating.data.outputs.rating
      );
    }, 60_000);
  });

  describe('quality gate', () => {
    it('fails when rating below threshold', async () => {
      expect(() => {
        execSync(
          `node dist/cli/index.js rate ` +
            `-i ${TEST_OUTPUT_DIR}/standard.mp4 ` +
            `--min-rating 100`, // Impossible threshold
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });

    it('passes when rating meets threshold', async () => {
      const result = execSync(
        `node dist/cli/index.js rate ` +
          `-i ${TEST_OUTPUT_DIR}/standard.mp4 ` +
          `--min-rating 50 ` +
          `--json`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);
      expect(output.data.outputs.passed).toBe(true);
    });
  });

  describe('full generate with quality check', () => {
    it('generates and rates in single command', async () => {
      const result = execSync(
        `node dist/cli/index.js generate "Five tips for better code" ` +
          `--archetype listicle ` +
          `--sync-preset quality ` +
          `--output ${TEST_OUTPUT_DIR}/full-pipeline.mp4 ` +
          `--json`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);
      expect(output.data.outputs.videoPath).toBeDefined();
      expect(output.data.outputs.syncRating).toBeGreaterThanOrEqual(75);
    }, 300_000); // 5 minute timeout
  });

  describe('auto-retry behavior', () => {
    it('retries with better strategy when rating fails', async () => {
      // This test is tricky because we need to trigger a retry
      // Use a script that's known to have sync issues with standard

      const result = execSync(
        `node dist/cli/index.js generate "10x faster TypeScript" ` +
          `--sync-quality-check ` +
          `--min-sync-rating 80 ` +
          `--auto-retry-sync ` +
          `--output ${TEST_OUTPUT_DIR}/retry-test.mp4 ` +
          `--json`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);
      // Check if retry happened
      expect(output.data.outputs.syncRating).toBeGreaterThanOrEqual(80);
      // Strategy used should be recorded
      expect(output.data.outputs.strategy).toBeDefined();
    }, 600_000); // 10 minute timeout for retries
  });

  describe('reconciliation verification', () => {
    it('reconciles numbers correctly', async () => {
      // Script with "10x" should be transcribed as "tenex" but reconciled back
      const scriptPath = join(TEST_OUTPUT_DIR, 'numbers-script.json');
      const script = {
        title: 'Number Test',
        hook: 'Make your code 10x faster.',
        scenes: [{ text: 'Speed is 5x more important.' }],
        cta: 'Try it now.',
      };

      writeFileSync(scriptPath, JSON.stringify(script));

      execSync(
        `node dist/cli/index.js audio ` +
          `-i ${scriptPath} ` +
          `-o ${TEST_OUTPUT_DIR}/numbers-audio.wav ` +
          `--timestamps ${TEST_OUTPUT_DIR}/numbers-timestamps.json ` +
          `--sync-strategy audio-first ` +
          `--reconcile`,
        { encoding: 'utf-8' }
      );

      const timestamps = JSON.parse(
        readFileSync(join(TEST_OUTPUT_DIR, 'numbers-timestamps.json'), 'utf-8')
      );

      // Check that "10x" appears in timestamps, not "tenex"
      const words = timestamps.words.map((w) => w.word);
      expect(words).toContain('10x');
      expect(words).not.toContain('tenex');
    }, 120_000);
  });
});

describe('Sync Rating E2E', () => {
  describe('rating accuracy', () => {
    it('rates good sync as excellent/good', async () => {
      // Use a known good video
      const result = execSync(
        `node dist/cli/index.js rate ` + `-i test-fixtures/good-sync-video.mp4 ` + `--json`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);
      expect(['excellent', 'good']).toContain(output.data.outputs.ratingLabel);
    });

    it('rates bad sync as poor/broken', async () => {
      // Use a known bad video
      const result = execSync(
        `node dist/cli/index.js rate ` + `-i test-fixtures/bad-sync-video.mp4 ` + `--json`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);
      expect(['poor', 'broken']).toContain(output.data.outputs.ratingLabel);
    });
  });

  describe('drift detection', () => {
    it('detects linear drift in report', async () => {
      const result = execSync(
        `node dist/cli/index.js rate ` +
          `-i test-fixtures/linear-drift-video.mp4 ` +
          `-o ${TEST_OUTPUT_DIR}/drift-report.json ` +
          `--json`,
        { encoding: 'utf-8' }
      );

      const report = JSON.parse(readFileSync(join(TEST_OUTPUT_DIR, 'drift-report.json'), 'utf-8'));

      expect(report.errors.some((e) => e.type === 'global_offset')).toBe(true);
    });
  });
});
```

---

## Test Fixtures Required

Create these fixture files:

| Fixture                  | Description               | Location                               |
| ------------------------ | ------------------------- | -------------------------------------- |
| `script.json`            | Standard test script      | `test-fixtures/script.json`            |
| `good-sync-video.mp4`    | Video with excellent sync | `test-fixtures/good-sync-video.mp4`    |
| `bad-sync-video.mp4`     | Video with poor sync      | `test-fixtures/bad-sync-video.mp4`     |
| `linear-drift-video.mp4` | Video with linear drift   | `test-fixtures/linear-drift-video.mp4` |

### Fixture Generation Script

```typescript
// scripts/generate-e2e-fixtures.ts

/**
 * Generate test fixtures for E2E sync tests.
 * Run with: npx ts-node scripts/generate-e2e-fixtures.ts
 */
async function generateFixtures() {
  // Generate good-sync video
  // Generate bad-sync video (manually offset captions)
  // Generate linear-drift video
}
```

---

## CI Configuration

```yaml
# .github/workflows/e2e-sync.yml
name: E2E Sync Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Install ffmpeg
        run: sudo apt-get install -y ffmpeg

      - name: Install whisper.cpp
        run: npx @remotion/install-whisper-cpp

      - name: Build
        run: pnpm build

      - name: Run E2E Sync Tests
        run: pnpm test:e2e:sync
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Verification Checklist

- [ ] All E2E test cases written
- [ ] Test fixtures created
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] Fixture generation script created
- [ ] CI workflow configured
- [ ] Timeouts are appropriate
- [ ] Cleanup happens correctly
- [ ] Documentation updated
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-020, TASK-022, TASK-023, TASK-024, TASK-025
- **Blocks:** None (validation task)
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
