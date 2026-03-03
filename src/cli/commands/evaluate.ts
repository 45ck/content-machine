import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { evaluateVideo } from '../../evaluate/evaluator';
import { evaluateBatch } from '../../evaluate/batch';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { readFileSync } from 'node:fs';
import type { EvaluationCheckResult, EvaluationThresholds, EvaluationMode } from '../../domain';
import { compareReports } from '../../evaluate/compare';

interface EvaluateCommandOptions {
  input?: string;
  script?: string;
  profile: string;
  mode?: string;
  minSync?: string;
  minCaption?: string;
  fast?: boolean;
  skipRate?: boolean;
  skipScore?: boolean;
  skipValidate?: boolean;
  skipCaptionQuality?: boolean;
  skipTemporalQuality?: boolean;
  skipAudioSignal?: boolean;
  skipFreeze?: boolean;
  semanticFidelity?: boolean;
  safety?: boolean;
  batch?: string;
  output: string;
  fps?: string;
  compare?: string;
}

function checkIcon(c: EvaluationCheckResult): string {
  if (c.skipped) return '-';
  return c.passed ? '✓' : '✗';
}

function checkLabel(c: EvaluationCheckResult): string {
  if (c.skipped) return 'SKIP';
  return c.passed ? 'PASS' : 'FAIL';
}

const CHECK_NAMES: Record<string, string> = {
  validate: 'Validate',
  rate: 'Sync Rating',
  captionQuality: 'Caption Quality',
  score: 'Script Score',
  temporalQuality: 'Temporal Quality',
  audioSignal: 'Audio Signal',
  frameBounds: 'Frame Bounds',
  semanticFidelity: 'Semantic Fidelity',
  safety: 'Safety',
  freeze: 'Freeze Detect',
  dnsmos: 'DNSMOS',
  flowConsistency: 'Flow Consistency',
};

export const evaluateCommand = new Command('evaluate')
  .description('Run unified QA evaluation against rendered video(s)')
  .option('-i, --input <videoPath>', 'Path to video file')
  .option('--script <scriptPath>', 'Path to script JSON for scoring')
  .option('--profile <profile>', 'Validation profile (portrait|landscape)', 'portrait')
  .option('--mode <mode>', 'Evaluation mode: fast|balanced|quality (default: balanced)')
  .option('--min-sync <n>', 'Minimum sync rating (0-100)')
  .option('--min-caption <n>', 'Minimum caption overall score (0-1)')
  .option('--fast', 'Fast mode: alias for --mode fast', false)
  .option('--compare <previousReport>', 'Compare against a previous evaluation report')
  .option('--skip-rate', 'Skip sync rating check', false)
  .option('--skip-score', 'Skip script score check', false)
  .option('--skip-validate', 'Skip validation check', false)
  .option('--skip-caption-quality', 'Skip caption quality check', false)
  .option('--skip-temporal-quality', 'Skip temporal quality check', false)
  .option('--skip-audio-signal', 'Skip audio signal check', false)
  .option('--skip-freeze', 'Skip freeze detect check', false)
  .option(
    '--semantic-fidelity',
    'Enable semantic fidelity check (requires --script and CLIP)',
    false
  )
  .option('--safety', 'Enable safety check (requires CLIP)', false)
  .option('--batch <configPath>', 'Batch config JSON (array of {videoPath, scriptPath?})')
  .option('-o, --output <path>', 'Output report file path', 'evaluate.json')
  .option('--fps <n>', 'Frame extraction rate for OCR')
  .action(async (options: EvaluateCommandOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Evaluating...').start();

    try {
      const parsed = parseEvaluateOptions(options);

      if (options.batch) {
        await runBatchEvaluate(options, parsed, spinner, runtime);
        return;
      }

      await runSingleEvaluate(options, parsed, spinner, runtime);
    } catch (error) {
      spinner.fail('Evaluation failed');
      handleCommandError(error);
    }
  });

function parseEvaluateOptions(options: EvaluateCommandOptions) {
  const thresholds: EvaluationThresholds = {
    validateProfile: (options.profile as 'portrait' | 'landscape') ?? 'portrait',
    ...(options.minSync ? { minSyncRating: Number(options.minSync) } : {}),
    ...(options.minCaption ? { minCaptionOverall: Number(options.minCaption) } : {}),
  };

  const mode: EvaluationMode | undefined = options.fast
    ? 'fast'
    : (options.mode as EvaluationMode | undefined);

  const checks: Record<string, boolean | undefined> = {};
  if (options.skipValidate) checks.validate = false;
  if (options.skipRate) checks.rate = false;
  if (options.skipCaptionQuality) checks.captionQuality = false;
  if (options.skipScore) checks.score = false;
  if (options.skipTemporalQuality) checks.temporalQuality = false;
  if (options.skipAudioSignal) checks.audioSignal = false;
  if (options.skipFreeze) checks.freeze = false;
  if (options.semanticFidelity) checks.semanticFidelity = true;
  if (options.safety) checks.safety = true;

  const fps = options.fps ? Number(options.fps) : undefined;

  return { thresholds, mode, checks, fps };
}

async function runBatchEvaluate(
  options: EvaluateCommandOptions,
  parsed: ReturnType<typeof parseEvaluateOptions>,
  spinner: ReturnType<typeof createSpinner>,
  runtime: ReturnType<typeof getCliRuntime>
) {
  if (options.compare)
    writeStderrLine('Warning: --compare is not supported in batch mode, ignoring');
  const batchVideos = JSON.parse(readFileSync(options.batch!, 'utf-8'));
  const batchReport = await evaluateBatch({
    videos: batchVideos,
    profile: (options.profile as 'portrait' | 'landscape') ?? 'portrait',
    thresholds: parsed.thresholds,
    mode: parsed.mode,
    checks: parsed.checks,
    fps: parsed.fps,
  });

  spinner.stop();
  await writeOutputFile(options.output, batchReport);

  if (runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'evaluate',
        args: { batch: options.batch },
        outputs: {
          reportPath: options.output,
          totalPassed: batchReport.totalPassed,
          totalFailed: batchReport.totalFailed,
        },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
  } else {
    writeStderrLine(`Batch: ${batchReport.totalPassed} passed, ${batchReport.totalFailed} failed`);
    writeStdoutLine(options.output);
  }

  process.exit(batchReport.totalFailed > 0 ? 1 : 0);
}

async function runSingleEvaluate(
  options: EvaluateCommandOptions,
  parsed: ReturnType<typeof parseEvaluateOptions>,
  spinner: ReturnType<typeof createSpinner>,
  runtime: ReturnType<typeof getCliRuntime>
) {
  if (!options.input) {
    spinner.fail('No input video specified');
    writeStderrLine('Use -i <videoPath> or --batch <configPath>');
    process.exit(1);
    return;
  }

  const report = await evaluateVideo({
    videoPath: options.input,
    scriptPath: options.script,
    profile: (options.profile as 'portrait' | 'landscape') ?? 'portrait',
    thresholds: parsed.thresholds,
    mode: parsed.mode,
    checks: parsed.checks,
    fps: parsed.fps,
  });

  spinner.stop();
  await writeOutputFile(options.output, report);

  if (runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'evaluate',
        args: { input: options.input, thresholds: parsed.thresholds },
        outputs: {
          reportPath: options.output,
          passed: report.passed,
          checks: report.checks.map((c) => ({
            checkId: c.checkId,
            passed: c.passed,
            skipped: c.skipped,
          })),
        },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exit(report.passed ? 0 : 1);
    return;
  }

  printHumanReadableReport(options, report);
  process.exit(report.passed ? 0 : 1);
}

function printHumanReadableReport(
  options: EvaluateCommandOptions,
  report: Awaited<ReturnType<typeof evaluateVideo>>
) {
  const videoName = options.input!.split('/').pop() ?? options.input!;
  writeStderrLine(`\nEvaluation: ${videoName}\n`);

  for (const c of report.checks) {
    const name = (CHECK_NAMES[c.checkId] ?? c.checkId).padEnd(16);
    const icon = checkIcon(c);
    const label = checkLabel(c);
    const suffix = c.skipped ? `(${c.summary})` : c.error ? `(${c.error})` : `(${c.summary})`;
    writeStderrLine(`${icon} ${name} ${label}  ${suffix}`);
  }

  const activeChecks = report.checks.filter((c) => !c.skipped);
  const passedCount = activeChecks.filter((c) => c.passed).length;
  writeStderrLine(
    `\nOverall: ${report.passed ? 'PASS' : 'FAIL'} (${passedCount}/${activeChecks.length})`
  );
  writeStderrLine(`Report: ${options.output}`);

  if (options.compare) {
    const previousReport = JSON.parse(readFileSync(options.compare, 'utf-8'));
    const comparison = compareReports(previousReport, report);
    writeStderrLine(
      `\nComparison: ${comparison.regressions.length} regression(s), ${comparison.improvements.length} improvement(s), score delta ${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta.toFixed(3)}`
    );
  }

  writeStdoutLine(options.output);
}
