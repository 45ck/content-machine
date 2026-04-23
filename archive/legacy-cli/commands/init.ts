/**
 * Init command - Interactive setup wizard
 *
 * Usage: cm init
 */
import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getCliRuntime } from '../runtime';
import { getInquirer } from '../inquirer';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { handleCommandError } from '../utils';
import { listArchetypes } from '../../archetypes/registry';
import {
  CONFIG_SURFACE_FILES,
  DEFAULT_MOTION_STRATEGY_ID,
  DEFAULT_NANOBANANA_MODEL,
  DEFAULT_VISUALS_PROVIDER_ID,
  MOTION_STRATEGIES,
  REPO_FACTS,
  SUPPORTED_LLM_PROVIDER_IDS,
  SUPPORTED_VISUALS_PROVIDER_IDS,
  VISUALS_PROVIDERS,
  LLM_PROVIDERS,
} from '../../domain/repo-facts.generated';

interface InitOptions {
  yes?: boolean;
}

function resolveLlmDefaultModel(providerId: string): string {
  const facts = LLM_PROVIDERS.find((p) => p.id === providerId);
  return facts?.defaultModel ?? REPO_FACTS.llm.default.model;
}

function resolveVisualsDefaultProvider(): string {
  return SUPPORTED_VISUALS_PROVIDER_IDS.includes(DEFAULT_VISUALS_PROVIDER_ID)
    ? DEFAULT_VISUALS_PROVIDER_ID
    : SUPPORTED_VISUALS_PROVIDER_IDS[0];
}

function resolveNanobananaDefaultModel(): string {
  const facts = VISUALS_PROVIDERS.find((p) => p.id === 'nanobanana');
  return facts?.defaultModel ?? DEFAULT_NANOBANANA_MODEL;
}

async function promptConfig(): Promise<Record<string, unknown>> {
  const inquirer = await getInquirer();
  const { llmProvider } = await inquirer.prompt<{ llmProvider: string }>({
    type: 'list',
    name: 'llmProvider',
    message: 'Which LLM provider would you like to use?',
    choices: [...SUPPORTED_LLM_PROVIDER_IDS],
    default: REPO_FACTS.llm.default.providerId,
  });

  const { llmModel } = await inquirer.prompt<{ llmModel: string }>({
    type: 'input',
    name: 'llmModel',
    message: 'Which model would you like to use?',
    default: resolveLlmDefaultModel(llmProvider),
  });

  const { archetype } = await inquirer.prompt<{ archetype: string }>({
    type: 'list',
    name: 'archetype',
    message: 'Default script archetype?',
    choices: (() => {
      const archetypes = listArchetypes();
      if (archetypes.length === 0) return ['listicle'];
      return archetypes.map((a) => ({ name: a.name ? `${a.id} - ${a.name}` : a.id, value: a.id }));
    })(),
    default: 'listicle',
  });

  const { orientation } = await inquirer.prompt<{ orientation: string }>({
    type: 'list',
    name: 'orientation',
    message: 'Default video orientation?',
    choices: ['portrait', 'landscape', 'square'],
    default: 'portrait',
  });

  const { voice } = await inquirer.prompt<{ voice: string }>({
    type: 'input',
    name: 'voice',
    message: 'Default TTS voice?',
    default: 'af_heart',
  });

  const { visualsProvider } = await inquirer.prompt<{ visualsProvider: string }>({
    type: 'list',
    name: 'visualsProvider',
    message: 'Default visuals provider?',
    choices: VISUALS_PROVIDERS.filter((p) => p.id !== 'pixabay').map((p) => ({
      name: p.displayName,
      value: p.id,
    })),
    default: resolveVisualsDefaultProvider(),
  });

  let motionStrategy: string | undefined;
  let nanobananaModel: string | undefined;
  if (visualsProvider === 'nanobanana') {
    const ms = await inquirer.prompt<{ motionStrategy: string }>({
      type: 'list',
      name: 'motionStrategy',
      message: 'Default motion strategy (for image providers)?',
      choices: MOTION_STRATEGIES.map((s) => ({ name: s.displayName, value: s.id })),
      default: DEFAULT_MOTION_STRATEGY_ID,
    });
    motionStrategy = ms.motionStrategy;

    const nm = await inquirer.prompt<{ nanobananaModel: string }>({
      type: 'input',
      name: 'nanobananaModel',
      message: 'Gemini image model id?',
      default: resolveNanobananaDefaultModel(),
    });
    nanobananaModel = nm.nanobananaModel;
  }

  return {
    defaults: {
      archetype,
      orientation,
      voice,
    },
    llm: {
      provider: llmProvider,
      model: llmModel,
      temperature: 0.7,
    },
    audio: {
      tts_engine: 'kokoro',
      asr_engine: 'whisper',
    },
    visuals: {
      provider: visualsProvider,
      // Write explicit defaults even when the current provider is stock-video.
      motion_strategy: motionStrategy ?? DEFAULT_MOTION_STRATEGY_ID,
      nanobanana: { model: nanobananaModel ?? resolveNanobananaDefaultModel() },
    },
    render: {
      fps: 30,
      codec: 'h264',
    },
  };
}

async function writeConfigFile(config: Record<string, unknown>): Promise<string> {
  const configPath = join(process.cwd(), CONFIG_SURFACE_FILES['project-config']);
  const tomlContent = generateToml(config);
  await writeFile(configPath, tomlContent, 'utf-8');
  return configPath;
}

function printHints(): void {
  writeStderrLine("Don't forget to set your API keys:");
  for (const p of SUPPORTED_LLM_PROVIDER_IDS) {
    const facts = LLM_PROVIDERS.find((x) => x.id === p);
    if (!facts) continue;
    const firstKey = facts.envVarNames?.[0];
    if (!firstKey) continue;
    writeStderrLine(`   bash: export ${firstKey}="..."   # ${facts.displayName}`);
  }
  for (const p of VISUALS_PROVIDERS) {
    const firstKey = p.envVarNames?.[0];
    if (!firstKey) continue;
    writeStderrLine(`   bash: export ${firstKey}="..."   # ${p.displayName}`);
  }
  writeStderrLine('   # Or add them to a .env file');
  writeStderrLine('Ready! Run: cm generate "Your topic here"');
}

export const initCommand = new Command('init')
  .description('Interactive setup wizard')
  .option('-y, --yes', 'Use defaults without prompting', false)
  .action(async (options: InitOptions) => {
    const runtime = getCliRuntime();
    if (!runtime.json) writeStderrLine('content-machine setup');

    try {
      const config = options.yes ? getDefaultConfig() : await promptConfig();
      const configPath = await writeConfigFile(config);

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'init',
            args: { yes: Boolean(options.yes) },
            outputs: { configPath },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(`Configuration saved to ${CONFIG_SURFACE_FILES['project-config']}`);
      printHints();

      // Human-mode stdout should be reserved for the primary artifact path.
      writeStdoutLine(configPath);
    } catch (error) {
      handleCommandError(error);
    }
  });

function getDefaultConfig(): Record<string, unknown> {
  return {
    defaults: {
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
    },
    llm: {
      provider: REPO_FACTS.llm.default.providerId,
      model: REPO_FACTS.llm.default.model,
      temperature: 0.7,
    },
    audio: {
      tts_engine: 'kokoro',
      asr_engine: 'whisper',
    },
    visuals: {
      provider: resolveVisualsDefaultProvider(),
      motion_strategy: DEFAULT_MOTION_STRATEGY_ID,
      nanobanana: { model: resolveNanobananaDefaultModel() },
    },
    render: {
      fps: 30,
      codec: 'h264',
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatTomlScalar(value: string | number | boolean): string {
  if (typeof value === 'string') return `"${value.replaceAll('"', '\\"')}"`;
  if (typeof value === 'number') return String(value);
  return value ? 'true' : 'false';
}

function generateToml(config: Record<string, unknown>): string {
  const lines: string[] = ['# content-machine configuration', '# Generated by cm init', ''];

  const writeTable = (path: string, values: Record<string, unknown>): void => {
    lines.push(`[${path}]`);

    const nested: Array<[string, Record<string, unknown>]> = [];

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue;

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key} = ${formatTomlScalar(value)}`);
        continue;
      }

      if (isPlainObject(value)) {
        nested.push([`${path}.${key}`, value]);
      }
    }
    lines.push('');

    for (const [childPath, childValues] of nested) {
      writeTable(childPath, childValues);
    }
  };

  for (const [section, value] of Object.entries(config)) {
    if (!isPlainObject(value)) continue;
    writeTable(section, value);
  }

  return lines.join('\n');
}
