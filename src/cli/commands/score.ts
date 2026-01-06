/**
 * Score command - Proxy scoring + risk gates (Virality Director)
 *
 * Usage: cm score --input script.json --package packaging.json --output score.json
 */
import { Command } from 'commander';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import { handleCommandError, writeOutputFile } from '../utils';
import { ScriptOutputSchema } from '../../script/schema';
import { PackageOutputSchema } from '../../package/schema';
import { scoreScript } from '../../score/scorer';

interface ScoreOptions {
  input: string;
  package?: string;
  output: string;
  minOverall: string;
  json: boolean;
}

export const scoreCommand = new Command('score')
  .description('Score a script for quality/risk proxies and write score.json')
  .requiredOption('-i, --input <path>', 'Input script.json path')
  .option('--package <path>', 'Optional packaging.json path')
  .option('-o, --output <path>', 'Output score.json path', 'score.json')
  .option('--min-overall <n>', 'Fail if overall score is below this threshold', '0')
  .option('--json', 'Print score.json to stdout', false)
  .action(async (options: ScoreOptions) => {
    const spinner = ora('Scoring...').start();
    try {
      const rawScript = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
      const script = ScriptOutputSchema.parse(rawScript);

      const packaging = options.package
        ? PackageOutputSchema.parse(JSON.parse(await readFile(options.package, 'utf8')) as unknown)
        : undefined;

      const score = scoreScript({
        script,
        scriptPath: options.input,
        packaging,
        packagePath: options.package,
      });

      await writeOutputFile(options.output, score);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(score, null, 2));
        return;
      }

      console.log(`\nScore: ${score.overall.toFixed(3)} (passed=${score.passed})`);
      for (const check of score.checks.filter((c) => !c.passed)) {
        console.log(`- ${check.checkId}: ${check.message}`);
        if (check.fix) console.log(`  Fix: ${check.fix}`);
      }
      console.log(`\nOutput: ${options.output}\n`);

      const minOverall = Number.parseFloat(options.minOverall);
      if (!Number.isFinite(minOverall) || minOverall < 0 || minOverall > 1) {
        throw new Error(`Invalid --min-overall value: ${options.minOverall}`);
      }

      if (!score.passed || score.overall < minOverall) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Scoring failed');
      handleCommandError(error);
    }
  });

