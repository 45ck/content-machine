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
import ora from 'ora';

export const scriptCommand = new Command('script')
  .description('Generate a script from a topic')
  .requiredOption('-t, --topic <topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('-o, --output <path>', 'Output file path', 'script.json')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .action(async (options) => {
    const spinner = ora('Generating script...').start();
    
    try {
      // Validate archetype
      const archetype = ArchetypeEnum.parse(options.archetype);
      
      logger.info({ topic: options.topic, archetype }, 'Starting script generation');
      
      const script = await generateScript({
        topic: options.topic,
        archetype,
        targetDuration: parseInt(options.duration, 10),
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
      console.log(`   Output: ${options.output}\n`);
      
    } catch (error) {
      spinner.fail('Script generation failed');
      handleCommandError(error);
    }
  });
