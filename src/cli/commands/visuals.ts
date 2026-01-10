/**
 * Visuals command - Find matching stock footage
 *
 * Usage: cm visuals --input timestamps.json --output visuals.json
 * Based on SYSTEM-DESIGN section 7.3 cm visuals command.
 */
import { Command } from 'commander';
import { matchVisuals } from '../../visuals/matcher';
import type { VisualsProgressEvent } from '../../visuals/matcher';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { TimestampsOutputSchema } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { SchemaError } from '../../core/errors';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script scenes')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
  .option('--provider <provider>', 'Stock footage provider', 'pexels')
  .option('--orientation <type>', 'Footage orientation', 'portrait')
  .option('--gameplay <path>', 'Gameplay library directory or clip file path')
  .option('--gameplay-style <name>', 'Gameplay subfolder name (e.g., subway-surfers)')
  .option('--gameplay-strict', 'Fail if gameplay clip is missing')
  .option('--mock', 'Use mock visuals (for testing)', false)
  .action(async (options, command: Command) => {
    const spinner = createSpinner('Finding matching visuals...').start();
    const runtime = getCliRuntime();

    try {
      // Read + validate input timestamps (users commonly pass script.json by mistake)
      const rawTimestamps = await readInputFile(options.input);
      const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
      if (!parsedTimestamps.success) {
        throw new SchemaError('Invalid timestamps file', {
          path: options.input,
          issues: parsedTimestamps.error.issues,
          fix: `Generate timestamps via \`cm audio --input script.json --timestamps ${options.input}\` (or pass the timestamps.json produced by cm audio).`,
        });
      }
      const timestamps = parsedTimestamps.data;

      logger.info({ input: options.input, provider: options.provider }, 'Starting visual matching');

      let lastBucket = -1;
      let lastPhase: string | undefined;
      const onProgress = (event: VisualsProgressEvent): void => {
        if (runtime.json) return;

        const percent = Math.round(event.progress * 100);
        const phase = event.phase;
        const message = event.message;

        if (runtime.isTty) {
          const parts = ['Finding matching visuals...', `${percent}%`];
          if (phase) parts.push(phase);
          if (message) parts.push(message);
          spinner.text = parts.join(' - ');
          return;
        }

        const bucket = Math.floor(percent / 10) * 10;
        if (bucket === lastBucket && phase === lastPhase) return;
        lastBucket = bucket;
        lastPhase = phase;

        const parts = [`Visuals progress: ${percent}%`];
        if (phase) parts.push(phase);
        if (message) parts.push(message);
        writeStderrLine(parts.join(' - '));
      };

      const gameplaySpecified = Boolean(options.gameplay);
      const gameplayStyleSpecified = Boolean(options.gameplayStyle);
      const strictSource = command.getOptionValueSource('gameplayStrict');
      const gameplayStrict =
        strictSource === 'default' ? undefined : Boolean(options.gameplayStrict);
      const gameplayRequested =
        gameplaySpecified || gameplayStyleSpecified || Boolean(gameplayStrict);
      const gameplayRequired = gameplayStrict ?? gameplayRequested;

      const visuals = await matchVisuals({
        timestamps,
        provider: options.provider,
        orientation: options.orientation,
        mock: Boolean(options.mock),
        gameplay: gameplayRequested
          ? {
              library: options.gameplay,
              style: options.gameplayStyle,
              required: gameplayRequired,
            }
          : undefined,
        onProgress,
      });

      spinner.succeed('Visuals matched successfully');

      // Write output
      await writeOutputFile(options.output, visuals);

      logger.info({ output: options.output }, 'Visuals saved');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'visuals',
            args: {
              input: options.input,
              output: options.output,
              provider: options.provider,
              orientation: options.orientation,
              mock: Boolean(options.mock),
              gameplay: options.gameplay ?? null,
              gameplayStyle: options.gameplayStyle ?? null,
              gameplayStrict: Boolean(gameplayRequired),
            },
            outputs: {
              visualsPath: options.output,
              scenes: visuals.scenes.length,
              totalDurationSeconds: visuals.totalDuration ?? null,
              fromStock: visuals.fromStock,
              fallbacks: visuals.fallbacks,
              gameplayClip: visuals.gameplayClip?.path ?? null,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      const rows: Array<[string, string]> = [
        ['Scenes', String(visuals.scenes.length)],
        ['Duration', visuals.totalDuration ? `${visuals.totalDuration.toFixed(1)}s` : 'N/A'],
        ['Provider', options.provider],
        ['From stock', String(visuals.fromStock)],
        ['Fallbacks', String(visuals.fallbacks)],
        ['Visuals', options.output],
      ];
      if (visuals.gameplayClip) {
        rows.push(['Gameplay', visuals.gameplayClip.path]);
      }
      const lines = formatKeyValueRows(rows);
      const footerLines = [];
      if (options.mock) footerLines.push('Mock mode - visuals are placeholders');
      footerLines.push(
        `Next: cm render --input ${options.output} --audio audio.wav --timestamps ${options.input} --output video.mp4${options.mock ? ' --mock' : ''}`
      );
      await writeSummaryCard({ title: 'Visuals ready', lines, footerLines });

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${options.output}\n`);
    } catch (error) {
      spinner.fail('Visual matching failed');
      handleCommandError(error);
    }
  });
