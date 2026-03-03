/**
 * Score command - Proxy scoring + risk gates (Virality Director)
 *
 * Usage: cm score --input script.json --package packaging.json --output score.json
 */
import { Command } from 'commander';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { PackageOutputSchema, ScriptOutputSchema } from '../../domain';
import { scoreScript } from '../../score/scorer';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { CMError } from '../../core/errors';

interface ScoreOptions {
  input: string;
  package?: string;
  output: string;
  minOverall: string;
}

export const scoreCommand = new Command('score')
  .description('Score a script for quality/risk proxies and write score.json')
  .requiredOption('-i, --input <path>', 'Input script.json path')
  .option('--package <path>', 'Optional packaging.json path')
  .option('-o, --output <path>', 'Output score.json path', 'score.json')
  .option('--min-overall <n>', 'Fail if overall score is below this threshold', '0')
  .action(async (options: ScoreOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Scoring...').start();
    try {
      const rawScript = await readInputFile(options.input);
      const script = ScriptOutputSchema.parse(rawScript);

      const packaging = options.package
        ? PackageOutputSchema.parse(await readInputFile(options.package))
        : undefined;

      const score = scoreScript({
        script,
        scriptPath: options.input,
        packaging,
        packagePath: options.package,
      });

      await writeOutputFile(options.output, score);
      spinner.succeed('Score computed');

      const minOverall = Number.parseFloat(options.minOverall);
      if (!Number.isFinite(minOverall) || minOverall < 0 || minOverall > 1) {
        throw new CMError(
          'INVALID_ARGUMENT',
          `Invalid --min-overall value: ${options.minOverall}`,
          {
            fix: 'Use a number between 0 and 1 for --min-overall',
          }
        );
      }

      const passedThreshold = score.passed && score.overall >= minOverall;

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'score',
            args: {
              input: options.input,
              package: options.package ?? null,
              output: options.output,
              minOverall,
            },
            outputs: {
              scorePath: options.output,
              passed: passedThreshold,
              overall: score.overall,
              failedChecks: score.checks.filter((c) => !c.passed).map((c) => c.checkId),
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(passedThreshold ? 0 : 1);
      }

      writeStderrLine(`Score: ${score.overall.toFixed(3)} (passed=${score.passed})`);
      for (const check of score.checks.filter((c) => !c.passed)) {
        writeStderrLine(`- ${check.checkId}: ${check.message}`);
        if (check.fix) writeStderrLine(`  Fix: ${check.fix}`);
      }

      // Human-mode stdout should be reserved for the primary artifact path.
      writeStdoutLine(options.output);
      process.exit(passedThreshold ? 0 : 1);
    } catch (error) {
      spinner.fail('Scoring failed');
      handleCommandError(error);
    }
  });
