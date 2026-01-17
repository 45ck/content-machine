/**
 * Benchmark command - stress-test + validate scoring on a tiny benchmark pack.
 *
 * Folder layout (default):
 * - bench/pro/*.mp4
 * - bench/our/*.mp4
 * - bench/stress/*.mp4 (auto-generated)
 * - bench/results/report.json
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

interface BenchCommonOptions {
  root?: string;
}

interface BenchGenerateOptions extends BenchCommonOptions {
  ffmpeg?: string;
  ffprobe?: string;
  overwrite?: boolean;
}

interface BenchRunOptions extends BenchCommonOptions {
  output?: string;
  stress?: boolean;
  determinismRuns?: string;
  epsilon?: string;
  captionFps?: string;
  syncFps?: string;
}

export const benchCommand = new Command('bench')
  .description('Benchmark + stress-test the video scoring system')
  .option('--root <dir>', 'Benchmark root directory (default: ./bench)', 'bench');

benchCommand
  .command('generate')
  .description('Generate stress variants from bench/pro videos via ffmpeg')
  .option('--ffmpeg <path>', 'ffmpeg binary (default: ffmpeg)', 'ffmpeg')
  .option('--ffprobe <path>', 'ffprobe binary (default: ffprobe)', 'ffprobe')
  .option('--overwrite', 'Overwrite existing stress videos', false)
  .action(async (options: BenchGenerateOptions, command: Command) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Generating benchmark stress variants...').start();
    try {
      const root = resolve(options.root ?? command.parent?.opts().root ?? 'bench');
      const { generateBenchStressVariants } = await import('../../bench/generate');
      const result = await generateBenchStressVariants({
        rootDir: root,
        ffmpegPath: options.ffmpeg ?? 'ffmpeg',
        ffprobePath: options.ffprobe ?? 'ffprobe',
        overwrite: Boolean(options.overwrite),
      });
      spinner.succeed('Stress variants generated');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'bench:generate',
            args: {
              root,
              ffmpeg: options.ffmpeg ?? 'ffmpeg',
              ffprobe: options.ffprobe ?? 'ffprobe',
              overwrite: Boolean(options.overwrite),
            },
            outputs: result,
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(0);
      }

      writeStderrLine(`Bench root: ${root}`);
      writeStderrLine(`Generated: ${result.generatedCount} video(s)`);
      writeStdoutLine(root);
      process.exit(0);
    } catch (error) {
      spinner.fail('Benchmark stress generation failed');
      handleCommandError(error);
    }
  });

benchCommand
  .command('run')
  .description('Run benchmark checks and write a JSON report')
  .option('-o, --output <path>', 'Output report JSON path (default: bench/results/report.json)')
  .option('--no-stress', 'Skip stress tests (only run separation + determinism)')
  .option('--determinism-runs <n>', 'How many times to re-rate for determinism check', '3')
  .option('--epsilon <n>', 'Allowed score delta for determinism check (0..1)', '0.001')
  .option('--caption-fps <n>', 'OCR FPS for caption-quality scoring', '2')
  .option('--sync-fps <n>', 'OCR FPS for sync scoring (higher = more accurate, slower)', '6')
  .action(async (options: BenchRunOptions, command: Command) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Running benchmark...').start();
    try {
      const root = resolve(options.root ?? command.parent?.opts().root ?? 'bench');
      const reportPath = resolve(options.output ?? resolve(root, 'results', 'report.json'));
      const determinismRuns = Number.parseInt(options.determinismRuns ?? '3', 10);
      const epsilon = Number.parseFloat(options.epsilon ?? '0.001');
      const captionFps = Number.parseInt(options.captionFps ?? '2', 10);
      const syncFps = Number.parseInt(options.syncFps ?? '6', 10);

      const { runBench } = await import('../../bench/run');
      const report = await runBench({
        rootDir: root,
        includeStress: options.stress !== false,
        determinismRuns,
        determinismEpsilon: epsilon,
        captionFps,
        syncFps,
      });

      await writeOutputFile(reportPath, report);
      spinner.succeed('Benchmark complete');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'bench:run',
            args: {
              root,
              output: reportPath,
              includeStress: options.stress !== false,
              determinismRuns,
              epsilon,
              captionFps,
              syncFps,
            },
            outputs: {
              reportPath,
              passed: report.summary.passed,
              proCount: report.summary.proCount,
              ourCount: report.summary.ourCount,
              stressCount: report.summary.stressCount,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(report.summary.passed ? 0 : 1);
      }

      writeStderrLine(`Report: ${reportPath}`);
      writeStderrLine(`Passed: ${report.summary.passed}`);
      writeStderrLine(
        `Videos: pro=${report.summary.proCount} our=${report.summary.ourCount} stress=${report.summary.stressCount}`
      );
      writeStdoutLine(reportPath);
      process.exit(report.summary.passed ? 0 : 1);
    } catch (error) {
      spinner.fail('Benchmark run failed');
      handleCommandError(error);
    }
  });

benchCommand
  .command('baseline')
  .description('Write bench/results/baseline.json from an existing report')
  .option('--from <path>', 'Input report path (default: bench/results/report.json)')
  .option('-o, --output <path>', 'Output baseline path (default: bench/results/baseline.json)')
  .action(
    async (options: { from?: string; output?: string } & BenchCommonOptions, command: Command) => {
      const runtime = getCliRuntime();
      const spinner = createSpinner('Writing benchmark baseline...').start();
      try {
        const root = resolve(options.root ?? command.parent?.opts().root ?? 'bench');
        const fromPath = resolve(options.from ?? resolve(root, 'results', 'report.json'));
        const outPath = resolve(options.output ?? resolve(root, 'results', 'baseline.json'));

        const raw = readFileSync(fromPath, 'utf8');
        const report = JSON.parse(raw) as unknown;
        await writeOutputFile(outPath, report);

        spinner.succeed('Baseline written');

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: 'bench:baseline',
              args: { root, from: fromPath, output: outPath },
              outputs: { baselinePath: outPath },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          process.exit(0);
        }

        writeStderrLine(`Baseline: ${outPath}`);
        writeStdoutLine(outPath);
        process.exit(0);
      } catch (error) {
        spinner.fail('Benchmark baseline failed');
        handleCommandError(error);
      }
    }
  );
