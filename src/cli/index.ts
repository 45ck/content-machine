#!/usr/bin/env node
/**
 * content-machine CLI entry point
 *
 * Command-line tool for generating short-form video content.
 */
import 'dotenv/config';
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { setCliRuntime } from './runtime';
import { logger } from '../core/logger';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

type CommandLoader = () => Promise<Command>;

const COMMAND_LOADERS: Array<[string, CommandLoader]> = [
  ['script', async () => (await import('./commands/script')).scriptCommand],
  ['audio', async () => (await import('./commands/audio')).audioCommand],
  ['visuals', async () => (await import('./commands/visuals')).visualsCommand],
  ['render', async () => (await import('./commands/render')).renderCommand],
  ['assets', async () => (await import('./commands/assets')).assetsCommand],
  ['package', async () => (await import('./commands/package')).packageCommand],
  ['research', async () => (await import('./commands/research')).researchCommand],
  ['retrieve', async () => (await import('./commands/retrieve')).retrieveCommand],
  ['validate', async () => (await import('./commands/validate')).validateCommand],
  ['score', async () => (await import('./commands/score')).scoreCommand],
  ['rate', async () => (await import('./commands/rate')).rateCommand],
  ['captions', async () => (await import('./commands/captions')).captionsCommand],
  ['publish', async () => (await import('./commands/publish')).publishCommand],
  ['templates', async () => (await import('./commands/templates')).templatesCommand],
  ['timestamps', async () => (await import('./commands/timestamps')).timestampsCommand],
  ['import', async () => (await import('./commands/import')).importCommand],
  ['hooks', async () => (await import('./commands/hooks')).hooksCommand],
  ['setup', async () => (await import('./commands/setup')).setupCommand],
  ['workflows', async () => (await import('./commands/workflows')).workflowsCommand],
  ['generate', async () => (await import('./commands/generate')).generateCommand],
  ['init', async () => (await import('./commands/init')).initCommand],
];

const COMMAND_MAP = new Map(COMMAND_LOADERS);

function findRequestedCommand(args: string[]): string | null {
  for (const arg of args) {
    if (arg === '--') break;
    if (arg.startsWith('-')) continue;
    return arg;
  }
  return null;
}

function getCommandPath(actionCommand: Command): string {
  const segments: string[] = [];
  let current: Command | undefined = actionCommand;
  while (current) {
    const name = typeof current.name === 'function' ? current.name() : undefined;
    if (name) segments.unshift(name);
    current = current.parent ?? undefined;
  }

  if (segments[0] === 'cm') segments.shift();
  return segments.join(':') || 'unknown';
}

async function loadAllCommands(): Promise<void> {
  for (const [, loader] of COMMAND_LOADERS) {
    program.addCommand(await loader());
  }
}

async function loadCommandsForArgs(args: string[]): Promise<void> {
  const requested = findRequestedCommand(args);
  const wantsHelp = args.includes('--help') || args.includes('-h');

  if (!requested || requested === 'help') {
    await loadAllCommands();
    return;
  }

  if (wantsHelp) {
    const loader = COMMAND_MAP.get(requested);
    if (loader) {
      program.addCommand(await loader());
      return;
    }
    await loadAllCommands();
    return;
  }

  const loader = COMMAND_MAP.get(requested);
  if (loader) {
    program.addCommand(await loader());
    return;
  }

  await loadAllCommands();
}

program
  .name('cm')
  .description('CLI-first automated short-form video generator for TikTok, Reels, and Shorts')
  .version(version)
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--json', 'Output results as JSON')
  .option('--offline', 'Disable network access for downloads', false)
  .option('-y, --yes', 'Assume yes for prompts and safe downloads', false);

program.hook('preAction', (_thisCommand, actionCommand) => {
  const opts =
    typeof actionCommand.optsWithGlobals === 'function'
      ? actionCommand.optsWithGlobals()
      : actionCommand.opts();

  const offline = Boolean(opts.offline) || process.env.CM_OFFLINE === '1';
  const yes = Boolean(opts.yes) || process.env.CM_YES === '1';

  setCliRuntime({
    json: Boolean(opts.json),
    verbose: Boolean(opts.verbose),
    offline,
    yes,
    isTty: Boolean(process.stderr.isTTY),
    startTime: Date.now(),
    command: getCommandPath(actionCommand),
  });

  if (opts.offline) {
    process.env.CM_OFFLINE = '1';
  }

  if (opts.yes) {
    process.env.CM_YES = '1';
  }

  // In JSON mode, stdout must remain machine-readable (no logs/spinners).
  // pino-pretty logs to stdout by default, so silence logging for the duration of the command.
  if (opts.json) {
    logger.level = 'silent';
  } else if (opts.verbose) {
    logger.level = 'debug';
  }
});

async function main(): Promise<void> {
  await loadCommandsForArgs(process.argv.slice(2));
  program.parse(process.argv);
}

main().catch((error) => {
  const serializedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
  logger.error({ error: serializedError }, 'CLI failed to start');
  process.exit(1);
});
