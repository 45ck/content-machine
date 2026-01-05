/**
 * Script command - Generate script from topic
 *
 * Usage: cm script --topic "Redis vs PostgreSQL" --archetype versus
 * Based on SYSTEM-DESIGN §7.1 cm script command.
 */
import { Command } from 'commander';
import { generateScript } from '../../script/generator';
import { logger } from '../../core/logger';
import { ArchetypeEnum } from '../../core/config';
import { handleCommandError, writeOutputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import ora from 'ora';

export const scriptCommand = new Command('script')
  .description('Generate a script from a topic')
  .requiredOption('-t, --topic <topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('-o, --output <path>', 'Output file path', 'script.json')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--dry-run', 'Preview without calling LLM')
  .option('--mock', 'Use mock LLM provider (for testing)')
  .action(async (options) => {
    const spinner = ora('Generating script...').start();

    try {
      // Validate archetype
      const archetype = ArchetypeEnum.parse(options.archetype);

      // Dry-run: just show what would happen
      if (options.dryRun) {
        spinner.stop();
        console.log('\n🔍 Dry-run mode - no LLM call made\n');
        console.log(`   Topic: ${options.topic}`);
        console.log(`   Archetype: ${archetype}`);
        console.log(`   Duration: ${options.duration}s`);
        console.log(`   Output: ${options.output}`);
        console.log(
          `\nPrompt would use ~${Math.round(parseInt(options.duration, 10) * 2.5)} target words\n`
        );
        return;
      }

      logger.info({ topic: options.topic, archetype }, 'Starting script generation');

      // Create mock provider if --mock flag is set
      let llmProvider;
      if (options.mock) {
        spinner.text = 'Generating script (mock mode)...';
        llmProvider = new FakeLLMProvider();
        llmProvider.queueJsonResponse({
          scenes: [
            {
              text: `Here's the thing about ${options.topic}...`,
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
          reasoning:
            'Mock script generated for testing. Real LLM would provide creative reasoning.',
          title: `Mock: ${options.topic}`,
          hook: `Here's the thing about ${options.topic}...`,
          cta: 'Follow for more tips like this!',
          hashtags: ['#mock', '#test'],
        });
      }

      const script = await generateScript({
        topic: options.topic,
        archetype,
        targetDuration: parseInt(options.duration, 10),
        llmProvider,
      });

      spinner.succeed('Script generated successfully');

      // Write output
      await writeOutputFile(options.output, script);

      logger.info({ output: options.output }, 'Script saved');

      // Show summary
      console.log(`\n📝 Script: ${script.title ?? options.topic}`);
      console.log(`   Archetype: ${archetype}`);
      console.log(`   Scenes: ${script.scenes.length}`);
      console.log(`   Word count: ${script.meta?.wordCount ?? 'N/A'}`);
      console.log(`   Output: ${options.output}`);
      if (options.mock) {
        console.log(`   ⚠️  Mock mode - script is for testing only`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Script generation failed');
      handleCommandError(error);
    }
  });
