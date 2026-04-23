/**
 * Caption Quality command - Burned-in caption quality rating (OCR-only)
 *
 * Usage: cm caption-quality --input video.mp4 --output caption-report.json
 *
 * This command analyzes a rendered video to measure burned-in caption quality
 * (OCR-derived). It does not require audio/ASR, making it suitable for fast
 * local iteration loops.
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { CMError } from '../../core/errors';
import { existsSync } from 'node:fs';

type CaptionQualityResult = Awaited<
  ReturnType<typeof import('../../score/sync-rater').rateCaptionQuality>
>;

interface CaptionQualityOptions {
  input: string;
  output: string;
  fps: string;
  minOverall: string;
  captionYRatio: string;
  captionHeightRatio: string;
  mock?: boolean;
  summary?: boolean;
}

function parseFps(value: string): number {
  const fps = Number.parseInt(value, 10);
  if (!Number.isFinite(fps) || fps < 1 || fps > 30) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --fps value: ${value}`, {
      fix: 'Use a number between 1 and 30 for --fps',
    });
  }
  return fps;
}

function parseRatio(value: string, flagName: string): number {
  const ratio = Number.parseFloat(value);
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid ${flagName} value: ${value}`, {
      fix: `Use a number between 0 and 1 (exclusive) for ${flagName}`,
    });
  }
  return ratio;
}

function parseMinOverall(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-overall value: ${raw}`, {
      fix: 'Use a number between 0..1 or 0..100 for --min-overall',
    });
  }
  if (value > 1 && value <= 100) return value / 100;
  if (value <= 1) return value;
  throw new CMError('INVALID_ARGUMENT', `Invalid --min-overall value: ${raw}`, {
    fix: 'Use a number between 0..1 or 0..100 for --min-overall',
  });
}

function ensureVideoExists(path: string, mock: boolean | undefined): void {
  if (mock) return;
  if (!existsSync(path)) {
    throw new CMError('FILE_NOT_FOUND', `Video file not found: ${path}`);
  }
}

function writeHumanOutput(params: {
  options: CaptionQualityOptions;
  result: CaptionQualityResult;
  passed: boolean;
}): void {
  const { options, result, passed } = params;
  const q = result.captionQuality;

  if (options.summary) {
    writeStderrLine(
      `Caption quality: ${q.overall.score.toFixed(2)} (${q.overall.passed ? 'PASS' : 'FAIL'})`
    );
    writeStderrLine(`Passed threshold: ${passed}`);
    writeStderrLine(
      `Coverage: ${(q.coverage.coverageRatio * 100).toFixed(0)}% | SafeArea: ${q.safeArea.score.toFixed(
        2
      )} | Flicker: ${q.flicker.flickerEvents} | OCR mean: ${q.ocrConfidence.mean.toFixed(2)}`
    );
  } else {
    writeStderrLine('Caption Quality (OCR-only)');
    writeStderrLine(`- overall: ${q.overall.score.toFixed(3)} (passed=${q.overall.passed})`);
    writeStderrLine(
      `- coverage: ${(q.coverage.coverageRatio * 100).toFixed(0)}% (score=${q.coverage.score.toFixed(2)})`
    );
    writeStderrLine(
      `- safeArea: score=${q.safeArea.score.toFixed(2)} violations=${q.safeArea.violationCount}`
    );
    writeStderrLine(
      `- flicker: score=${q.flicker.score.toFixed(2)} events=${q.flicker.flickerEvents}`
    );
    writeStderrLine(
      `- ocrConfidence: mean=${q.ocrConfidence.mean.toFixed(2)} min=${q.ocrConfidence.min.toFixed(
        2
      )} stddev=${q.ocrConfidence.stddev.toFixed(2)}`
    );
  }

  if (result.errors.length > 0) {
    writeStderrLine('\nSuggested fixes:');
    for (const error of result.errors) {
      if (error.suggestedFix) writeStderrLine(`  - ${error.suggestedFix}`);
    }
  }

  writeStderrLine(`Report written to: ${options.output}`);
  writeStdoutLine(options.output);
}

export const captionQualityCommand = new Command('caption-quality')
  .description('Rate burned-in caption quality (OCR-only)')
  .requiredOption('-i, --input <path>', 'Input video.mp4 path')
  .option('-o, --output <path>', 'Output caption-report.json path', 'caption-report.json')
  .option('--fps <n>', 'Frames per second to sample', '2')
  .option(
    '--min-overall <n>',
    'Fail if caption overall score is below this threshold (0..1 or 0..100)',
    '0.75'
  )
  .option('--caption-y-ratio <n>', 'Start crop at this fraction of frame height (0..1)', '0.65')
  .option('--caption-height-ratio <n>', 'Crop height as fraction of frame height (0..1)', '0.35')
  .option('--summary', 'Print a compact summary only (human mode)', false)
  .option('--mock', 'Use mock analysis (for testing)', false)
  .action(async (options: CaptionQualityOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing caption quality (OCR-only)...').start();

    try {
      ensureVideoExists(options.input, options.mock);
      const fps = parseFps(options.fps);
      const minOverall = parseMinOverall(options.minOverall);
      const yRatio = parseRatio(options.captionYRatio, '--caption-y-ratio');
      const heightRatio = parseRatio(options.captionHeightRatio, '--caption-height-ratio');

      const { rateCaptionQuality } = await import('../../score/sync-rater');

      const result = await rateCaptionQuality(options.input, {
        fps,
        captionRegion: { yRatio, heightRatio },
        mock: Boolean(options.mock),
      });

      await writeOutputFile(options.output, result);
      spinner.succeed(
        `Caption quality complete: ${result.captionQuality.overall.score.toFixed(3)}`
      );

      const passed =
        result.captionQuality.overall.passed && result.captionQuality.overall.score >= minOverall;

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'caption-quality',
            args: {
              input: options.input,
              output: options.output,
              fps,
              minOverall,
              captionRegion: { yRatio, heightRatio },
              mock: Boolean(options.mock),
            },
            outputs: {
              reportPath: options.output,
              passed,
              overall: result.captionQuality.overall.score,
              coverageRatio: result.captionQuality.coverage.coverageRatio,
              safeAreaScore: result.captionQuality.safeArea.score,
              flickerEvents: result.captionQuality.flicker.flickerEvents,
              meanOcrConfidence: result.captionQuality.ocrConfidence.mean,
              errorCount: result.errors.length,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(passed ? 0 : 1);
      }

      writeHumanOutput({ options, result, passed });
      process.exit(passed ? 0 : 1);
    } catch (error) {
      spinner.fail('Caption quality failed');
      handleCommandError(error);
    }
  });
