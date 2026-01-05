/**
 * Visuals command - Find matching stock footage
 * 
 * Usage: cm visuals --input timestamps.json --output visuals.json
 */
import { Command } from 'commander';
import { matchVisuals } from '../../visuals/matcher';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import type { AudioOutput } from '../../audio/schema';
import ora from 'ora';

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script sections')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
  .option('--provider <provider>', 'Stock footage provider', 'pexels')
  .action(async (options) => {
    const spinner = ora('Finding matching visuals...').start();
    
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
      
      // Show summary
      console.log(`\n🎬 Visuals Matched`);
      console.log(`   Clips: ${visuals.clips.length}`);
      console.log(`   Total duration: ${visuals.totalDuration.toFixed(1)}s`);
      console.log(`   Provider: ${options.provider}`);
      console.log(`   Output: ${options.output}\n`);
      
    } catch (error) {
      spinner.fail('Visual matching failed');
      handleCommandError(error);
    }
  });
