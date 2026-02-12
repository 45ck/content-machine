#!/usr/bin/env node
/**
 * content-machine CLI entry point
 *
 * Command-line tool for generating short-form video content.
 */
import 'dotenv/config';
import { Command } from 'commander';
import { setCliRuntime } from './runtime';
import { version } from './meta';
import { logger } from '../core/logger';

const program = new Command();

type CommandLoader = () => Promise<Command>;

const COMMAND_LOADERS: Array<[string, CommandLoader]> = [
  ['mcp', async () => (await import('./commands/mcp')).mcpCommand],
  ['config', async () => (await import('./commands/config')).configCommand],
  ['doctor', async () => (await import('./commands/doctor')).doctorCommand],
  ['demo', async () => (await import('./commands/demo')).demoCommand],
  ['archetypes', async () => (await import('./commands/archetypes')).archetypesCommand],
  ['script', async () => (await import('./commands/script')).scriptCommand],
  ['audio', async () => (await import('./commands/audio')).audioCommand],
  ['visuals', async () => (await import('./commands/visuals')).visualsCommand],
  ['media', async () => (await import('./commands/media')).mediaCommand],
  ['render', async () => (await import('./commands/render')).renderCommand],
  ['assets', async () => (await import('./commands/assets')).assetsCommand],
  ['package', async () => (await import('./commands/package')).packageCommand],
  ['research', async () => (await import('./commands/research')).researchCommand],
  ['retrieve', async () => (await import('./commands/retrieve')).retrieveCommand],
  ['validate', async () => (await import('./commands/validate')).validateCommand],
  ['videospec', async () => (await import('./commands/videospec')).videospecCommand],
  ['score', async () => (await import('./commands/score')).scoreCommand],
  ['rate', async () => (await import('./commands/rate')).rateCommand],
  [
    'caption-quality',
    async () => (await import('./commands/caption-quality')).captionQualityCommand,
  ],
  ['bench', async () => (await import('./commands/bench')).benchCommand],
  ['captions', async () => (await import('./commands/captions')).captionsCommand],
  ['publish', async () => (await import('./commands/publish')).publishCommand],
  ['templates', async () => (await import('./commands/templates')).templatesCommand],
  ['prompts', async () => (await import('./commands/prompts')).promptsCommand],
  ['timestamps', async () => (await import('./commands/timestamps')).timestampsCommand],
  ['import', async () => (await import('./commands/import')).importCommand],
  ['hooks', async () => (await import('./commands/hooks')).hooksCommand],
  ['setup', async () => (await import('./commands/setup')).setupCommand],
  ['workflows', async () => (await import('./commands/workflows')).workflowsCommand],
  ['feedback', async () => (await import('./commands/feedback')).feedbackCommand],
  ['telemetry', async () => (await import('./commands/telemetry')).telemetryCommand],
  ['lab', async () => (await import('./commands/lab')).labCommand],
  ['generate', async () => (await import('./commands/generate')).generateCommand],
  ['init', async () => (await import('./commands/init')).initCommand],
];

const COMMAND_MAP = new Map(COMMAND_LOADERS);

function findRequestedCommand(args: string[]): string | null {
  const takesValue = new Set(['--config']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') break;
    if (takesValue.has(arg)) {
      // Skip the value token for global options that take a value, e.g. `--config path`.
      i += 1;
      continue;
    }
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

function loadCommandStubsForRootHelp(): void {
  // Keep `cm --help` robust even when some command modules have optional deps or
  // environment-specific behavior. Subcommand details remain available via
  // `cm <command> --help` which loads the real module.
  for (const [name] of COMMAND_LOADERS) {
    program.command(name).description(`Run \`cm ${name} --help\` for details`);
  }
}

async function loadCommandsForArgs(args: string[]): Promise<void> {
  const requested = findRequestedCommand(args);
  const wantsHelp = args.includes('--help') || args.includes('-h');

  if (!requested || requested === 'help') {
    if (wantsHelp) {
      loadCommandStubsForRootHelp();
      return;
    }
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
  .option('--config <path>', 'Path to config file (overrides discovery and $CM_CONFIG)')
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

  if (typeof opts.config === 'string' && opts.config.trim()) {
    process.env.CM_CONFIG = opts.config;
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
