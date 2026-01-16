/**
 * Package command - Generate packaging variants from a topic
 *
 * Usage: cm package "Redis vs PostgreSQL for caching" --platform tiktok --output packaging.json
 */
import { Command } from 'commander';
import { generatePackage } from '../../package/generator';
import { PlatformEnum, type Platform } from '../../domain';
import { logger } from '../../core/logger';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { CMError } from '../../core/errors';

interface PackageCommandOptions {
  platform: string;
  variants: string;
  select?: string;
  output: string;
  dryRun?: boolean;
  mock?: boolean;
}

function parseVariants(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function parseSelect(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function createMockPackagingProvider(topic: string): FakeLLMProvider {
  const llmProvider = new FakeLLMProvider();
  llmProvider.queueJsonResponse({
    variants: [
      {
        title: `Stop doing ${topic} like this`,
        coverText: topic.split(/\s+/).slice(0, 3).join(' '),
        onScreenHook: "You're doing it wrong",
        angle: 'Provocative correction hook',
      },
      {
        title: `${topic}: the simple rule that saves you hours`,
        coverText: 'The simple rule',
        onScreenHook: 'Try this today',
        angle: 'Benefit-first',
      },
      {
        title: `Most people misunderstand ${topic}`,
        coverText: 'Most people miss',
        onScreenHook: "Here's why",
        angle: 'Curiosity gap',
      },
      {
        title: `${topic} in 60 seconds`,
        coverText: 'In 60 seconds',
        onScreenHook: 'Watch this',
        angle: 'Speed promise',
      },
      {
        title: `The ${topic} mistake costing you performance`,
        coverText: 'Costly mistake',
        onScreenHook: 'Fix this now',
        angle: 'Pain point',
      },
    ],
    reasoning: 'Mock packaging for testing.',
  });
  return llmProvider;
}

function writeDryRun(topic: string, platform: string, variants: number, output: string): void {
  writeStderrLine('Dry-run mode - no LLM call made');
  writeStderrLine(`   Topic: ${topic}`);
  writeStderrLine(`   Platform: ${platform}`);
  writeStderrLine(`   Variants: ${variants}`);
  writeStderrLine(`   Output: ${output}`);
}

function parsePackageInputs(options: PackageCommandOptions): {
  platform: Platform;
  variants: number;
  select: number | null;
} {
  const platform = PlatformEnum.parse(options.platform);
  const variants = parseVariants(options.variants);
  const select = parseSelect(options.select);
  if (select !== null && (!Number.isFinite(select) || select <= 0)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --select value: ${options.select}`, {
      fix: 'Use a positive integer for --select (1-based), e.g. --select 2',
    });
  }
  return { platform, variants, select };
}

function writeDryRunJson(params: {
  topic: string;
  platform: string;
  variants: number;
  select: number | null;
  output: string;
  runtime: ReturnType<typeof getCliRuntime>;
}): void {
  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'package',
      args: {
        topic: params.topic,
        platform: params.platform,
        variants: params.variants,
        select: params.select ?? null,
        output: params.output,
        dryRun: true,
      },
      outputs: { dryRun: true },
      timingsMs: Date.now() - params.runtime.startTime,
    })
  );
}

function writePackageJsonResult(params: {
  topic: string;
  options: PackageCommandOptions;
  variants: number;
  platform: string;
  result: Awaited<ReturnType<typeof generatePackage>>;
  runtime: ReturnType<typeof getCliRuntime>;
}): void {
  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'package',
      args: {
        topic: params.topic,
        platform: params.platform,
        variants: params.variants,
        select: params.options.select ?? null,
        output: params.options.output,
        mock: Boolean(params.options.mock),
      },
      outputs: {
        packagingPath: params.options.output,
        selectedTitle: params.result.selected.title,
        selectedIndex: params.result.selectedIndex,
        variants: params.result.variants.length,
      },
      timingsMs: Date.now() - params.runtime.startTime,
    })
  );
}

function writePackageSummary(params: {
  topic: string;
  options: PackageCommandOptions;
  result: Awaited<ReturnType<typeof generatePackage>>;
}): void {
  const { topic, options, result } = params;
  writeStderrLine(`Packaging: ${result.selected.title}`);
  writeStderrLine(`   Topic: ${result.topic}`);
  writeStderrLine(`   Platform: ${result.platform}`);
  writeStderrLine(`   Variants: ${result.variants.length}`);
  writeStderrLine(`   Selected: ${result.selectedIndex + 1}/${result.variants.length}`);
  if (options.mock) writeStderrLine('   Mock mode - packaging is for testing only');
  writeStderrLine(
    `Next: cm script --topic "${topic}" --package ${options.output}${options.mock ? ' --mock' : ''}`
  );
}

async function runPackage(topic: string, options: PackageCommandOptions): Promise<void> {
  const spinner = createSpinner('Generating packaging...').start();
  const runtime = getCliRuntime();

  try {
    const { platform, variants, select } = parsePackageInputs(options);

    if (options.dryRun) {
      spinner.stop();
      if (runtime.json) {
        writeDryRunJson({
          topic,
          platform,
          variants,
          select,
          output: options.output,
          runtime,
        });
        return;
      }
      writeDryRun(topic, platform, variants, options.output);
      return;
    }

    logger.info({ topic, platform, variants }, 'Starting packaging generation');

    const llmProvider = options.mock ? createMockPackagingProvider(topic) : undefined;
    if (options.mock) {
      spinner.text = 'Generating packaging (mock mode)...';
    }

    const result = await generatePackage({
      topic,
      platform,
      variants,
      llmProvider,
    });

    if (select !== null) {
      const index = select - 1;
      if (index < 0 || index >= result.variants.length) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --select value: ${select}`, {
          fix: `Use a value between 1 and ${result.variants.length} for --select`,
        });
      }
      result.selectedIndex = index;
      result.selected = result.variants[index];
    }

    spinner.succeed('Packaging generated successfully');
    await writeOutputFile(options.output, result);

    if (runtime.json) {
      writePackageJsonResult({ topic, options, variants, platform, result, runtime });
      return;
    }

    writePackageSummary({ topic, options, result });

    // Human-mode stdout should be reserved for the primary artifact path.
    writeStdoutLine(options.output);
  } catch (error) {
    spinner.fail('Packaging generation failed');
    handleCommandError(error);
  }
}

export const packageCommand = new Command('package')
  .description('Generate title/cover packaging variants for a topic')
  .argument('<topic>', 'Topic for the video')
  .option('--platform <platform>', 'Target platform (tiktok, reels, shorts)', 'tiktok')
  .option('--variants <count>', 'Number of variants to generate', '5')
  .option('--select <n>', 'Select which variant becomes selected (1-based index)')
  .option('-o, --output <path>', 'Output file path', 'packaging.json')
  .option('--dry-run', 'Preview without calling LLM')
  .option('--mock', 'Use mock LLM provider (for testing)')
  .action(async (topic: string, options: PackageCommandOptions) => {
    await runPackage(topic, options);
  });
