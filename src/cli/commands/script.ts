/**
 * Script command - Generate script from topic
 *
 * Usage: cm script --topic "Redis vs PostgreSQL" --archetype versus
 * Based on SYSTEM-DESIGN §7.1 cm script command.
 */
import { Command } from 'commander';
import { ArchetypeEnum } from '../../core/config';
import { CMError, SchemaError } from '../../core/errors';
import { logger } from '../../core/logger';
import { PackageOutputSchema } from '../../package/schema';
import { ResearchOutputSchema } from '../../research/schema';
import type { ResearchOutput } from '../../research/schema';
import { generateScript } from '../../script/generator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import type { SpinnerLike } from '../progress';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

interface PackagingInput {
  title: string;
  coverText: string;
  onScreenHook: string;
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse(createMockScriptResponse(topic));
  return provider;
}

async function loadPackaging(path?: string): Promise<PackagingInput | undefined> {
  if (!path) return undefined;

  const raw = await readInputFile(path);
  const parsed = PackageOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SchemaError('Invalid packaging file', {
      path,
      issues: parsed.error.issues,
      fix: 'Generate packaging via `cm package "<topic>" -o packaging.json` and pass --package packaging.json',
    });
  }

  return parsed.data.selected;
}

interface ScriptCommandOptions {
  topic: string;
  archetype: string;
  output: string;
  package?: string;
  research?: string;
  duration: string;
  dryRun?: boolean;
  mock?: boolean;
}

async function loadResearch(path?: string): Promise<ResearchOutput | undefined> {
  if (!path) return undefined;

  const raw = await readInputFile(path);
  const parsed = ResearchOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SchemaError('Invalid research file', {
      path,
      issues: parsed.error.issues,
      fix: 'Generate research via `cm research -q "<topic>" -o research.json` and pass --research research.json',
    });
  }

  return parsed.data;
}

function writeDryRunOutput(params: {
  options: ScriptCommandOptions;
  archetype: string;
  durationSeconds: number;
  runtime: ReturnType<typeof getCliRuntime>;
}): void {
  const { options, archetype, durationSeconds, runtime } = params;

  if (runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'script',
        args: {
          topic: options.topic,
          archetype,
          durationSeconds: options.duration,
          output: options.output,
          package: options.package ?? null,
          research: options.research ?? null,
          dryRun: true,
        },
        outputs: { dryRun: true },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exit(0);
    return;
  }

  writeStderrLine('Dry-run mode - no LLM call made');
  writeStderrLine(`   Topic: ${options.topic}`);
  writeStderrLine(`   Archetype: ${archetype}`);
  writeStderrLine(`   Duration: ${durationSeconds}s`);
  writeStderrLine(`   Output: ${options.output}`);
  if (options.package) writeStderrLine(`   Package: ${options.package}`);
  if (options.research) writeStderrLine(`   Research: ${options.research}`);
  writeStderrLine(`Prompt would use ~${Math.round(durationSeconds * 2.5)} target words`);
  process.exit(0);
}

function writeSuccessJsonOutput(params: {
  options: ScriptCommandOptions;
  archetype: string;
  runtime: ReturnType<typeof getCliRuntime>;
  script: Awaited<ReturnType<typeof generateScript>>;
}): void {
  const { options, archetype, runtime, script } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'script',
      args: {
        topic: options.topic,
        archetype,
        durationSeconds: options.duration,
        output: options.output,
        package: options.package ?? null,
        research: options.research ?? null,
        mock: Boolean(options.mock),
      },
      outputs: {
        scriptPath: options.output,
        title: script.title ?? options.topic,
        scenes: script.scenes.length,
        wordCount: script.meta?.wordCount ?? null,
      },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

async function writeSuccessTextOutput(params: {
  options: ScriptCommandOptions;
  archetype: string;
  script: Awaited<ReturnType<typeof generateScript>>;
}): Promise<void> {
  const { options, archetype, script } = params;

  const lines = formatKeyValueRows([
    ['Title', script.title ?? options.topic],
    ['Archetype', archetype],
    ['Scenes', String(script.scenes.length)],
    ['Word count', script.meta?.wordCount ? String(script.meta.wordCount) : 'N/A'],
    ['Output', options.output],
  ]);
  const footerLines = [];
  if (options.mock) footerLines.push('Mock mode - script is for testing only');
  footerLines.push(`Next: cm audio --input ${options.output}${options.mock ? ' --mock' : ''}`);
  await writeSummaryCard({ title: 'Script ready', lines, footerLines });

  // Human-mode stdout should be reserved for the primary artifact path.
  process.stdout.write(`${options.output}\n`);
  process.exit(0);
}

async function runScript(options: ScriptCommandOptions, spinner: SpinnerLike): Promise<void> {
  const runtime = getCliRuntime();
  const archetype = ArchetypeEnum.parse(options.archetype);
  const durationSeconds = Number.parseInt(String(options.duration), 10);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --duration value: ${options.duration}`, {
      fix: 'Use an integer number of seconds for --duration (e.g., --duration 45)',
    });
  }

  if (options.dryRun) {
    spinner.stop();
    writeDryRunOutput({ options, archetype, durationSeconds, runtime });
    return;
  }

  logger.info({ topic: options.topic, archetype }, 'Starting script generation');

  const llmProvider = options.mock ? createMockLLMProvider(options.topic) : undefined;
  if (options.mock) {
    spinner.text = 'Generating script (mock mode)...';
  }

  const packaging = await loadPackaging(options.package);
  const research = await loadResearch(options.research);

  if (research) {
    logger.info({ evidenceCount: research.evidence.length }, 'Loaded research evidence');
  }

  const script = await generateScript({
    topic: options.topic,
    archetype,
    targetDuration: durationSeconds,
    llmProvider,
    packaging,
    research,
  });

  await writeOutputFile(options.output, script);
  logger.info({ output: options.output }, 'Script saved');
  spinner.succeed('Script generated successfully');

  if (runtime.json) {
    writeSuccessJsonOutput({ options, archetype, runtime, script });
    return;
  }

  await writeSuccessTextOutput({ options, archetype, script });
}

export const scriptCommand = new Command('script')
  .description('Generate a script from a topic')
  .requiredOption('-t, --topic <topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('-o, --output <path>', 'Output file path', 'script.json')
  .option('--package <path>', 'Packaging JSON file (from cm package)')
  .option('--research <path>', 'Research JSON file (from cm research)')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--dry-run', 'Preview without calling LLM')
  .option('--mock', 'Use mock LLM provider (for testing)')
  .action(async (options: ScriptCommandOptions) => {
    const spinner = createSpinner('Generating script...').start();
    try {
      await runScript(options, spinner);
    } catch (error) {
      spinner.fail('Script generation failed');
      handleCommandError(error);
    }
  });
