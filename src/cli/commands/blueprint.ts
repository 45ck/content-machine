/**
 * Blueprint command - Extract a VideoBlueprint from a VideoSpec
 *
 * Usage: cm blueprint --input videospec.v1.json [--theme theme.v1.json] [-o blueprint.v1.json]
 */
import { Command } from 'commander';
import { SchemaError } from '../../core/errors';
import { logger } from '../../core/logger';
import { VideoSpecV1Schema, VideoThemeV1Schema } from '../../domain';
import { classifyVideoSpec } from '../../videointel/classify';
import { extractBlueprint } from '../../videointel/blueprint';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

interface BlueprintCommandOptions {
  input: string;
  theme?: string;
  output: string;
}

async function runBlueprint(
  options: BlueprintCommandOptions,
  spinner: ReturnType<typeof createSpinner>
): Promise<void> {
  const runtime = getCliRuntime();

  const raw = await readInputFile(options.input);
  const parsed = VideoSpecV1Schema.safeParse(raw);
  if (!parsed.success) {
    throw new SchemaError('Invalid VideoSpec file', {
      path: options.input,
      issues: parsed.error.issues,
      fix: 'Generate a VideoSpec via `cm videospec -i <video> -o videospec.v1.json`',
    });
  }

  let theme;
  let themePath = options.theme;

  if (options.theme) {
    const themeRaw = await readInputFile(options.theme);
    const themeParsed = VideoThemeV1Schema.safeParse(themeRaw);
    if (!themeParsed.success) {
      throw new SchemaError('Invalid VideoTheme file', {
        path: options.theme,
        issues: themeParsed.error.issues,
        fix: 'Generate a theme via `cm classify --input videospec.v1.json -o theme.v1.json`',
      });
    }
    theme = themeParsed.data;
  } else {
    spinner.text = 'Classifying video (no theme provided)...';
    theme = await classifyVideoSpec(parsed.data, {
      mode: 'heuristic',
      sourceVideospecPath: options.input,
    });
    themePath = '(inline heuristic)';
  }

  spinner.text = 'Extracting blueprint...';
  const blueprint = extractBlueprint(parsed.data, theme, {
    sourceVideospecPath: options.input,
    sourceThemePath: themePath,
  });

  await writeOutputFile(options.output, blueprint);
  logger.info({ output: options.output }, 'VideoBlueprint saved');
  spinner.succeed('Blueprint extracted');

  if (runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'blueprint',
        args: { input: options.input, theme: options.theme ?? null, output: options.output },
        outputs: {
          blueprintPath: options.output,
          archetype: blueprint.archetype,
          sceneSlots: blueprint.scene_slots.length,
          targetDuration: blueprint.pacing_profile.target_duration,
        },
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exitCode = 0;
    return;
  }

  const lines = formatKeyValueRows([
    ['Archetype', String(blueprint.archetype)],
    ['Scenes', String(blueprint.scene_slots.length)],
    ['Duration', `${blueprint.pacing_profile.target_duration}s`],
    ['Pacing', blueprint.pacing_profile.classification ?? 'unknown'],
    ['Voiceover', blueprint.audio_profile.has_voiceover ? 'yes' : 'no'],
    ['Music', blueprint.audio_profile.has_music ? 'yes' : 'no'],
    ['Output', options.output],
  ]);
  await writeSummaryCard({
    title: 'Video Blueprint',
    lines,
    footerLines: [`Next: cm script --topic "<topic>" --blueprint ${options.output}`],
  });

  writeStdoutLine(options.output);
  process.exitCode = 0;
}

export const blueprintCommand = new Command('blueprint')
  .description('Extract a reusable VideoBlueprint from a VideoSpec')
  .requiredOption('-i, --input <path>', 'Input VideoSpec.v1.json file')
  .option('--theme <path>', 'VideoTheme.v1.json file (omit to auto-classify)')
  .option('-o, --output <path>', 'Output VideoBlueprint.v1.json file', 'blueprint.v1.json')
  .action(async (options: BlueprintCommandOptions) => {
    const spinner = createSpinner('Extracting blueprint...').start();
    try {
      await runBlueprint(options, spinner);
    } catch (error) {
      spinner.fail('Blueprint extraction failed');
      handleCommandError(error);
    }
  });
