/**
 * Generate command - Full pipeline: topic → video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { runPipeline } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { handleCommandError } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import type { Ora } from 'ora';
import ora from 'ora';
import chalk from 'chalk';

interface GenerateOptions {
  archetype: string;
  output: string;
  orientation: string;
  voice: string;
  duration: string;
  keepArtifacts: boolean;
  mock: boolean;
  dryRun: boolean;
}

interface SpinnerState {
  script: Ora;
  audio: Ora | null;
  visuals: Ora | null;
  render: Ora | null;
}

function createMockScenes(topic: string) {
  return [
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
  ];
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse({
    scenes: createMockScenes(topic),
    reasoning: 'Mock script generated for testing.',
    title: `Mock: ${topic}`,
    hook: `Here's the thing about ${topic}...`,
    cta: 'Follow for more tips like this!',
    hashtags: ['#mock', '#test'],
  });
  return provider;
}

function showDryRunSummary(
  topic: string,
  options: GenerateOptions,
  archetype: string,
  orientation: string
): void {
  console.log(chalk.yellow('🔍 Dry-run mode - no execution\n'));
  console.log(`   Topic: ${topic}`);
  console.log(`   Archetype: ${archetype}`);
  console.log(`   Orientation: ${orientation}`);
  console.log(`   Voice: ${options.voice}`);
  console.log(`   Duration: ${options.duration}s`);
  console.log(`   Output: ${options.output}`);
  console.log(`   Keep artifacts: ${options.keepArtifacts}`);
  console.log(`\n   Pipeline stages:`);
  console.log(`   1. Script → script.json`);
  console.log(`   2. Audio → audio.wav + timestamps.json`);
  console.log(`   3. Visuals → visuals.json`);
  console.log(`   4. Render → ${options.output}\n`);
}

function createProgressHandler(spinners: SpinnerState) {
  return (stage: string, message: string): void => {
    const isComplete =
      message.includes('generated') || message.includes('matched') || message.includes('rendered');
    if (!isComplete) return;

    if (stage === 'script') {
      spinners.script.succeed('Stage 1/4: Script generated');
      spinners.audio = ora('Stage 2/4: Generating audio...').start();
    }
    if (stage === 'audio' && spinners.audio) {
      spinners.audio.succeed('Stage 2/4: Audio generated');
      spinners.visuals = ora('Stage 3/4: Matching visuals...').start();
    }
    if (stage === 'visuals' && spinners.visuals) {
      spinners.visuals.succeed('Stage 3/4: Visuals matched');
      spinners.render = ora('Stage 4/4: Rendering video...').start();
    }
    if (stage === 'render' && spinners.render) {
      spinners.render.succeed('Stage 4/4: Video rendered');
    }
  };
}

function showSuccessSummary(result: PipelineResult): void {
  console.log(chalk.green.bold('\n✅ Video generated successfully!\n'));
  console.log(`   📝 Title: ${result.script.title}`);
  console.log(`   ⏱️  Duration: ${result.duration.toFixed(1)}s`);
  console.log(`   📐 Resolution: ${result.width}x${result.height}`);
  console.log(`   💾 Size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   📁 Output: ${chalk.cyan(result.outputPath)}\n`);
  if (result.costs) {
    console.log(chalk.gray(`   💰 API Costs: $${result.costs.total.toFixed(4)}`));
    console.log(chalk.gray(`      - LLM: $${result.costs.llm.toFixed(4)}`));
    console.log(chalk.gray(`      - TTS: $${result.costs.tts.toFixed(4)}\n`));
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
  .option('--mock', 'Use mock providers (for testing)')
  .option('--dry-run', 'Preview configuration without execution')
  .action(async (topic: string, options: GenerateOptions) => {
    console.log(chalk.bold('\n🎬 content-machine\n'));
    console.log(chalk.gray(`Topic: ${topic}`));
    console.log(chalk.gray(`Archetype: ${options.archetype}`));
    console.log(chalk.gray(`Output: ${options.output}\n`));

    try {
      const archetype = ArchetypeEnum.parse(options.archetype);
      const orientation = OrientationEnum.parse(options.orientation);

      if (options.dryRun) {
        showDryRunSummary(topic, options, archetype, orientation);
        return;
      }

      logger.info({ topic, archetype, orientation }, 'Starting full pipeline');

      const llmProvider = options.mock ? createMockLLMProvider(topic) : undefined;
      if (options.mock) console.log(chalk.yellow('⚠️  Mock mode - using fake providers\n'));

      const spinners: SpinnerState = {
        script: ora('Stage 1/4: Generating script...').start(),
        audio: null,
        visuals: null,
        render: null,
      };

      const result = await runPipeline({
        topic,
        archetype,
        orientation,
        voice: options.voice,
        targetDuration: parseInt(options.duration, 10),
        outputPath: options.output,
        keepArtifacts: options.keepArtifacts,
        llmProvider,
        mock: options.mock,
        onProgress: createProgressHandler(spinners),
      });

      showSuccessSummary(result);
    } catch (error) {
      handleCommandError(error);
    }
  });
