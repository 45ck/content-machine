/**
 * Extract Features command — produce feature vectors for quality scoring.
 *
 * Usage:
 *   cm extract-features -i video.mp4 [-o features.json]
 *   cm extract-features --batch videos/ [-o features-dir/]
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';

interface ExtractFeaturesCommandOptions {
  input?: string;
  script?: string;
  batch?: string;
  clip?: boolean;
  text?: boolean;
  output: string;
}

/** CLI command for extracting feature vectors from videos. */
export const extractFeaturesCommand = new Command('extract-features')
  .description('Extract feature vectors for quality scoring')
  .option('-i, --input <videoPath>', 'Path to video file')
  .option('--script <scriptPath>', 'Path to script JSON')
  .option('--batch <dir>', 'Directory of video files for batch extraction')
  .option('--clip', 'Include CLIP frame embeddings', false)
  .option('--text', 'Include DistilBERT text embeddings', false)
  .option('-o, --output <path>', 'Output path (file or directory for batch)', 'features.json')
  .action(async (options: ExtractFeaturesCommandOptions) => {
    const runtime = getCliRuntime();

    if (options.batch) {
      await runBatchExtraction(options, runtime);
      return;
    }

    await runSingleExtraction(options, runtime);
  });

async function runSingleExtraction(
  options: ExtractFeaturesCommandOptions,
  runtime: ReturnType<typeof getCliRuntime>
) {
  const spinner = createSpinner('Extracting features...').start();

  try {
    if (!options.input) {
      spinner.fail('No input video specified');
      writeStderrLine('Use -i <videoPath> or --batch <dir>');
      process.exit(1);
      return;
    }

    const { extractFeatures } = await import('../../quality-score/feature-extractor');
    const features = await extractFeatures({
      videoPath: options.input,
      scriptPath: options.script,
      includeClip: options.clip,
      includeText: options.text,
    });

    await writeOutputFile(options.output, features);
    spinner.succeed(`Features extracted: ${options.output}`);

    if (runtime.json) {
      writeJsonEnvelope(
        buildJsonEnvelope({
          command: 'extract-features',
          args: { input: options.input },
          outputs: { featuresPath: options.output, videoId: features.videoId },
          timingsMs: Date.now() - runtime.startTime,
        })
      );
    } else {
      writeStdoutLine(options.output);
    }
  } catch (error) {
    spinner.fail('Feature extraction failed');
    handleCommandError(error);
  }
}

async function runBatchExtraction(
  options: ExtractFeaturesCommandOptions,
  runtime: ReturnType<typeof getCliRuntime>
) {
  const spinner = createSpinner('Batch extracting features...').start();

  try {
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { mkdir } = await import('node:fs/promises');
    const { extractFeatures } = await import('../../quality-score/feature-extractor');

    const dir = options.batch!;
    const files = readdirSync(dir).filter((f) => /\.(mp4|mov|avi|mkv|webm)$/i.test(f));

    if (files.length === 0) {
      spinner.fail('No video files found in directory');
      process.exit(1);
      return;
    }

    await mkdir(options.output, { recursive: true });

    let completed = 0;
    for (const file of files) {
      spinner.text = `Extracting [${completed + 1}/${files.length}] ${file}`;
      const videoPath = join(dir, file);
      const outPath = join(options.output, file.replace(/\.[^.]+$/, '.json'));

      const features = await extractFeatures({
        videoPath,
        includeClip: options.clip,
        includeText: options.text,
      });

      const { writeOutputFile: writeOut } = await import('../utils');
      await writeOut(outPath, features);
      completed++;
    }

    spinner.succeed(`Extracted features for ${completed} videos`);

    if (runtime.json) {
      writeJsonEnvelope(
        buildJsonEnvelope({
          command: 'extract-features',
          args: { batch: dir },
          outputs: { outputDir: options.output, totalExtracted: completed },
          timingsMs: Date.now() - runtime.startTime,
        })
      );
    } else {
      writeStderrLine(`Output: ${options.output}/`);
      writeStdoutLine(options.output);
    }
  } catch (error) {
    spinner.fail('Batch extraction failed');
    handleCommandError(error);
  }
}
