/**
 * Captions command - Analyze caption chunk pacing and readability
 *
 * Usage: cm captions --timestamps timestamps.json --output caption-diagnostics.json
 */
import { Command } from 'commander';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { CMError } from '../../core/errors';
import type { TimestampsOutput } from '../../audio/schema';
import {
  CaptionConfigSchema,
  CaptionDisplayModeSchema,
  type CaptionConfig,
  type CaptionDisplayMode,
} from '../../render/captions/config';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
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
  captionMaxWords?: string;
  captionMinWords?: string;
  captionTargetWords?: string;
  captionMaxWpm?: string;
  captionMaxCps?: string;
  captionMinOnScreenMs?: string;
  captionMinOnScreenMsShort?: string;
  captionDropFillers?: boolean;
  captionFillerWords?: string;
  summary?: boolean;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseWordList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
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
  .option('--caption-max-words <count>', 'Max words per chunk/page')
  .option('--caption-min-words <count>', 'Min words per chunk/page')
  .option('--caption-target-words <count>', 'Target words per chunk (chunk mode)')
  .option('--caption-max-wpm <value>', 'Max words per minute for caption pacing')
  .option('--caption-max-cps <value>', 'Max characters per second for caption pacing')
  .option('--caption-min-on-screen-ms <ms>', 'Minimum on-screen time for captions (ms)')
  .option('--caption-min-on-screen-short-ms <ms>', 'Minimum on-screen time for short captions (ms)')
  .option('--caption-drop-fillers', 'Drop filler words from captions')
  .option('--caption-filler-words <list>', 'Comma-separated filler words/phrases to drop')
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
      const layoutOverride: Partial<CaptionConfig['layout']> = {};

      const maxWords = parseOptionalInt(options.captionMaxWords);
      if (maxWords !== undefined) layoutOverride.maxWordsPerPage = maxWords;
      const minWords = parseOptionalInt(options.captionMinWords);
      if (minWords !== undefined) layoutOverride.minWordsPerPage = minWords;
      const targetWords = parseOptionalInt(options.captionTargetWords);
      if (targetWords !== undefined) layoutOverride.targetWordsPerChunk = targetWords;
      const maxWpm = parseOptionalNumber(options.captionMaxWpm);
      if (maxWpm !== undefined) layoutOverride.maxWordsPerMinute = maxWpm;
      const maxCps = parseOptionalNumber(options.captionMaxCps);
      if (maxCps !== undefined) layoutOverride.maxCharsPerSecond = maxCps;
      const minOnScreenMs = parseOptionalInt(options.captionMinOnScreenMs);
      if (minOnScreenMs !== undefined) layoutOverride.minOnScreenMs = minOnScreenMs;
      const minOnScreenMsShort = parseOptionalInt(options.captionMinOnScreenMsShort);
      if (minOnScreenMsShort !== undefined) {
        layoutOverride.minOnScreenMsShort = minOnScreenMsShort;
      }

      const fillerWords = parseWordList(options.captionFillerWords);
      const dropFillers = Boolean(
        options.captionDropFillers || (fillerWords && fillerWords.length > 0)
      );

      const captionConfig = CaptionConfigSchema.parse({
        ...preset,
        ...(captionMode ? { displayMode: captionMode } : {}),
        ...(Object.keys(layoutOverride).length > 0
          ? { layout: { ...preset.layout, ...layoutOverride } }
          : {}),
        ...(dropFillers
          ? {
              cleanup: {
                dropFillers: true,
                fillerWords: fillerWords ?? [],
              },
            }
          : {}),
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
              captionMaxWords: parseOptionalInt(options.captionMaxWords) ?? null,
              captionMinWords: parseOptionalInt(options.captionMinWords) ?? null,
              captionTargetWords: parseOptionalInt(options.captionTargetWords) ?? null,
              captionMaxWpm: parseOptionalNumber(options.captionMaxWpm) ?? null,
              captionMaxCps: parseOptionalNumber(options.captionMaxCps) ?? null,
              captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs) ?? null,
              captionMinOnScreenMsShort:
                parseOptionalInt(options.captionMinOnScreenMsShort) ?? null,
              captionDropFillers: dropFillers,
              captionFillerWords: fillerWords ?? null,
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
      const lines = formatKeyValueRows([
        ['Chunks', String(report.totalChunks)],
        ['Avg duration', `${(report.avgDurationMs / 1000).toFixed(2)}s`],
        ['Min duration', `${(report.minDurationMs / 1000).toFixed(2)}s`],
        ['Max duration', `${(report.maxDurationMs / 1000).toFixed(2)}s`],
        ['Fast chunks', String(report.fastChunkCount)],
        ['Max CPS', report.maxCps.toFixed(1)],
        ['Max WPM', report.maxWpm.toFixed(0)],
        ['Report', options.output],
      ]);

      if (!options.summary && report.fastChunkCount > 0) {
        const fastChunks = report.chunks.filter((chunk) => !chunk.meetsMinDuration).slice(0, 5);
        lines.push('', 'Fast chunks (first 5):');
        for (const chunk of fastChunks) {
          lines.push(
            `- [${chunk.index}] ${(chunk.durationMs / 1000).toFixed(2)}s < ${(chunk.requiredMinMs / 1000).toFixed(2)}s: ${chunk.text}`
          );
        }
      }

      await writeSummaryCard({
        title: 'Caption diagnostics',
        lines,
        footerLines: [`Next: cm render --timestamps ${options.timestamps}`],
      });
      writeStdoutLine(options.output);
      process.exit(report.fastChunkCount === 0 ? 0 : 1);
    } catch (error) {
      spinner.fail('Caption diagnostics failed');
      handleCommandError(error);
    }
  });
