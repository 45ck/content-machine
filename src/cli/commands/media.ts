import { Command } from 'commander';
import { join } from 'node:path';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { VisualsOutputSchema } from '../../domain';
import { synthesizeMediaManifest } from '../../media/service';

const DEFAULT_MEDIA_MANIFEST = 'media-manifest.json';

export const mediaCommand = new Command('media')
  .description('Create media synthesis artifacts from visuals (video-to-image keyframes)')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .option('-o, --output <path>', 'Output media manifest path', DEFAULT_MEDIA_MANIFEST)
  .option('--media-dir <path>', 'Directory for generated media artifacts', 'media')
  .option('--ffmpeg <path>', 'ffmpeg executable path', 'ffmpeg')
  .option('--no-keyframes', 'Disable keyframe extraction (manifest only)')
  .option('--no-synthesize-motion', 'Disable image-to-video synthesis for depthflow/veo scenes')
  .option(
    '--depthflow-adapter <id>',
    'Adapter id for depthflow image-to-video synthesis',
    'static-video'
  )
  .option('--veo-adapter <id>', 'Adapter id for veo image-to-video synthesis', 'static-video')
  .action(async (options) => {
    const spinner = createSpinner('Synthesizing media...').start();
    const runtime = getCliRuntime();

    try {
      const rawVisuals = await readInputFile(options.input);
      const visuals = VisualsOutputSchema.parse(rawVisuals);
      const mediaDir = join(options.mediaDir);

      const manifest = await synthesizeMediaManifest({
        visuals,
        outputDir: mediaDir,
        extractVideoKeyframes: Boolean(options.keyframes),
        synthesizeImageMotion: Boolean(options.synthesizeMotion),
        ffmpegPath: options.ffmpeg,
        adapterByMotionStrategy: {
          depthflow: options.depthflowAdapter,
          veo: options.veoAdapter,
        },
      });

      await writeOutputFile(options.output, manifest);
      spinner.succeed('Media synthesis complete');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'media',
            args: {
              input: options.input,
              output: options.output,
              mediaDir,
              ffmpeg: options.ffmpeg,
              keyframes: Boolean(options.keyframes),
              synthesizeMotion: Boolean(options.synthesizeMotion),
              depthflowAdapter: options.depthflowAdapter,
              veoAdapter: options.veoAdapter,
            },
            outputs: {
              mediaManifestPath: options.output,
              totalScenes: manifest.totalScenes,
              keyframesExtracted: manifest.keyframesExtracted,
              videosSynthesized: manifest.videosSynthesized,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      const failed = manifest.scenes.filter((scene) => scene.status === 'failed').length;
      const rows = formatKeyValueRows([
        ['Scenes', String(manifest.totalScenes)],
        ['Keyframes', String(manifest.keyframesExtracted)],
        ['Synthesized', String(manifest.videosSynthesized)],
        ['Failed', String(failed)],
        ['Manifest', options.output],
      ]);
      await writeSummaryCard({
        title: 'Media ready',
        lines: rows,
        footerLines: [
          `Next: cm render --input visuals.json --audio audio.wav --timestamps timestamps.json`,
        ],
      });

      writeStdoutLine(options.output);
    } catch (error) {
      spinner.fail('Media synthesis failed');
      handleCommandError(error);
    }
  });
