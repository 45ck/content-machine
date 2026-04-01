/**
 * Classify command - Classify a VideoSpec into a VideoTheme
 *
 * Usage: cm classify --input videospec.v1.json [-o theme.v1.json] [--mode heuristic|llm]
 */
import { Command } from 'commander';
import { SchemaError } from '../../core/errors';
import { logger } from '../../core/logger';
import { VideoSpecV1Schema } from '../../domain';
import { classifyVideoSpec } from '../../videointel/classify';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

interface ClassifyCommandOptions {
  input: string;
  output: string;
  mode: 'heuristic' | 'llm';
}

async function runClassify(
  options: ClassifyCommandOptions,
  spinner: ReturnType<typeof createSpinner>
): Promise<void> {
  const runtime = getCliRuntime();

  const raw = await readInputFile(options.input);
  const parsed = VideoSpecV1Schema.safeParse(raw);
  if (!parsed.success) {
    throw new SchemaError('Invalid VideoSpec file', {
      path: options.input,
      issues: parsed.error.issues,
      fix: 'Generate a VideoSpec via `cm videospec -i <video> -o videospec.v1.json`',
    });
  }

  let llmProvider;
  if (options.mode === 'llm') {
    const { createLLMProvider } = await import('../../core/llm');
    const { loadConfig } = await import('../../core/config');
    const config = await loadConfig();
    llmProvider = createLLMProvider(config.llm.provider, config.llm.model);
  }

  const theme = await classifyVideoSpec(parsed.data, {
    mode: options.mode,
    llmProvider,
    sourceVideospecPath: options.input,
  });

  await writeOutputFile(options.output, theme);
  logger.info({ output: options.output }, 'VideoTheme saved');
  spinner.succeed('Classification complete');

  if (runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'classify',
        args: { input: options.input, output: options.output, mode: options.mode },
        outputs: {
          themePath: options.output,
          archetype: theme.archetype,
          confidence: theme.confidence,
          format: theme.format,
          purpose: theme.purpose,
        },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exitCode = 0;
    return;
  }

  const lines = formatKeyValueRows([
    ['Archetype', `${theme.archetype} (${(theme.archetype_confidence * 100).toFixed(0)}%)`],
    ['Format', theme.format],
    ['Purpose', theme.purpose],
    ['Energy', theme.style.energy],
    ['Confidence', `${(theme.confidence * 100).toFixed(0)}%`],
    ['Method', theme.provenance.method],
    ['Output', options.output],
  ]);
  await writeSummaryCard({
    title: 'Video Theme',
    lines,
    footerLines: [`Next: cm blueprint --input ${options.input} --theme ${options.output}`],
  });

  writeStdoutLine(options.output);
  process.exitCode = 0;
}

export const classifyCommand = new Command('classify')
  .description('Classify a VideoSpec into a VideoTheme (archetype, format, style)')
  .requiredOption('-i, --input <path>', 'Input VideoSpec.v1.json file')
  .option('-o, --output <path>', 'Output VideoTheme.v1.json file', 'theme.v1.json')
  .option('--mode <mode>', 'Classification mode (heuristic or llm)', 'heuristic')
  .action(async (options: ClassifyCommandOptions) => {
    const spinner = createSpinner('Classifying video...').start();
    try {
      await runClassify(options, spinner);
    } catch (error) {
      spinner.fail('Classification failed');
      handleCommandError(error);
    }
  });
