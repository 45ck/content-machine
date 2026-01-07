/**
 * E2E Sync Pipeline Tests
 *
 * Tests the full sync quality pipeline with mock mode.
 * These tests validate:
 * - Quality gate enforcement (--min-rating)
 * - Sync rating output format
 * - CLI contract for sync commands
 *
 * For real video analysis tests, use test-fixtures/ with pre-generated videos.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCli } from '../integration/cli/helpers';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_OUTPUT_DIR = join(__dirname, '..', '..', 'test-e2e-output', 'sync-tests');
const TEST_FIXTURES_DIR = join(__dirname, '..', '..', 'test-fixtures');
const REPO_ROOT = join(__dirname, '..', '..');

/**
 * Helper to check if test fixture video exists.
 * Returns the path if it exists, null otherwise.
 */
function getTestVideoPath(): string | null {
  const videoPath = join(REPO_ROOT, 'test-e2e-output', 'final-video.mp4');
  if (existsSync(videoPath)) {
    return videoPath;
  }
  return null;
}

/**
 * Helper to parse JSON output from CLI.
 * The CLI outputs JSON to stdout when --json flag is used.
 * The output is flat (no .data wrapper).
 */
function parseJsonOutput(stdout: string): Record<string, unknown> | null {
  try {
    // The stdout may contain newlines at the end
    const trimmed = stdout.trim();
    if (!trimmed.startsWith('{')) {
      return null;
    }
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

describe('Sync Pipeline E2E', () => {
  beforeAll(() => {
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup test outputs (but not in CI to allow artifact collection)
    if (!process.env.CI && existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('cm rate with mock mode', () => {
    it('returns rating in JSON format', async () => {
      const videoPath = getTestVideoPath();
      if (!videoPath) {
        console.log('Skipping: test-e2e-output/final-video.mp4 not found');
        return;
      }

      const outputPath = join(TEST_OUTPUT_DIR, 'rating.json');
      const result = await runCli(
        ['--json', 'rate', '-i', videoPath, '-o', outputPath, '--mock'],
        undefined,
        60000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'rate');
      expect(
        (output as Record<string, Record<string, unknown>>).outputs.rating
      ).toBeGreaterThanOrEqual(0);
      expect(
        (output as Record<string, Record<string, unknown>>).outputs.rating
      ).toBeLessThanOrEqual(100);
    }, 90000);

    it('fails when rating is below min-rating threshold', async () => {
      const videoPath = getTestVideoPath();
      if (!videoPath) {
        console.log('Skipping: test-e2e-output/final-video.mp4 not found');
        return;
      }

      // Mock rating is around 75-85, so 100 should fail
      const outputPath = join(TEST_OUTPUT_DIR, 'rating-fail.json');
      const result = await runCli(
        ['--json', 'rate', '-i', videoPath, '-o', outputPath, '--mock', '--min-rating', '100'],
        undefined,
        60000
      );

      expect(result.code).toBe(1);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect((output as Record<string, Record<string, unknown>>).outputs.passed).toBe(false);
    }, 90000);

    it('passes when rating meets min-rating threshold', async () => {
      const videoPath = getTestVideoPath();
      if (!videoPath) {
        console.log('Skipping: test-e2e-output/final-video.mp4 not found');
        return;
      }

      // Mock rating is around 75-85, so 50 should pass
      const outputPath = join(TEST_OUTPUT_DIR, 'rating-pass.json');
      const result = await runCli(
        ['--json', 'rate', '-i', videoPath, '-o', outputPath, '--mock', '--min-rating', '50'],
        undefined,
        60000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect((output as Record<string, Record<string, unknown>>).outputs.passed).toBe(true);
    }, 90000);

    it('writes report file with all required fields', async () => {
      const videoPath = getTestVideoPath();
      if (!videoPath) {
        console.log('Skipping: test-e2e-output/final-video.mp4 not found');
        return;
      }

      const outputPath = join(TEST_OUTPUT_DIR, 'rating-fields.json');
      const result = await runCli(
        ['rate', '-i', videoPath, '-o', outputPath, '--mock'],
        undefined,
        60000
      );

      expect(result.code).toBe(0);
      expect(existsSync(outputPath)).toBe(true);

      // Read the report file (not CLI output)
      const report = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(report).toHaveProperty('rating');
      expect(report).toHaveProperty('ratingLabel');
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('metrics');
      expect(report.metrics).toHaveProperty('meanDriftMs');
      expect(report.metrics).toHaveProperty('maxDriftMs');
      expect(report.metrics).toHaveProperty('matchRatio');
    }, 90000);
  });

  describe('cm audio with sync flags', () => {
    it('accepts --sync-strategy standard', async () => {
      const scriptPath = join(TEST_FIXTURES_DIR, 'script.json');
      if (!existsSync(scriptPath)) {
        console.log('Skipping: test-fixtures/script.json not found');
        return;
      }

      const outputPath = join(TEST_OUTPUT_DIR, 'audio-standard.wav');
      const timestampsPath = join(TEST_OUTPUT_DIR, 'timestamps-standard.json');
      const result = await runCli(
        [
          '--json',
          'audio',
          '-i',
          scriptPath,
          '-o',
          outputPath,
          '--timestamps',
          timestampsPath,
          '--sync-strategy',
          'standard',
          '--mock',
        ],
        undefined,
        60000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'audio');
      expect((output as Record<string, Record<string, unknown>>).args.syncStrategy).toBe(
        'standard'
      );
    }, 90000);

    it('accepts --sync-strategy audio-first with --require-whisper', async () => {
      const scriptPath = join(TEST_FIXTURES_DIR, 'script.json');
      if (!existsSync(scriptPath)) {
        console.log('Skipping: test-fixtures/script.json not found');
        return;
      }

      const outputPath = join(TEST_OUTPUT_DIR, 'audio-first.wav');
      const timestampsPath = join(TEST_OUTPUT_DIR, 'timestamps-first.json');
      const result = await runCli(
        [
          '--json',
          'audio',
          '-i',
          scriptPath,
          '-o',
          outputPath,
          '--timestamps',
          timestampsPath,
          '--sync-strategy',
          'audio-first',
          '--require-whisper',
          '--mock',
        ],
        undefined,
        60000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      const args = (output as Record<string, Record<string, unknown>>).args;
      expect(args.syncStrategy).toBe('audio-first');
      expect(args.requireWhisper).toBe(true);
    }, 90000);

    it('accepts --reconcile flag', async () => {
      const scriptPath = join(TEST_FIXTURES_DIR, 'script.json');
      if (!existsSync(scriptPath)) {
        console.log('Skipping: test-fixtures/script.json not found');
        return;
      }

      const outputPath = join(TEST_OUTPUT_DIR, 'audio-reconcile.wav');
      const timestampsPath = join(TEST_OUTPUT_DIR, 'timestamps-reconcile.json');
      const result = await runCli(
        [
          '--json',
          'audio',
          '-i',
          scriptPath,
          '-o',
          outputPath,
          '--timestamps',
          timestampsPath,
          '--reconcile',
          '--mock',
        ],
        undefined,
        60000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect((output as Record<string, Record<string, unknown>>).args.reconcile).toBe(true);
    }, 90000);
  });

  describe('cm generate with sync presets', () => {
    it('accepts --sync-preset quality', async () => {
      const result = await runCli(
        [
          '--json',
          'generate',
          'Test topic for sync',
          '--sync-preset',
          'quality',
          '--mock',
          '--dry-run',
        ],
        undefined,
        30000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'generate');
    }, 60000);

    it('accepts --sync-quality-check flag', async () => {
      const result = await runCli(
        ['--json', 'generate', 'Test topic', '--sync-quality-check', '--mock', '--dry-run'],
        undefined,
        30000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'generate');
    }, 60000);

    it('accepts --min-sync-rating flag', async () => {
      const result = await runCli(
        ['--json', 'generate', 'Test topic', '--min-sync-rating', '80', '--mock', '--dry-run'],
        undefined,
        30000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'generate');
    }, 60000);

    it('accepts --auto-retry-sync flag', async () => {
      const result = await runCli(
        ['--json', 'generate', 'Test topic', '--auto-retry-sync', '--mock', '--dry-run'],
        undefined,
        30000
      );

      expect(result.code).toBe(0);

      const output = parseJsonOutput(result.stdout);
      expect(output).not.toBeNull();
      expect(output).toHaveProperty('command', 'generate');
    }, 60000);
  });
});
