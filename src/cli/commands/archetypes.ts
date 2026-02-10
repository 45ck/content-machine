/**
 * Archetypes command - manage archetype definitions (data files).
 */
import { Command } from 'commander';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { formatArchetypeSource, listArchetypes, resolveArchetype } from '../../archetypes/registry';
import { scaffoldArchetype, packArchetype } from '../../archetypes/dev';
import { installArchetypePack } from '../../archetypes/installer';

const USER_ARCHETYPES_DIR = join(homedir(), '.cm', 'archetypes');
const PROJECT_ARCHETYPES_DIR = join(process.cwd(), '.cm', 'archetypes');

function formatLine(entry: {
  id: string;
  name: string;
  description?: string;
  source: string;
  path?: string;
}): string {
  const label = `${entry.id} (${entry.source})`;
  const name = entry.name ? ` - ${entry.name}` : '';
  const desc = entry.description ? `: ${entry.description}` : '';
  const path = entry.path ? ` @ ${entry.path}` : '';
  return `${label}${name}${desc}${path}`;
}

export const archetypesCommand = new Command('archetypes')
  .description('Manage script archetypes (script formats)')
  .addCommand(
    new Command('new')
      .description('Scaffold a new archetype YAML file')
      .argument('<id>', 'New archetype id')
      .option('--root <dir>', 'Destination archetypes directory', PROJECT_ARCHETYPES_DIR)
      .option('--from <idOrPath>', 'Base archetype id or path', 'listicle')
      .option('--force', 'Overwrite existing file if it exists', false)
      .action(async (id, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await scaffoldArchetype({
            id: String(id),
            rootDir: String(options.root ?? PROJECT_ARCHETYPES_DIR),
            from: options.from ? String(options.from) : undefined,
            force: Boolean(options.force),
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'archetypes:new',
                args: {
                  id,
                  root: options.root ?? PROJECT_ARCHETYPES_DIR,
                  from: options.from ?? 'listicle',
                  force: Boolean(options.force),
                },
                outputs: { archetypeId: result.id, archetypePath: result.archetypePath },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Scaffolded archetype: ${result.id}`);
          writeStderrLine(`Location: ${result.archetypePath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('pack')
      .description('Pack an archetype file or directory into a .zip archetype pack')
      .argument('<path>', 'Path to an archetype YAML/JSON file (or a directory containing one)')
      .option('-o, --output <path>', 'Output .zip path')
      .action(async (path, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await packArchetype({
            path: String(path),
            outputPath: options.output ? String(options.output) : undefined,
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'archetypes:pack',
                args: { path, output: options.output ?? null },
                outputs: { archetypeId: result.id, outputPath: result.outputPath },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Packed archetype: ${result.id}`);
          writeStderrLine(`Output: ${result.outputPath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('list').description('List available archetypes').action(async () => {
      try {
        const runtime = getCliRuntime();
        const entries = listArchetypes();

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: 'archetypes:list',
              args: {},
              outputs: { archetypes: entries },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          return;
        }

        if (entries.length === 0) {
          writeStderrLine('No archetypes found.');
          return;
        }

        entries.forEach((entry) => writeStderrLine(formatLine(entry)));
      } catch (error) {
        handleCommandError(error);
      }
    })
  )
  .addCommand(
    new Command('install')
      .description('Install an archetype pack (.zip) or archetype file')
      .argument('<path>', 'Path to a .zip pack, file, or directory containing an archetype')
      .option('--force', 'Overwrite existing archetype if it exists')
      .action(async (path, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await installArchetypePack({
            sourcePath: String(path),
            destDir: USER_ARCHETYPES_DIR,
            force: Boolean(options.force),
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'archetypes:install',
                args: { path, force: Boolean(options.force) },
                outputs: { archetypeId: result.id, installPath: result.installPath },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Installed archetype: ${result.id}`);
          writeStderrLine(`Location: ${result.installPath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show an archetype definition')
      .argument('<idOrPath>', 'Archetype id or path to an archetype YAML/JSON file')
      .action(async (idOrPath) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveArchetype(String(idOrPath));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'archetypes:show',
                args: { archetype: idOrPath },
                outputs: {
                  archetype: resolved.archetype,
                  source: formatArchetypeSource(resolved),
                  archetypePath: resolved.archetypePath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Archetype: ${resolved.archetype.id}`);
          writeStderrLine(`Source: ${formatArchetypeSource(resolved)}`);
          writeStderrLine(JSON.stringify(resolved.archetype, null, 2));
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate an archetype file')
      .argument('<path>', 'Path to an archetype YAML/JSON file')
      .action(async (path) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveArchetype(String(path));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'archetypes:validate',
                args: { path },
                outputs: {
                  valid: true,
                  archetypeId: resolved.archetype.id,
                  archetypePath: resolved.archetypePath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Archetype OK: ${resolved.archetype.id}`);
          if (resolved.archetypePath) writeStderrLine(`Path: ${resolved.archetypePath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .configureHelp({ sortSubcommands: true })
  .showHelpAfterError();
