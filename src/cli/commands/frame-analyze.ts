import { Command } from 'commander';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { handleCommandError } from '../utils';
import { CMError } from '../../core/errors';
import { analyzeVideoFrames } from '../../analysis/frame-analysis';

type Mode = 'fps' | 'shots' | 'both';

type AnalyzeOptions = {
  output: string;
  fps: string;
  segments: string;
  shots: string;
  mode: Mode;
};

export const frameAnalyzeCommand = new Command('frame-analyze')
  .description(
    'Extract review frames from a video (max 1 fps) and split timeline into segments for repeatable analysis'
  )
  .argument('<video>', 'Input video path')
  .option('-o, --output <dir>', 'Output root directory', 'output/analysis')
  .option('--mode <mode>', 'Extraction mode: fps | shots | both', 'both')
  .option('--fps <value>', 'Frames per second to extract (max 1.0)', '1')
  .option('--shots <count>', 'Number of evenly spaced shots', '30')
  .option('--segments <count>', 'Number of timeline segments', '5')
  .action(async (video: string, options: AnalyzeOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Analyzing frames...').start();

    try {
      const modeRaw = String(options.mode ?? 'both').toLowerCase();
      if (modeRaw !== 'fps' && modeRaw !== 'shots' && modeRaw !== 'both') {
        throw new CMError('INVALID_ARGUMENT', `Invalid --mode value: ${options.mode}`, {
          fix: 'Use --mode fps, --mode shots, or --mode both',
        });
      }
      const mode = modeRaw as Mode;
      const fps = Number.parseFloat(String(options.fps ?? '1'));
      if (!Number.isFinite(fps) || fps <= 0 || fps > 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --fps value: ${options.fps}`, {
          fix: 'Use a number > 0 and <= 1 for --fps',
        });
      }
      const shots = Number.parseInt(String(options.shots ?? '30'), 10);
      if (!Number.isFinite(shots) || shots < 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --shots value: ${options.shots}`, {
          fix: 'Use an integer >= 1 for --shots',
        });
      }
      const segments = Number.parseInt(String(options.segments ?? '5'), 10);
      if (!Number.isFinite(segments) || segments < 1) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --segments value: ${options.segments}`, {
          fix: 'Use an integer >= 1 for --segments',
        });
      }

      const { manifestPath, manifest } = await analyzeVideoFrames({
        inputVideo: video,
        outputRootDir: options.output,
        mode,
        fps,
        shots,
        segments,
      });

      spinner.succeed('Frame analysis complete');
      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'frame-analyze',
            args: { video: manifest.inputVideo, mode, fps, shots, segments },
            outputs: {
              manifestPath,
              fpsFrameCount: manifest.fpsFrames.length,
              shotFrameCount: manifest.shotFrames.length,
              outputRoot: manifest.outputs.root,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
      } else {
        writeStderrLine(`Duration: ${manifest.durationSec.toFixed(2)}s`);
        writeStderrLine(`Segments: ${segments}`);
        writeStderrLine(`FPS frames: ${manifest.fpsFrames.length}`);
        writeStderrLine(`Shot frames: ${manifest.shotFrames.length}`);
        writeStderrLine(`Manifest: ${manifestPath}`);
        writeStdoutLine(manifestPath);
      }
    } catch (error) {
      spinner.fail('Frame analysis failed');
      handleCommandError(error);
    }
  });
