/**
 * Script command - Generate script from topic
 *
 * Usage: cm script --topic "Redis vs PostgreSQL" --archetype versus
 * Based on SYSTEM-DESIGN §7.1 cm script command.
 */
import { Command } from 'commander';
import { ArchetypeEnum } from '../../core/config';
import { SchemaError } from '../../core/errors';
import { logger } from '../../core/logger';
import { PackageOutputSchema } from '../../package/schema';
import { generateScript } from '../../script/generator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';
import type { SpinnerLike } from '../progress';

interface PackagingInput {
  title: string;
  coverText: string;
  onScreenHook: string;
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse({
    scenes: [
      {
        text: `Here's the thing about ${topic}...`,
        visualDirection: 'Speaker on camera',
        mood: 'engaging',
      },
      {
        text: 'First, you need to know this key point.',
        visualDirection: 'B-roll of related topic',
        mood: 'informative',
      },
      {
        text: 'Second, this is what most people get wrong.',
        visualDirection: 'Text overlay with key stat',
        mood: 'surprising',
      },
      {
        text: "And finally, here's what you should actually do.",
        visualDirection: 'Action shot',
        mood: 'empowering',
      },
      {
        text: 'Follow for more tips like this!',
        visualDirection: 'End card with social handles',
        mood: 'friendly',
      },
    ],
    reasoning: 'Mock script generated for testing. Real LLM would provide creative reasoning.',
    title: `Mock: ${topic}`,
    hook: `Here's the thing about ${topic}...`,
    cta: 'Follow for more tips like this!',
    hashtags: ['#mock', '#test'],
  });
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
    });
  }

  return parsed.data;
}

function writeDryRunOutput(params: {
  options: ScriptCommandOptions;
  archetype: string;
  runtime: ReturnType<typeof getCliRuntime>;
}): void {
  const { options, archetype, runtime } = params;

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
          dryRun: true,
        },
        outputs: { dryRun: true },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    return;
  }

  console.log('\nDry-run mode - no LLM call made\n');
  console.log(`   Topic: ${options.topic}`);
  console.log(`   Archetype: ${archetype}`);
  console.log(`   Duration: ${options.duration}s`);
  console.log(`   Output: ${options.output}`);
  if (options.package) console.log(`   Package: ${options.package}`);
  console.log(
    `\nPrompt would use ~${Math.round(parseInt(options.duration, 10) * 2.5)} target words\n`
  );
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
}

function writeSuccessTextOutput(params: {
  options: ScriptCommandOptions;
  archetype: string;
  script: Awaited<ReturnType<typeof generateScript>>;
}): void {
  const { options, archetype, script } = params;

  console.log(`\nScript: ${script.title ?? options.topic}`);
  console.log(`   Archetype: ${archetype}`);
  console.log(`   Scenes: ${script.scenes.length}`);
  console.log(`   Word count: ${script.meta?.wordCount ?? 'N/A'}`);
  console.log(`   Output: ${options.output}`);
  if (options.mock) console.log('   Mock mode - script is for testing only');
  console.log('');
}

async function runScript(options: ScriptCommandOptions, spinner: SpinnerLike): Promise<void> {
  const runtime = getCliRuntime();
  const archetype = ArchetypeEnum.parse(options.archetype);

  if (options.dryRun) {
    spinner.stop();
    writeDryRunOutput({ options, archetype, runtime });
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
    targetDuration: parseInt(options.duration, 10),
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

  writeSuccessTextOutput({ options, archetype, script });
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
