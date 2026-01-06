/**
 * Package command - Generate packaging variants from a topic
 *
 * Usage: cm package "Redis vs PostgreSQL for caching" --platform tiktok --output packaging.json
 */
import { Command } from 'commander';
import ora from 'ora';
import { generatePackage } from '../../package/generator';
import { PlatformEnum } from '../../package/schema';
import { logger } from '../../core/logger';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { handleCommandError, writeOutputFile } from '../utils';

export const packageCommand = new Command('package')
  .description('Generate title/cover packaging variants for a topic')
  .argument('<topic>', 'Topic for the video')
  .option('--platform <platform>', 'Target platform (tiktok, reels, shorts)', 'tiktok')
  .option('--variants <count>', 'Number of variants to generate', '5')
  .option('-o, --output <path>', 'Output file path', 'packaging.json')
  .option('--dry-run', 'Preview without calling LLM')
  .option('--mock', 'Use mock LLM provider (for testing)')
  .action(async (topic: string, options) => {
    const spinner = ora('Generating packaging...').start();

    try {
      const platform = PlatformEnum.parse(options.platform);
      const parsedVariants = parseInt(options.variants, 10);
      const variants = Number.isFinite(parsedVariants) && parsedVariants > 0 ? parsedVariants : 5;

      if (options.dryRun) {
        spinner.stop();
        console.log('\nDry-run mode - no LLM call made\n');
        console.log(`   Topic: ${topic}`);
        console.log(`   Platform: ${platform}`);
        console.log(`   Variants: ${variants}`);
        console.log(`   Output: ${options.output}\n`);
        return;
      }

      logger.info({ topic, platform, variants }, 'Starting packaging generation');

      let llmProvider;
      if (options.mock) {
        spinner.text = 'Generating packaging (mock mode)...';
        llmProvider = new FakeLLMProvider();
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
      }

      const result = await generatePackage({
        topic,
        platform,
        variants,
        llmProvider,
      });

      spinner.succeed('Packaging generated successfully');

      await writeOutputFile(options.output, result);

      console.log(`\nPackaging for: ${result.topic}`);
      console.log(`   Platform: ${result.platform}`);
      console.log(`   Variants: ${result.variants.length}`);
      console.log(`   Selected: ${result.selected.title}`);
      console.log(`   Output: ${options.output}`);
      if (options.mock) {
        console.log(`   Mock mode - packaging is for testing only`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Packaging generation failed');
      handleCommandError(error);
    }
  });
