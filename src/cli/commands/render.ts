/**
 * Render command - Render final video with Remotion
 *
 * Usage: cm render --input visuals.json --audio audio.wav --output video.mp4
 */
import { Command } from 'commander';
import { renderVideo } from '../../render/service';
import type { RenderProgressEvent } from '../../render/service';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import type { VisualsOutput } from '../../visuals/schema';
import type { TimestampsOutput } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';

export const renderCommand = new Command('render')
  .description('Render final video with Remotion')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .requiredOption('--audio <path>', 'Audio file path')
  .option('--timestamps <path>', 'Timestamps JSON file', 'timestamps.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option('--mock', 'Use mock renderer (for testing)', false)
  // eslint-disable-next-line max-lines-per-function -- render logic is cohesive, refactor pending
  .action(async (options) => {
    const spinner = createSpinner('Rendering video...').start();
    const runtime = getCliRuntime();

    try {
      // Read input files
      const visuals = await readInputFile<VisualsOutput>(options.input);
      const timestamps = await readInputFile<TimestampsOutput>(options.timestamps);

      logger.info(
        {
          input: options.input,
          audio: options.audio,
          output: options.output,
        },
        'Starting video render'
      );

      let lastBucket = -1;
      let lastPhase: string | undefined;
      const onProgress = (event: RenderProgressEvent): void => {
        if (runtime.json) return;

        const phase = event.phase;
        const phaseProgress = Math.min(1, Math.max(0, event.progress ?? 0));
        const overall =
          phase === 'bundle'
            ? phaseProgress * 0.2
            : phase === 'select-composition'
              ? 0.2 + phaseProgress * 0.05
              : phase === 'render-media'
                ? 0.25 + phaseProgress * 0.75
                : phaseProgress;
        const percent = Math.round(overall * 100);

        if (runtime.isTty) {
          const parts = ['Rendering video...', `${percent}%`, phase];
          if (event.message) parts.push(event.message);
          spinner.text = parts.filter(Boolean).join(' - ');
          return;
        }

        const bucket = Math.floor(percent / 10) * 10;
        if (bucket === lastBucket && phase === lastPhase) return;
        lastBucket = bucket;
        lastPhase = phase;

        const parts = [`Render progress: ${percent}%`, phase];
        if (event.message) parts.push(event.message);
        writeStderrLine(parts.filter(Boolean).join(' - '));
      };

      const result = await renderVideo({
        visuals,
        timestamps,
        audioPath: options.audio,
        outputPath: options.output,
        orientation: options.orientation,
        fps: parseInt(options.fps, 10),
        mock: Boolean(options.mock),
        onProgress,
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

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'render',
            args: {
              input: options.input,
              audio: options.audio,
              timestamps: options.timestamps,
              output: options.output,
              orientation: options.orientation,
              fps: options.fps,
              mock: Boolean(options.mock),
            },
            outputs: {
              videoPath: result.outputPath,
              durationSeconds: result.duration,
              width: result.width,
              height: result.height,
              fps: result.fps,
              fileSizeBytes: result.fileSize,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(
        `Video: ${result.duration.toFixed(1)}s, ${result.width}x${result.height}, ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`
      );
      if (options.mock) writeStderrLine('   Mock mode - video is a placeholder file');

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${result.outputPath}\n`);
    } catch (error) {
      spinner.fail('Video render failed');
      handleCommandError(error);
    }
  });
