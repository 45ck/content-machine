import { Command } from 'commander';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { handleCommandError, writeOutputFile } from '../utils';
import { evaluateVideo } from '../../evaluate/evaluator';
import { scoreQuality } from '../../quality-score/scorer';
import { extractFeatures } from '../../quality-score/feature-extractor';
import type { EvaluationMode, EvaluationThresholds } from '../../domain';

interface QaCommandOptions {
  input: string;
  script?: string;
  profile: 'portrait' | 'landscape';
  mode?: 'fast' | 'balanced' | 'quality';
  minSync?: string;
  minCaption?: string;
  minScore?: string;
  skipScore?: boolean;
  output: string;
  scoreOutput: string;
  fps?: string;
}

export const qaCommand = new Command('qa')
  .description('Run QA gate (evaluate) plus optional quality scoring')
  .requiredOption('-i, --input <videoPath>', 'Path to video file')
  .option('--script <scriptPath>', 'Path to script JSON for scoring/eval')
  .option('--profile <profile>', 'Validation profile (portrait|landscape)', 'portrait')
  .option('--mode <mode>', 'Evaluation mode: fast|balanced|quality (default: balanced)')
  .option('--min-sync <n>', 'Minimum sync rating (0-100)')
  .option('--min-caption <n>', 'Minimum caption overall score (0-1)')
  .option('--min-score <n>', 'Minimum overall quality score (0-100)')
  .option('--skip-score', 'Skip quality-score phase', false)
  .option('--fps <n>', 'Frame extraction rate for OCR')
  .option('-o, --output <path>', 'Output QA gate report path', 'qa.evaluate.json')
  .option('--score-output <path>', 'Output quality score report path', 'qa.score.json')
  .action(async (options: QaCommandOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Running QA...').start();

    try {
      const thresholds: EvaluationThresholds = {
        validateProfile: options.profile,
        ...(options.minSync ? { minSyncRating: Number(options.minSync) } : {}),
        ...(options.minCaption ? { minCaptionOverall: Number(options.minCaption) } : {}),
      };
      const fps = options.fps ? Number(options.fps) : undefined;
      const mode = options.mode as EvaluationMode | undefined;

      spinner.text = 'Running evaluate gate...';
      const evaluateReport = await evaluateVideo({
        videoPath: options.input,
        scriptPath: options.script,
        profile: options.profile,
        thresholds,
        mode,
        checks: {},
        fps,
      });
      await writeOutputFile(options.output, evaluateReport);

      let qualityScoreResult:
        | Awaited<ReturnType<typeof scoreQuality>>
        | null = null;
      if (!options.skipScore) {
        spinner.text = 'Extracting features...';
        const features = await extractFeatures({
          videoPath: options.input,
          scriptPath: options.script,
        });
        spinner.text = 'Computing quality score...';
        qualityScoreResult = await scoreQuality({
          features,
          explain: true,
        });
        await writeOutputFile(options.scoreOutput, qualityScoreResult);
      }

      const minScore = options.minScore ? Number(options.minScore) : undefined;
      const scorePassed =
        minScore == null || qualityScoreResult == null
          ? true
          : qualityScoreResult.score >= minScore;
      const passed = Boolean(evaluateReport.passed && scorePassed);

      spinner.stop();

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'qa',
            args: {
              input: options.input,
              profile: options.profile,
              mode: options.mode ?? 'balanced',
              minSync: options.minSync ?? null,
              minCaption: options.minCaption ?? null,
              minScore: options.minScore ?? null,
              skipScore: Boolean(options.skipScore),
            },
            outputs: {
              passed,
              evaluateReportPath: options.output,
              qualityScorePath: options.skipScore ? null : options.scoreOutput,
              evaluatePassed: evaluateReport.passed,
              qualityScore: qualityScoreResult?.score ?? null,
              qualityLabel: qualityScoreResult?.label ?? null,
              qualityScorePassed: scorePassed,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
      } else {
        writeStderrLine(`QA gate: ${evaluateReport.passed ? 'PASS' : 'FAIL'}`);
        if (qualityScoreResult) {
          writeStderrLine(`Quality score: ${qualityScoreResult.score}/100 (${qualityScoreResult.label})`);
          if (minScore != null) {
            writeStderrLine(`Quality threshold: ${minScore} (${scorePassed ? 'PASS' : 'FAIL'})`);
          }
        } else {
          writeStderrLine('Quality score: skipped');
        }
        writeStderrLine(`Overall: ${passed ? 'PASS' : 'FAIL'}`);
        writeStderrLine(`Evaluate report: ${options.output}`);
        if (!options.skipScore) {
          writeStderrLine(`Score report: ${options.scoreOutput}`);
        }
        writeStdoutLine(options.output);
      }

      process.exit(passed ? 0 : 1);
    } catch (error) {
      spinner.fail('QA failed');
      handleCommandError(error);
    }
  });
