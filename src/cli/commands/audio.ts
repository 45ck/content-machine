/**
 * Audio command - Generate voiceover and timestamps
 * 
 * Usage: cm audio --input script.json --output audio.wav
 */
import { Command } from 'commander';
import { generateAudio } from '../../audio/pipeline';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import type { ScriptOutput } from '../../script/schema';
import ora from 'ora';

export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script JSON file')
  .option('-o, --output <path>', 'Output audio file path', 'audio.wav')
  .option('--timestamps <path>', 'Output timestamps file path', 'timestamps.json')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .action(async (options) => {
    const spinner = ora('Generating audio...').start();
    
    try {
      // Read input script
      const script = await readInputFile<ScriptOutput>(options.input);
      
      logger.info({ input: options.input, voice: options.voice }, 'Starting audio generation');
      
      const result = await generateAudio({
        script,
        voice: options.voice,
        outputPath: options.output,
        timestampsPath: options.timestamps,
      });
      
      spinner.succeed('Audio generated successfully');
      
      logger.info({ 
        audioPath: result.audioPath, 
        timestampsPath: result.timestampsPath,
        duration: result.duration 
      }, 'Audio saved');
      
      // Show summary
      console.log(`\n🎙️ Audio Generated`);
      console.log(`   Duration: ${result.duration.toFixed(1)}s`);
      console.log(`   Words: ${result.wordCount}`);
      console.log(`   Audio: ${result.audioPath}`);
      console.log(`   Timestamps: ${result.timestampsPath}\n`);
      
    } catch (error) {
      spinner.fail('Audio generation failed');
      handleCommandError(error);
    }
  });
