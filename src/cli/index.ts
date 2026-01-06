#!/usr/bin/env node
/**
 * content-machine CLI entry point
 *
 * Command-line tool for generating short-form video content.
 */
import 'dotenv/config';
import { Command } from 'commander';
import { version } from '../../package.json';
import { scriptCommand } from './commands/script';
import { audioCommand } from './commands/audio';
import { visualsCommand } from './commands/visuals';
import { renderCommand } from './commands/render';
import { generateCommand } from './commands/generate';
import { initCommand } from './commands/init';
import { packageCommand } from './commands/package';
import { researchCommand } from './commands/research';
import { validateCommand } from './commands/validate';
import { setCliRuntime } from './runtime';
import { logger } from '../core/logger';
import { retrieveCommand } from './commands/retrieve';
import { scoreCommand } from './commands/score';
import { publishCommand } from './commands/publish';

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
program.addCommand(packageCommand);
program.addCommand(researchCommand);
program.addCommand(retrieveCommand);
program.addCommand(validateCommand);
program.addCommand(scoreCommand);
program.addCommand(publishCommand);
program.addCommand(generateCommand);
program.addCommand(initCommand);

program.hook('preAction', (_thisCommand, actionCommand) => {
  const opts =
    typeof actionCommand.optsWithGlobals === 'function'
      ? actionCommand.optsWithGlobals()
      : actionCommand.opts();

  setCliRuntime({
    json: Boolean(opts.json),
    verbose: Boolean(opts.verbose),
    isTty: Boolean(process.stderr.isTTY),
    startTime: Date.now(),
    command: actionCommand.name(),
  });

  // In JSON mode, stdout must remain machine-readable (no logs/spinners).
  // pino-pretty logs to stdout by default, so silence logging for the duration of the command.
  if (opts.json) {
    logger.level = 'silent';
  } else if (opts.verbose) {
    logger.level = 'debug';
  }
});

// Parse arguments
program.parse();
