#!/usr/bin/env node
/**
 * content-machine CLI entry point
 *
 * Command-line tool for generating short-form video content.
 */
import { Command } from 'commander';
import { version } from '../../package.json';
import { scriptCommand } from './commands/script';
import { audioCommand } from './commands/audio';
import { visualsCommand } from './commands/visuals';
import { renderCommand } from './commands/render';
import { generateCommand } from './commands/generate';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('cm')
  .description('CLI-first automated short-form video generator for TikTok, Reels, and Shorts')
  .version(version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--json', 'Output results as JSON');

// Add subcommands
program.addCommand(scriptCommand);
program.addCommand(audioCommand);
program.addCommand(visualsCommand);
program.addCommand(renderCommand);
program.addCommand(generateCommand);
program.addCommand(initCommand);

// Parse arguments
program.parse();
