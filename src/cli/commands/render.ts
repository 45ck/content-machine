/**
 * Render command - Render final video with Remotion
 *
 * Usage: cm render --input visuals.json --audio audio.wav --output video.mp4
 */
import { Command } from 'commander';
import { renderVideo } from '../../render/service';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import type { VisualsOutput } from '../../visuals/schema';
import type { AudioOutput } from '../../audio/schema';
import ora from 'ora';

export const renderCommand = new Command('render')
  .description('Render final video with Remotion')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .requiredOption('--audio <path>', 'Audio file path')
  .option('--timestamps <path>', 'Timestamps JSON file', 'timestamps.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .action(async (options) => {
    const spinner = ora('Rendering video...').start();

    try {
      // Read input files
      const visuals = await readInputFile<VisualsOutput>(options.input);
      const audioOutput = await readInputFile<AudioOutput>(options.timestamps);

      logger.info(
        {
          input: options.input,
          audio: options.audio,
          output: options.output,
        },
        'Starting video render'
      );

      const result = await renderVideo({
        visuals,
        timestamps: audioOutput.timestamps,
        audioPath: options.audio,
        outputPath: options.output,
        orientation: options.orientation,
        fps: parseInt(options.fps, 10),
      });

      spinner.succeed('Video rendered successfully');

      logger.info(
        {
          output: result.outputPath,
          duration: result.duration,
          size: result.fileSize,
        },
        'Video saved'
      );

      // Show summary
      console.log(`\n🎬 Video Rendered`);
      console.log(`   Duration: ${result.duration.toFixed(1)}s`);
      console.log(`   Resolution: ${result.width}x${result.height}`);
      console.log(`   Size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
      console.log(`   Output: ${result.outputPath}\n`);
    } catch (error) {
      spinner.fail('Video render failed');
      handleCommandError(error);
    }
  });
