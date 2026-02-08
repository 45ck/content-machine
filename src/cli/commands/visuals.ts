/**
 * Visuals command - Find matching stock footage
 *
 * Usage: cm visuals --input timestamps.json --output visuals.json
 * Based on SYSTEM-DESIGN section 7.3 cm visuals command.
 */
import { Command } from 'commander';
import { matchVisuals } from '../../visuals/matcher';
import type { VisualsProgressEvent } from '../../visuals/matcher';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { TimestampsOutputSchema } from '../../domain';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { SchemaError } from '../../core/errors';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { loadConfig } from '../../core/config';
import type { AssetProviderName } from '../../visuals/providers';

interface GameplayOptions {
  library?: string;
  style?: string;
  required: boolean;
}

const ASSET_PROVIDER_NAMES: ReadonlySet<AssetProviderName> = new Set([
  'pexels',
  'pixabay',
  'local',
  'localimage',
  'nanobanana',
  'dalle',
  'unsplash',
  'mock',
]);

function parseProviderNameList(values: string[]): AssetProviderName[] {
  const out: AssetProviderName[] = [];
  for (const raw of values) {
    const name = raw.trim();
    if (!name) continue;
    if (!ASSET_PROVIDER_NAMES.has(name as AssetProviderName)) {
      throw new SchemaError('Invalid provider name', {
        provider: name,
        fix: `Use one of: ${Array.from(ASSET_PROVIDER_NAMES).join(', ')}`,
      });
    }
    out.push(name as AssetProviderName);
  }
  return out;
}

async function readTimestampsInput(path: string) {
  const rawTimestamps = await readInputFile(path);
  const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
  if (!parsedTimestamps.success) {
    throw new SchemaError('Invalid timestamps file', {
      path,
      issues: parsedTimestamps.error.issues,
      fix: `Generate timestamps via \`cm audio --input script.json --timestamps ${path}\` (or pass the timestamps.json produced by cm audio).`,
    });
  }
  return parsedTimestamps.data;
}

function createVisualsProgressHandler(params: {
  runtime: ReturnType<typeof getCliRuntime>;
  spinner: ReturnType<typeof createSpinner>;
}): (event: VisualsProgressEvent) => void {
  const { runtime, spinner } = params;
  let lastBucket = -1;
  let lastPhase: string | undefined;
  return (event: VisualsProgressEvent): void => {
    if (runtime.json) return;

    const percent = Math.round(event.progress * 100);
    const phase = event.phase;
    const message = event.message;

    if (runtime.isTty) {
      const parts = ['Finding matching visuals...', `${percent}%`];
      if (phase) parts.push(phase);
      if (message) parts.push(message);
      spinner.text = parts.join(' - ');
      return;
    }

    const bucket = Math.floor(percent / 10) * 10;
    if (bucket === lastBucket && phase === lastPhase) return;
    lastBucket = bucket;
    lastPhase = phase;

    const parts = [`Visuals progress: ${percent}%`];
    if (phase) parts.push(phase);
    if (message) parts.push(message);
    writeStderrLine(parts.join(' - '));
  };
}

function resolveGameplayOptions(
  options: Record<string, unknown>,
  command: Command
): {
  gameplay: GameplayOptions | undefined;
  gameplayRequired: boolean;
} {
  const gameplaySpecified = Boolean(options.gameplay);
  const gameplayStyleSpecified = Boolean(options.gameplayStyle);
  const strictSource = command.getOptionValueSource('gameplayStrict');
  const gameplayStrict = strictSource === 'default' ? undefined : Boolean(options.gameplayStrict);
  const gameplayRequested = gameplaySpecified || gameplayStyleSpecified || Boolean(gameplayStrict);
  const gameplayRequired = gameplayStrict ?? gameplayRequested;

  return {
    gameplay: gameplayRequested
      ? {
          library: options.gameplay as string | undefined,
          style: options.gameplayStyle as string | undefined,
          required: gameplayRequired,
        }
      : undefined,
    gameplayRequired,
  };
}

function buildVisualsSummary(params: {
  visuals: Awaited<ReturnType<typeof matchVisuals>>;
  options: Record<string, unknown>;
}): { lines: string[]; footerLines: string[] } {
  const { visuals, options } = params;
  const providerRaw = String(options.provider ?? 'pexels');
  const providers = Array.isArray(options.providers)
    ? (options.providers as string[])
    : providerRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const providerLabel =
    providers.length > 1 ? providers.join(' -> ') : (providers[0] ?? providerRaw);
  const rows: Array<[string, string]> = [
    ['Scenes', String(visuals.scenes.length)],
    ['Duration', visuals.totalDuration ? `${visuals.totalDuration.toFixed(1)}s` : 'N/A'],
    ['Provider', providerLabel],
    ['Motion', visuals.motionStrategy ?? String(options.motionStrategy ?? 'N/A')],
    ['From you', String((visuals as any).fromUserFootage ?? 0)],
    ['From stock', String(visuals.fromStock)],
    ['From generated', String(visuals.fromGenerated)],
    ['Fallbacks', String(visuals.fallbacks)],
    ['Visuals', String(options.output)],
  ];
  if (visuals.gameplayClip) {
    rows.push(['Gameplay', visuals.gameplayClip.path]);
  }
  const lines = formatKeyValueRows(rows);
  const footerLines = [];
  if (options.mock) footerLines.push('Mock mode - visuals are placeholders');
  footerLines.push(
    `Next: cm render --input ${options.output} --audio audio.wav --timestamps ${options.input} --output video.mp4${options.mock ? ' --mock' : ''}`
  );
  return { lines, footerLines };
}

export const visualsCommand = new Command('visuals')
  .description('Find matching stock footage for script scenes')
  .requiredOption('-i, --input <path>', 'Input timestamps JSON file')
  .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
  .option(
    '--local-dir <path>',
    'Directory for --provider local/localimage (bring your own assets)',
    undefined
  )
  .option(
    '--local-manifest <path>',
    'Optional JSON mapping sceneId -> assetPath (deterministic BYO visuals)',
    undefined
  )
  .option(
    '--provider <provider>',
    'Visual provider (stock video: pexels; AI images: nanobanana)',
    'pexels'
  )
  .option('--asset-provider <provider>', 'Alias for --provider (preferred name in ADR)', undefined)
  .option(
    '--fallback-providers <providers>',
    'Comma-separated fallback providers (e.g. nanobanana). If --provider is a comma list, it already defines a chain.',
    undefined
  )
  .option(
    '--motion-strategy <strategy>',
    'Motion strategy for image providers (none|kenburns|depthflow|veo)',
    undefined
  )
  .option('--orientation <type>', 'Footage orientation', 'portrait')
  .option('--gameplay <path>', 'Gameplay library directory or clip file path')
  .option('--gameplay-style <name>', 'Gameplay subfolder name (e.g., subway-surfers)')
  .option('--gameplay-strict', 'Fail if gameplay clip is missing')
  .option('--mock', 'Use mock visuals (for testing)', false)
  .action(async (options, command: Command) => {
    const spinner = createSpinner('Finding matching visuals...').start();
    const runtime = getCliRuntime();

    try {
      const config = loadConfig();
      if (options.assetProvider && command.getOptionValueSource('provider') === 'default') {
        options.provider = options.assetProvider;
      }
      if (command.getOptionValueSource('provider') === 'default') {
        options.provider = config.visuals.provider;
      }
      if (command.getOptionValueSource('motionStrategy') === 'default') {
        options.motionStrategy = config.visuals.motionStrategy;
      }
      if (command.getOptionValueSource('orientation') === 'default') {
        options.orientation = config.defaults.orientation;
      }

      const timestamps = await readTimestampsInput(options.input);

      const providerRaw = String(options.provider ?? config.visuals.provider);
      const providerChainFromFlag = providerRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const fallbackProvidersFromFlag = String(options.fallbackProviders ?? '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const fallbackProvidersFromConfig = Array.isArray(config.visuals.fallbackProviders)
        ? (config.visuals.fallbackProviders as string[])
        : [];
      const providerChainRaw =
        providerChainFromFlag.length > 1
          ? providerChainFromFlag
          : [
              providerChainFromFlag[0] ?? 'pexels',
              ...fallbackProvidersFromFlag,
              ...fallbackProvidersFromConfig,
            ];
      const providerChain = parseProviderNameList(providerChainRaw);
      options.providers = providerChain;

      logger.info({ input: options.input, providerChain }, 'Starting visual matching');

      const onProgress = createVisualsProgressHandler({ runtime, spinner });
      const { gameplay, gameplayRequired } = resolveGameplayOptions(options, command);

      const visuals = await matchVisuals({
        timestamps,
        provider: providerChain[0],
        providers: providerChain,
        localDir: typeof options.localDir === 'string' ? options.localDir : undefined,
        localManifest:
          typeof options.localManifest === 'string' ? options.localManifest : undefined,
        orientation: options.orientation,
        mock: Boolean(options.mock),
        motionStrategy: options.motionStrategy,
        gameplay,
        onProgress,
      });

      spinner.succeed('Visuals matched successfully');

      // Write output
      await writeOutputFile(options.output, visuals);

      logger.info({ output: options.output }, 'Visuals saved');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'visuals',
            args: {
              input: options.input,
              output: options.output,
              provider: providerChain[0],
              providers: providerChain,
              motionStrategy: options.motionStrategy ?? null,
              orientation: options.orientation,
              mock: Boolean(options.mock),
              gameplay: options.gameplay ?? null,
              gameplayStyle: options.gameplayStyle ?? null,
              gameplayStrict: Boolean(gameplayRequired),
              localDir: typeof options.localDir === 'string' ? options.localDir : null,
              localManifest:
                typeof options.localManifest === 'string' ? options.localManifest : null,
            },
            outputs: {
              visualsPath: options.output,
              scenes: visuals.scenes.length,
              totalDurationSeconds: visuals.totalDuration ?? null,
              fromUserFootage: (visuals as any).fromUserFootage ?? 0,
              fromStock: visuals.fromStock,
              fallbacks: visuals.fallbacks,
              fromGenerated: visuals.fromGenerated,
              gameplayClip: visuals.gameplayClip?.path ?? null,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      const summary = buildVisualsSummary({ visuals, options });
      await writeSummaryCard({
        title: 'Visuals ready',
        lines: summary.lines,
        footerLines: summary.footerLines,
      });

      // Human-mode stdout should be reserved for the primary artifact path.
      writeStdoutLine(options.output);
    } catch (error) {
      spinner.fail('Visual matching failed');
      handleCommandError(error);
    }
  });
