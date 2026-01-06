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
import type { AudioOutput } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script scenes')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
  .option('--provider <provider>', 'Stock footage provider', 'pexels')
  .action(async (options) => {
    const spinner = createSpinner('Finding matching visuals...').start();
    const runtime = getCliRuntime();

    try {
      // Read input timestamps
      const audioOutput = await readInputFile<AudioOutput>(options.input);

      logger.info({ input: options.input, provider: options.provider }, 'Starting visual matching');

      const visuals = await matchVisuals({
        timestamps: audioOutput.timestamps,
        provider: options.provider,
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

      // Show summary
      console.log('\nVisuals Matched');
      console.log(`   Scenes: ${visuals.scenes.length}`);
      console.log(`   Total duration: ${visuals.totalDuration?.toFixed(1) ?? 'N/A'}s`);
      console.log(`   From stock: ${visuals.fromStock}`);
      console.log(`   Fallbacks: ${visuals.fallbacks}`);
      console.log(`   Output: ${options.output}\n`);
    } catch (error) {
      spinner.fail('Visual matching failed');
      handleCommandError(error);
    }
  });
