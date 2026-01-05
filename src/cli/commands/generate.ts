/**
 * Generate command - Full pipeline: topic → video
 * 
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import { runPipeline } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { handleCommandError } from '../utils';
import ora from 'ora';
import chalk from 'chalk';

export const generateCommand = new Command('generate')
  .description('Generate a complete video from a topic')
  .argument('<topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .action(async (topic: string, options) => {
    console.log(chalk.bold('\n🎬 content-machine\n'));
    console.log(chalk.gray(`Topic: ${topic}`));
    console.log(chalk.gray(`Archetype: ${options.archetype}`));
    console.log(chalk.gray(`Output: ${options.output}\n`));
    
    try {
      // Validate options
      const archetype = ArchetypeEnum.parse(options.archetype);
      const orientation = OrientationEnum.parse(options.orientation);
      
      logger.info({ topic, archetype, orientation }, 'Starting full pipeline');
      
      // Stage 1: Script
      const scriptSpinner = ora('Stage 1/4: Generating script...').start();
      
      const result = await runPipeline({
        topic,
        archetype,
        orientation,
        voice: options.voice,
        targetDuration: parseInt(options.duration, 10),
        outputPath: options.output,
        keepArtifacts: options.keepArtifacts,
        onProgress: (stage, message) => {
          if (stage === 'script') {
            scriptSpinner.succeed('Stage 1/4: Script generated');
          }
          if (stage === 'audio') {
            ora('Stage 2/4: Generating audio...').succeed('Stage 2/4: Audio generated');
          }
          if (stage === 'visuals') {
            ora('Stage 3/4: Matching visuals...').succeed('Stage 3/4: Visuals matched');
          }
          if (stage === 'render') {
            ora('Stage 4/4: Rendering video...').succeed('Stage 4/4: Video rendered');
          }
        },
      });
      
      // Final summary
      console.log(chalk.green.bold('\n✅ Video generated successfully!\n'));
      console.log(`   📝 Title: ${result.script.title}`);
      console.log(`   ⏱️  Duration: ${result.duration.toFixed(1)}s`);
      console.log(`   📐 Resolution: ${result.width}x${result.height}`);
      console.log(`   💾 Size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
      console.log(`   📁 Output: ${chalk.cyan(result.outputPath)}\n`);
      
      // Show cost summary if available
      if (result.costs) {
        console.log(chalk.gray(`   💰 API Costs: $${result.costs.total.toFixed(4)}`));
        console.log(chalk.gray(`      - LLM: $${result.costs.llm.toFixed(4)}`));
        console.log(chalk.gray(`      - TTS: $${result.costs.tts.toFixed(4)}\n`));
      }
      
    } catch (error) {
      handleCommandError(error);
    }
  });
