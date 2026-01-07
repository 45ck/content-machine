/**
 * Generate command - Full pipeline: topic -> video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { handleCommandError, readInputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { createSpinner } from '../progress';
import chalk from 'chalk';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { dirname, join } from 'path';
import { ResearchOutputSchema } from '../../research/schema';
import type { ResearchOutput } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { OpenAIProvider } from '../../core/llm/openai';
import { SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';

interface GenerateOptions {
  archetype: string;
  output: string;
  orientation: string;
  voice: string;
  duration: string;
  keepArtifacts: boolean;
  mock: boolean;
  dryRun: boolean;
  research?: string | boolean;
}

function printHeader(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (runtime.json) return;

  writeStderrLine(chalk.bold('content-machine'));
  writeStderrLine(chalk.gray(`Topic: ${topic}`));
  writeStderrLine(chalk.gray(`Archetype: ${options.archetype}`));
  writeStderrLine(chalk.gray(`Output: ${options.output}`));
  writeStderrLine(chalk.gray(`Artifacts: ${dirname(options.output)}`));
}

function writeDryRunJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
}): void {
  const { topic, archetype, orientation, options, runtime, artifactsDir } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: {
        topic,
        archetype,
        orientation,
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        dryRun: true,
      },
      outputs: { dryRun: true, artifactsDir },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

function writeSuccessJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
}): void {
  const { topic, archetype, orientation, options, runtime, artifactsDir, result } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: {
        topic,
        archetype,
        orientation,
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        mock: options.mock,
      },
      outputs: {
        videoPath: result.outputPath,
        durationSeconds: result.duration,
        width: result.width,
        height: result.height,
        fileSizeBytes: result.fileSize,
        artifactsDir,
        costs: result.costs ?? null,
      },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

// eslint-disable-next-line complexity -- orchestrates multiple stages, refactor pending
async function runGenerate(topic: string, options: GenerateOptions): Promise<void> {
  const runtime = getCliRuntime();
  const artifactsDir = dirname(options.output);

  printHeader(topic, options, runtime);

  const archetype = ArchetypeEnum.parse(options.archetype);
  const orientation = OrientationEnum.parse(options.orientation);

  if (options.dryRun) {
    if (runtime.json) {
      writeDryRunJson({ topic, archetype, orientation, options, runtime, artifactsDir });
      return;
    }
    showDryRunSummary(topic, options, archetype, orientation);
    return;
  }

  logger.info({ topic, archetype, orientation }, 'Starting full pipeline');

  const research = await loadOrRunResearch(options.research, topic, options.mock ?? false);
  if (research && !runtime.json) {
    writeStderrLine(
      chalk.gray(
        `Research: ${research.totalResults} evidence items from ${research.sources.join(', ')}`
      )
    );
  }

  const llmProvider = options.mock ? createMockLLMProvider(topic) : undefined;
  if (options.mock && !runtime.json) {
    writeStderrLine(chalk.yellow('Mock mode - using fake providers'));
  }

  const eventEmitter = runtime.json ? undefined : new PipelineEventEmitter();
  const stageObserver = eventEmitter ? new CliProgressObserver(process.stderr) : null;

  if (eventEmitter && stageObserver) {
    eventEmitter.subscribe({
      onEvent: (event: PipelineEvent) => {
        if (event.type.startsWith('stage:')) stageObserver.onEvent(event);
      },
    });
  }

  const { runPipeline } = await import('../../core/pipeline');
  let result: PipelineResult;
  try {
    result = await runPipeline({
      topic,
      archetype,
      orientation,
      voice: options.voice,
      targetDuration: parseInt(options.duration, 10),
      outputPath: options.output,
      keepArtifacts: options.keepArtifacts,
      llmProvider,
      mock: options.mock,
      research,
      eventEmitter: eventEmitter ?? undefined,
    });
  } finally {
    stageObserver?.dispose();
  }

  if (runtime.json) {
    writeSuccessJson({ topic, archetype, orientation, options, runtime, artifactsDir, result });
    return;
  }

  showSuccessSummary(result, options, artifactsDir);
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse(createMockScriptResponse(topic));
  return provider;
}

function showDryRunSummary(
  topic: string,
  options: GenerateOptions,
  archetype: string,
  orientation: string
): void {
  writeStderrLine('Dry-run mode - no execution');
  writeStderrLine(`   Topic: ${topic}`);
  writeStderrLine(`   Archetype: ${archetype}`);
  writeStderrLine(`   Orientation: ${orientation}`);
  writeStderrLine(`   Voice: ${options.voice}`);
  writeStderrLine(`   Duration: ${options.duration}s`);
  writeStderrLine(`   Output: ${options.output}`);
  writeStderrLine(`   Keep artifacts: ${options.keepArtifacts}`);
  writeStderrLine(`   Research: ${options.research ? 'enabled' : 'disabled'}`);
  writeStderrLine('   Pipeline stages:');
  if (options.research) {
    writeStderrLine('   0. Research -> research.json');
  }
  writeStderrLine('   1. Script -> script.json');
  writeStderrLine('   2. Audio -> audio.wav + timestamps.json');
  writeStderrLine('   3. Visuals -> visuals.json');
  writeStderrLine(`   4. Render -> ${options.output}`);
}

function showSuccessSummary(
  result: PipelineResult,
  options: GenerateOptions,
  artifactsDir: string
): void {
  writeStderrLine(chalk.green.bold('Video generated successfully!'));
  writeStderrLine(`   Title: ${result.script.title}`);
  writeStderrLine(`   Duration: ${result.duration.toFixed(1)}s`);
  writeStderrLine(`   Resolution: ${result.width}x${result.height}`);
  writeStderrLine(`   Size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
  if (result.costs) {
    writeStderrLine(chalk.gray(`   API Costs: $${result.costs.total.toFixed(4)}`));
    writeStderrLine(chalk.gray(`      - LLM: $${result.costs.llm.toFixed(4)}`));
    writeStderrLine(chalk.gray(`      - TTS: $${result.costs.tts.toFixed(4)}`));
  }

  if (options.keepArtifacts) {
    writeStderrLine(chalk.gray('Artifacts:'));
    writeStderrLine(chalk.gray(`   Script: ${join(artifactsDir, 'script.json')}`));
    writeStderrLine(chalk.gray(`   Audio: ${join(artifactsDir, 'audio.wav')}`));
    writeStderrLine(chalk.gray(`   Timestamps: ${join(artifactsDir, 'timestamps.json')}`));
    writeStderrLine(chalk.gray(`   Visuals: ${join(artifactsDir, 'visuals.json')}`));
  }

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  writeStderrLine(chalk.gray(`Next: cm validate ${result.outputPath} --profile ${profile}`));

  // Human-mode stdout should be reserved for the primary artifact path.
  process.stdout.write(`${result.outputPath}\n`);
}

/**
 * Load research from file or run new research
 */
async function loadOrRunResearch(
  researchOption: string | boolean | undefined,
  topic: string,
  mock: boolean
): Promise<ResearchOutput | undefined> {
  if (!researchOption) return undefined;

  // If it's a file path, load from file
  if (typeof researchOption === 'string') {
    const raw = await readInputFile(researchOption);
    const parsed = ResearchOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SchemaError('Invalid research file', {
        path: researchOption,
        issues: parsed.error.issues,
        fix: 'Generate research via `cm research -q "<topic>" -o research.json` and pass --research research.json',
      });
    }
    return parsed.data;
  }

  // If it's true (boolean flag), run research automatically
  const spinner = createSpinner('Stage 0/4: Researching topic...').start();

  const llmProvider = mock
    ? undefined
    : process.env.OPENAI_API_KEY
      ? new OpenAIProvider('gpt-4o-mini', process.env.OPENAI_API_KEY)
      : undefined;

  const orchestrator = createResearchOrchestrator(
    {
      sources: ['hackernews', 'reddit', 'tavily'],
      limitPerSource: 5,
      generateAngles: true,
      maxAngles: 3,
    },
    llmProvider
  );

  try {
    const result = await orchestrator.research(topic);
    spinner.succeed('Stage 0/4: Research complete');
    return result.output;
  } catch (error) {
    spinner.fail('Stage 0/4: Research failed');
    throw error;
  }
}

export const generateCommand = new Command('generate')
  .description('Generate a complete video from a topic')
  .argument('<topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .option('--research [path]', 'Use research (true = auto-run, or path to research.json)')
  .option('--mock', 'Use mock providers (for testing)')
  .option('--dry-run', 'Preview configuration without execution')
  .action(async (topic: string, options: GenerateOptions) => {
    try {
      await runGenerate(topic, options);
    } catch (error) {
      handleCommandError(error);
    }
  });
