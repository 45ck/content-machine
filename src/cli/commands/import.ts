/**
 * Import command - build artifacts from external assets
 */
import { Command } from 'commander';
import { glob, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join } from 'path';
import { CMError, SchemaError } from '../../core/errors';
import { TimestampsOutputSchema } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi']);

function looksLikeGlob(spec: string): boolean {
  return /[*?[\]]/.test(spec);
}

function isVideoPath(path: string): boolean {
  return VIDEO_EXTENSIONS.has(extname(path).toLowerCase());
}

async function listClipsFromDirectory(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isVideoPath(entry.name))
    .map((entry) => join(dir, entry.name));
}

async function resolveClipInputs(options: { clips?: string; clip?: string }): Promise<string[]> {
  const results: string[] = [];

  if (options.clip) {
    results.push(String(options.clip));
  }

  if (options.clips) {
    const spec = String(options.clips);
    if (looksLikeGlob(spec)) {
      const matches: string[] = [];
      for await (const match of glob(spec)) {
        matches.push(match);
      }
      results.push(...matches.filter(isVideoPath));
    } else {
      if (!existsSync(spec)) {
        throw new CMError('FILE_NOT_FOUND', `Clips path not found: ${spec}`, {
          path: spec,
          fix: 'Provide a valid directory, file path, or glob pattern',
        });
      }

      const stats = await stat(spec);
      if (stats.isDirectory()) {
        results.push(...(await listClipsFromDirectory(spec)));
      } else if (stats.isFile()) {
        results.push(spec);
      }
    }
  }

  return results;
}

function parseSceneMap(raw: unknown, mapPath: string): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    throw new SchemaError('Invalid map JSON', {
      path: mapPath,
      fix: 'Provide a JSON object mapping sceneId -> clip path',
    });
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  const result: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (typeof value !== 'string') {
      throw new SchemaError('Invalid map entry', {
        path: mapPath,
        fix: 'All map values must be clip path strings',
      });
    }
    result[key] = value;
  }

  return result;
}

export const importCommand = new Command('import')
  .description('Import external assets into content-machine artifacts')
  .addCommand(
    new Command('visuals')
      .description('Generate visuals.json from local clips')
      .requiredOption('--timestamps <path>', 'Input timestamps JSON file')
      .option('--clips <path>', 'Directory or glob of clip files')
      .option('--clip <path>', 'Single clip file path')
      .option('--mode <mode>', 'Mapping mode: sequence, loop, map', 'sequence')
      .option('--map <path>', 'JSON mapping of sceneId -> clip path (for map mode)')
      .option('-o, --output <path>', 'Output visuals file path', 'visuals.json')
      .action(async (options) => {
        const spinner = createSpinner('Importing visuals...').start();
        const runtime = getCliRuntime();

        try {
          const rawTimestamps = await readInputFile(options.timestamps);
          const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
          if (!parsedTimestamps.success) {
            throw new SchemaError('Invalid timestamps file', {
              path: options.timestamps,
              issues: parsedTimestamps.error.issues,
              fix: 'Generate timestamps via `cm timestamps --audio <path>` and retry',
            });
          }

          const clips = await resolveClipInputs({
            clips: options.clips,
            clip: options.clip,
          });

          const mode = String(options.mode ?? 'sequence').toLowerCase();
          if (!['sequence', 'loop', 'map'].includes(mode)) {
            throw new CMError('INVALID_ARGUMENT', `Invalid --mode value: ${options.mode}`, {
              fix: 'Use sequence, loop, or map',
            });
          }

          let sceneMap: Record<string, string> | undefined;
          if (options.map) {
            const rawMap = await readInputFile(options.map);
            sceneMap = parseSceneMap(rawMap, options.map);
          }

          const { importVisualsFromClips } = await import('../../importers/visuals');
          const result = importVisualsFromClips({
            timestamps: parsedTimestamps.data,
            clips,
            mode: mode as 'sequence' | 'loop' | 'map',
            sceneMap,
          });

          await writeOutputFile(options.output, result);
          spinner.succeed('Visuals imported successfully');

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'import:visuals',
                args: {
                  timestamps: options.timestamps,
                  clips: options.clips ?? null,
                  clip: options.clip ?? null,
                  mode,
                  map: options.map ?? null,
                  output: options.output,
                },
                outputs: {
                  visualsPath: options.output,
                  sceneCount: result.scenes.length,
                  totalAssets: result.totalAssets,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          const lines = formatKeyValueRows([
            ['Scenes', String(result.scenes.length)],
            ['Assets', String(result.totalAssets)],
            ['Visuals', options.output],
          ]);
          await writeSummaryCard({
            title: 'Visuals ready',
            lines,
            footerLines: [`Next: cm render --input ${options.output} --audio <audio.wav>`],
          });

          process.stdout.write(`${options.output}\n`);
        } catch (error) {
          spinner.fail('Visual import failed');
          handleCommandError(error);
        }
      })
  )
  .configureHelp({ sortSubcommands: true })
  .showHelpAfterError();
