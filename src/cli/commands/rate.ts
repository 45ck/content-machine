/**
 * Rate command - Video caption-audio sync quality rating
 *
 * Usage: cm rate --input video.mp4 --output sync-report.json
 *
 * This command analyzes a rendered video to measure how well
 * the on-screen captions synchronize with the spoken audio.
 * It uses OCR to detect caption timing and ASR to detect speech timing.
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import {
  buildJsonEnvelope,
  writeJsonEnvelope,
  writeStderrLine,
  writeStdoutLine,
} from '../output';
import { CMError } from '../../core/errors';
import type { SyncRatingOutput } from '../../score/sync-schema';
import { existsSync } from 'node:fs';

interface RateOptions {
  input: string;
  output: string;
  fps: string;
  minRating: string;
  mock?: boolean;
  summary?: boolean;
}

type SyncRatingResult = SyncRatingOutput;

function parseFps(value: string): number {
  const fps = Number.parseInt(value, 10);
  if (!Number.isFinite(fps) || fps < 1 || fps > 30) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --fps value: ${value}`, {
      fix: 'Use a number between 1 and 30 for --fps',
    });
  }
  return fps;
}

function parseMinRating(value: string): number {
  const minRating = Number.parseInt(value, 10);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-rating value: ${value}`, {
      fix: 'Use a number between 0 and 100 for --min-rating',
    });
  }
  return minRating;
}

function ensureVideoExists(path: string, mock: boolean | undefined): void {
  if (mock) return;
  if (!existsSync(path)) {
    throw new CMError('FILE_NOT_FOUND', `Video file not found: ${path}`);
  }
}

function writeHumanOutput(params: {
  options: RateOptions;
  passed: boolean;
  result: SyncRatingResult;
  formatCli: (result: SyncRatingResult) => string;
}): void {
  const { options, passed, result, formatCli } = params;

  if (options.summary) {
    writeStderrLine(`Sync rating: ${result.rating}/100 (${result.ratingLabel})`);
    writeStderrLine(`Passed: ${passed}`);
  } else {
    writeStderrLine('\n' + formatCli(result));
  }

  if (!options.summary && result.errors.length > 0) {
    writeStderrLine('\nSuggested fixes:');
    for (const error of result.errors) {
      if (error.suggestedFix) {
        writeStderrLine(`  - ${error.suggestedFix}`);
      }
    }
  }

  writeStderrLine(`${options.summary ? '' : '\n'}Report written to: ${options.output}`);
  writeStdoutLine(options.output);
}

export const rateCommand = new Command('rate')
  .description('Rate video caption-audio sync quality')
  .requiredOption('-i, --input <path>', 'Input video.mp4 path')
  .option('-o, --output <path>', 'Output sync-report.json path', 'sync-report.json')
  .option('--fps <n>', 'Frames per second to sample', '2')
  .option('--min-rating <n>', 'Fail if sync rating is below this threshold', '75')
  .option('--summary', 'Print a compact summary only (human mode)', false)
  .option('--mock', 'Use mock analysis (for testing)', false)
  .action(async (options: RateOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing video sync quality...').start();

    try {
      ensureVideoExists(options.input, options.mock);
      const fps = parseFps(options.fps);
      const minRating = parseMinRating(options.minRating);

      spinner.text = 'Analyzing captions vs audio...';

      const { rateSyncQuality, formatSyncRatingCLI } = await import('../../score/sync-rater');

      const result = await rateSyncQuality(options.input, {
        fps,
        thresholds: {
          minRating,
          maxMeanDriftMs: 180,
          maxMaxDriftMs: 500,
          minMatchRatio: 0.7,
        },
        mock: Boolean(options.mock),
      });

      await writeOutputFile(options.output, result);
      spinner.succeed(`Sync rating complete: ${result.rating}/100`);

      const passed = result.passed;

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'rate',
            args: {
              input: options.input,
              output: options.output,
              fps,
              minRating,
              mock: Boolean(options.mock),
            },
            outputs: {
              reportPath: options.output,
              rating: result.rating,
              ratingLabel: result.ratingLabel,
              passed,
              meanDriftMs: result.metrics.meanDriftMs,
              maxDriftMs: result.metrics.maxDriftMs,
              matchRatio: result.metrics.matchRatio,
              errorCount: result.errors.length,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(passed ? 0 : 1);
      }

      writeHumanOutput({
        options,
        passed,
        result,
        formatCli: formatSyncRatingCLI,
      });
      process.exit(passed ? 0 : 1);
    } catch (error) {
      spinner.fail('Sync rating failed');
      handleCommandError(error);
    }
  });
