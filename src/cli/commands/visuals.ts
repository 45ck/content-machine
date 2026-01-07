/**
 * Visuals command - Find matching stock footage
 *
 * Usage: cm visuals --input timestamps.json --output visuals.json
 * Based on SYSTEM-DESIGN section 7.3 cm visuals command.
 */
import { Command } from 'commander';
import { matchVisuals } from '../../visuals/matcher';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import type { TimestampsOutput } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script scenes')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
  .option('--provider <provider>', 'Stock footage provider', 'pexels')
  .option('--orientation <type>', 'Footage orientation', 'portrait')
  .option('--mock', 'Use mock visuals (for testing)', false)
  .action(async (options) => {
    const spinner = createSpinner('Finding matching visuals...').start();
    const runtime = getCliRuntime();

    try {
      // Read input timestamps
      const timestamps = await readInputFile<TimestampsOutput>(options.input);

      logger.info({ input: options.input, provider: options.provider }, 'Starting visual matching');

      const visuals = await matchVisuals({
        timestamps,
        provider: options.provider,
        orientation: options.orientation,
        mock: Boolean(options.mock),
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
            },
            outputs: {
              visualsPath: options.output,
              scenes: visuals.scenes.length,
              totalDurationSeconds: visuals.totalDuration ?? null,
              fromStock: visuals.fromStock,
              fallbacks: visuals.fallbacks,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(`Visuals: ${visuals.scenes.length} scenes`);
      writeStderrLine(`   Total duration: ${visuals.totalDuration?.toFixed(1) ?? 'N/A'}s`);
      writeStderrLine(`   From stock: ${visuals.fromStock}`);
      writeStderrLine(`   Fallbacks: ${visuals.fallbacks}`);
      if (options.mock) writeStderrLine('   Mock mode - visuals are placeholders');

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${options.output}\n`);
    } catch (error) {
      spinner.fail('Visual matching failed');
      handleCommandError(error);
    }
  });
