/**
 * Captions command - Analyze caption chunk pacing and readability
 *
 * Usage: cm captions --timestamps timestamps.json --output caption-diagnostics.json
 */
import { Command } from 'commander';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { CMError } from '../../core/errors';
import type { TimestampsOutput } from '../../audio/schema';
import {
  CaptionConfigSchema,
  CaptionDisplayModeSchema,
  type CaptionDisplayMode,
} from '../../render/captions/config';
import {
  CAPTION_STYLE_PRESETS,
  getCaptionPreset,
  type CaptionPresetName,
} from '../../render/captions/presets';
import { analyzeCaptionChunks } from '../../score/caption-diagnostics';

interface CaptionsOptions {
  timestamps: string;
  output: string;
  captionPreset: string;
  captionMode?: string;
  summary?: boolean;
}

export const captionsCommand = new Command('captions')
  .description('Analyze caption chunk pacing and readability')
  .requiredOption('--timestamps <path>', 'Input timestamps.json path')
  .option('-o, --output <path>', 'Output caption-diagnostics.json path', 'caption-diagnostics.json')
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)',
    'capcut'
  )
  .option('--caption-mode <mode>', 'Caption display mode (page, single, buildup, chunk)')
  .option('--summary', 'Print a compact summary only', false)
  .action(async (options: CaptionsOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing caption pacing...').start();

    try {
      const timestamps = await readInputFile<TimestampsOutput>(options.timestamps);
      const presetName = String(options.captionPreset).toLowerCase();

      if (!Object.prototype.hasOwnProperty.call(CAPTION_STYLE_PRESETS, presetName)) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --caption-preset: ${presetName}`, {
          fix: 'Use one of: tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke',
        });
      }

      let captionMode: CaptionDisplayMode | undefined;
      if (options.captionMode) {
        const parsed = CaptionDisplayModeSchema.safeParse(String(options.captionMode));
        if (!parsed.success) {
          throw new CMError('INVALID_ARGUMENT', `Invalid --caption-mode: ${options.captionMode}`, {
            fix: 'Use one of: page, single, buildup, chunk',
          });
        }
        captionMode = parsed.data;
      }

      const preset = getCaptionPreset(presetName as CaptionPresetName);
      const captionConfig = CaptionConfigSchema.parse({
        ...preset,
        ...(captionMode ? { displayMode: captionMode } : {}),
      });

      const report = analyzeCaptionChunks(timestamps.allWords, captionConfig);

      await writeOutputFile(options.output, report);
      spinner.succeed('Caption diagnostics complete');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'captions',
            args: {
              timestamps: options.timestamps,
              output: options.output,
              captionPreset: presetName,
              captionMode: captionMode ?? null,
              summary: Boolean(options.summary),
            },
            outputs: {
              reportPath: options.output,
              totalChunks: report.totalChunks,
              fastChunkCount: report.fastChunkCount,
              minDurationMs: report.minDurationMs,
              maxDurationMs: report.maxDurationMs,
              maxCps: report.maxCps,
              maxWpm: report.maxWpm,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(report.fastChunkCount === 0 ? 0 : 1);
      }

      writeStderrLine(
        `Chunks: ${report.totalChunks} | avg ${(report.avgDurationMs / 1000).toFixed(2)}s | min ${(report.minDurationMs / 1000).toFixed(2)}s | max ${(report.maxDurationMs / 1000).toFixed(2)}s`
      );
      writeStderrLine(
        `Fast chunks: ${report.fastChunkCount} | max CPS ${report.maxCps.toFixed(1)} | max WPM ${report.maxWpm.toFixed(0)}`
      );

      if (!options.summary && report.fastChunkCount > 0) {
        writeStderrLine('Fast chunks (first 5):');
        const fastChunks = report.chunks.filter((chunk) => !chunk.meetsMinDuration).slice(0, 5);
        for (const chunk of fastChunks) {
          writeStderrLine(
            `  - [${chunk.index}] ${(chunk.durationMs / 1000).toFixed(2)}s < ${(chunk.requiredMinMs / 1000).toFixed(2)}s: ${chunk.text}`
          );
        }
      }

      writeStderrLine(`Report written to: ${options.output}`);
      process.stdout.write(`${options.output}\n`);
      process.exit(report.fastChunkCount === 0 ? 0 : 1);
    } catch (error) {
      spinner.fail('Caption diagnostics failed');
      handleCommandError(error);
    }
  });
