/**
 * Quality Score command — score a video for overall quality (0-100).
 *
 * Usage:
 *   cm quality-score -i video.mp4 [--script script.json] [--model model.onnx]
 *   cm quality-score -i video.mp4 --heuristic --explain
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';

interface QualityScoreCommandOptions {
  input: string;
  script?: string;
  model?: string;
  heuristic?: boolean;
  explain?: boolean;
  clip?: boolean;
  text?: boolean;
  output: string;
}

/** CLI command for scoring video quality 0-100. */
export const qualityScoreCommand = new Command('quality-score')
  .description('Score a video for overall quality (0-100)')
  .requiredOption('-i, --input <videoPath>', 'Path to video file')
  .option('--script <scriptPath>', 'Path to script JSON for scoring')
  .option('--model <path>', 'Path to ONNX model file')
  .option('--heuristic', 'Force heuristic mode (skip ML model)', false)
  .option('--explain', 'Include top contributing features in output', false)
  .option('--clip', 'Include CLIP frame embeddings', false)
  .option('--text', 'Include DistilBERT text embeddings', false)
  .option('-o, --output <path>', 'Output JSON path', 'quality-score.json')
  .action(async (options: QualityScoreCommandOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Scoring video quality...').start();

    try {
      const { extractFeatures } = await import('../../quality-score/feature-extractor');
      const { scoreQuality } = await import('../../quality-score/scorer');

      spinner.text = 'Extracting features...';
      const features = await extractFeatures({
        videoPath: options.input,
        scriptPath: options.script,
        includeClip: options.clip,
        includeText: options.text,
      });

      spinner.text = 'Computing quality score...';
      const result = await scoreQuality({
        features,
        modelPath: options.model,
        heuristic: options.heuristic,
        explain: options.explain,
      });

      const output = {
        ...result,
        features: { videoId: features.videoId, version: features.version },
      };
      await writeOutputFile(options.output, output);
      spinner.succeed(`Quality score: ${result.score}/100 (${result.label})`);

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'quality-score',
            args: { input: options.input },
            outputs: {
              scorePath: options.output,
              score: result.score,
              label: result.label,
              method: result.method,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
      } else {
        writeStderrLine(`Method: ${result.method} (${result.modelVersion})`);
        if (result.topFactors.length > 0) {
          writeStderrLine('\nTop factors:');
          for (const f of result.topFactors) {
            const arrow = f.direction === 'positive' ? '+' : '-';
            writeStderrLine(`  ${arrow} ${f.feature}: ${f.impact}`);
          }
        }
        writeStdoutLine(options.output);
      }

      process.exit(0);
    } catch (error) {
      spinner.fail('Quality scoring failed');
      handleCommandError(error);
    }
  });
