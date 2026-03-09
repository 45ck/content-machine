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

interface QaExecutionResult {
  evaluateReport: Awaited<ReturnType<typeof evaluateVideo>>;
  qualityScoreResult: Awaited<ReturnType<typeof scoreQuality>> | null;
  scorePassed: boolean;
  passed: boolean;
}

function parseOptionalNumber(name: string, value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name}: expected a number, received "${value}"`);
  }
  return parsed;
}

function parseProfile(value: string): 'portrait' | 'landscape' {
  if (value === 'portrait' || value === 'landscape') return value;
  throw new Error(`Invalid profile: expected "portrait" or "landscape", received "${value}"`);
}

async function runQualityScorePhase(
  options: QaCommandOptions,
  spinner: ReturnType<typeof createSpinner>
): Promise<Awaited<ReturnType<typeof scoreQuality>> | null> {
  if (options.skipScore) return null;

  spinner.text = 'Extracting features...';
  const features = await extractFeatures({
    videoPath: options.input,
    scriptPath: options.script,
  });
  spinner.text = 'Computing quality score...';
  const qualityScoreResult = await scoreQuality({
    features,
    explain: true,
  });
  await writeOutputFile(options.scoreOutput, qualityScoreResult);
  return qualityScoreResult;
}

function buildQaExecutionResult(params: {
  evaluateReport: Awaited<ReturnType<typeof evaluateVideo>>;
  qualityScoreResult: Awaited<ReturnType<typeof scoreQuality>> | null;
  minScore: number | undefined;
}): QaExecutionResult {
  const { evaluateReport, qualityScoreResult, minScore } = params;
  const scorePassed =
    minScore == null || qualityScoreResult == null ? true : qualityScoreResult.score >= minScore;
  return {
    evaluateReport,
    qualityScoreResult,
    scorePassed,
    passed: Boolean(evaluateReport.passed && scorePassed),
  };
}

function writeQaJsonResult(params: {
  options: QaCommandOptions;
  profile: 'portrait' | 'landscape';
  minSync: number | undefined;
  minCaption: number | undefined;
  minScore: number | undefined;
  result: QaExecutionResult;
  runtime: ReturnType<typeof getCliRuntime>;
}): void {
  const { options, profile, minSync, minCaption, minScore, result, runtime } = params;
  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'qa',
      args: {
        input: options.input,
        profile,
        mode: options.mode ?? 'balanced',
        minSync: minSync ?? null,
        minCaption: minCaption ?? null,
        minScore: minScore ?? null,
        skipScore: Boolean(options.skipScore),
      },
      outputs: {
        passed: result.passed,
        evaluateReportPath: options.output,
        qualityScorePath: options.skipScore ? null : options.scoreOutput,
        evaluatePassed: result.evaluateReport.passed,
        qualityScore: result.qualityScoreResult?.score ?? null,
        qualityLabel: result.qualityScoreResult?.label ?? null,
        qualityScorePassed: result.scorePassed,
      },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
}

function writeQaHumanResult(params: {
  options: QaCommandOptions;
  minScore: number | undefined;
  result: QaExecutionResult;
}): void {
  const { options, minScore, result } = params;
  writeStderrLine(`QA gate: ${result.evaluateReport.passed ? 'PASS' : 'FAIL'}`);
  if (result.qualityScoreResult) {
    writeStderrLine(
      `Quality score: ${result.qualityScoreResult.score}/100 (${result.qualityScoreResult.label})`
    );
    if (minScore != null) {
      writeStderrLine(`Quality threshold: ${minScore} (${result.scorePassed ? 'PASS' : 'FAIL'})`);
    }
  } else {
    writeStderrLine('Quality score: skipped');
  }
  writeStderrLine(`Overall: ${result.passed ? 'PASS' : 'FAIL'}`);
  writeStderrLine(`Evaluate report: ${options.output}`);
  for (const check of result.evaluateReport.checks) {
    if (!check.passed && !check.skipped && check.fix) {
      writeStderrLine(`Fix (${check.checkId}): ${check.fix}`);
    }
  }
  if (!options.skipScore) {
    writeStderrLine(`Score report: ${options.scoreOutput}`);
  }
  writeStdoutLine(options.output);
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
      const profile = parseProfile(String(options.profile));
      const minSync = parseOptionalNumber('min-sync', options.minSync);
      const minCaption = parseOptionalNumber('min-caption', options.minCaption);
      const minScore = parseOptionalNumber('min-score', options.minScore);
      const fps = parseOptionalNumber('fps', options.fps);

      const thresholds: EvaluationThresholds = {
        validateProfile: profile,
        ...(minSync != null ? { minSyncRating: minSync } : {}),
        ...(minCaption != null ? { minCaptionOverall: minCaption } : {}),
      };
      const mode = options.mode as EvaluationMode | undefined;

      spinner.text = 'Running evaluate gate...';
      const evaluateReport = await evaluateVideo({
        videoPath: options.input,
        scriptPath: options.script,
        profile,
        thresholds,
        mode,
        checks: {},
        fps,
      });
      await writeOutputFile(options.output, evaluateReport);

      const qualityScoreResult = await runQualityScorePhase(options, spinner);
      const result = buildQaExecutionResult({
        evaluateReport,
        qualityScoreResult,
        minScore,
      });

      spinner.stop();

      if (runtime.json) {
        writeQaJsonResult({
          options,
          profile,
          minSync,
          minCaption,
          minScore,
          result,
          runtime,
        });
      } else {
        writeQaHumanResult({ options, minScore, result });
      }

      process.exit(result.passed ? 0 : 1);
    } catch (error) {
      spinner.fail('QA failed');
      handleCommandError(error);
    }
  });
