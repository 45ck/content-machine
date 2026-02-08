/**
 * Templates command - manage video templates
 */
import { Command } from 'commander';
import { homedir } from 'os';
import { join } from 'path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { CMError } from '../../core/errors';
import { resolveVideoTemplate } from '../../render/templates';
import { listVideoTemplates } from '../../render/templates/registry';
import { installTemplatePack } from '../../render/templates/installer';
import { packVideoTemplate, scaffoldVideoTemplate } from '../../render/templates/dev';

const USER_TEMPLATES_DIR = join(homedir(), '.cm', 'templates');
const PROJECT_TEMPLATES_DIR = join(process.cwd(), '.cm', 'templates');

function formatTemplateLine(entry: {
  id: string;
  name: string;
  description?: string;
  source: string;
  templatePath?: string;
}): string {
  const label = `${entry.id} (${entry.source})`;
  const name = entry.name ? ` - ${entry.name}` : '';
  const desc = entry.description ? `: ${entry.description}` : '';
  const path = entry.templatePath ? ` @ ${entry.templatePath}` : '';
  return `${label}${name}${desc}${path}`;
}

export const templatesCommand = new Command('templates')
  .description('Manage video templates')
  .addCommand(
    new Command('new')
      .description('Scaffold a new template directory')
      .argument('<id>', 'New template id')
      .option('--root <dir>', 'Destination templates root directory', PROJECT_TEMPLATES_DIR)
      .option('--from <idOrPath>', 'Base template id or path', 'tiktok-captions')
      .option('--mode <mode>', 'Template mode (data, code)', 'data')
      .option('--force', 'Overwrite existing directory if it exists', false)
      .action(async (id, options) => {
        try {
          const runtime = getCliRuntime();
          const modeRaw = String(options.mode ?? 'data');
          if (modeRaw !== 'data' && modeRaw !== 'code') {
            throw new CMError('INVALID_ARGUMENT', `Invalid --mode value: ${modeRaw}`, {
              fix: 'Use --mode data (safe) or --mode code (trusted Remotion project)',
            });
          }
          const result = await scaffoldVideoTemplate({
            id: String(id),
            rootDir: String(options.root ?? PROJECT_TEMPLATES_DIR),
            from: options.from ? String(options.from) : undefined,
            mode: modeRaw,
            force: Boolean(options.force),
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:new',
                args: {
                  id,
                  root: options.root ?? PROJECT_TEMPLATES_DIR,
                  from: options.from ?? 'tiktok-captions',
                  mode: modeRaw,
                  force: Boolean(options.force),
                },
                outputs: {
                  templateId: result.id,
                  templateDir: result.templateDir,
                  templatePath: result.templatePath,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Scaffolded template: ${result.id}`);
          writeStderrLine(`Location: ${result.templateDir}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('pack')
      .description('Pack a template directory into a .zip template pack')
      .argument('<path>', 'Path to a template directory')
      .option('-o, --output <path>', 'Output .zip path')
      .action(async (path, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await packVideoTemplate({
            templateDir: String(path),
            outputPath: options.output ? String(options.output) : undefined,
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:pack',
                args: { path, output: options.output ?? null },
                outputs: { templateId: result.id, outputPath: result.outputPath },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Packed template: ${result.id}`);
          writeStderrLine(`Output: ${result.outputPath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List available templates')
      .option('--source <source>', 'Filter by source (builtin, user, project)')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          const entries = await listVideoTemplates();
          const filtered = options.source
            ? entries.filter((entry) => entry.source === options.source)
            : entries;

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:list',
                args: { source: options.source ?? null },
                outputs: { templates: filtered },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (filtered.length === 0) {
            writeStderrLine('No templates found.');
            return;
          }

          filtered.forEach((entry) => {
            writeStderrLine(formatTemplateLine(entry));
          });
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show a template definition')
      .argument('<idOrPath>', 'Template id or path to template.json')
      .action(async (idOrPath) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveVideoTemplate(String(idOrPath));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:show',
                args: { template: idOrPath },
                outputs: {
                  template: resolved.template,
                  source: resolved.source,
                  templatePath: resolved.templatePath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Template: ${resolved.template.id}`);
          if (resolved.templatePath) {
            writeStderrLine(`Source: ${resolved.templatePath}`);
          }
          writeStderrLine(JSON.stringify(resolved.template, null, 2));
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate a template file or directory')
      .argument('<path>', 'Path to template.json or template directory')
      .action(async (path) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveVideoTemplate(String(path));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:validate',
                args: { path },
                outputs: {
                  valid: true,
                  templateId: resolved.template.id,
                  templatePath: resolved.templatePath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Template OK: ${resolved.template.id}`);
          if (resolved.templatePath) {
            writeStderrLine(`Path: ${resolved.templatePath}`);
          }
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('install')
      .description('Install a template pack (.zip or directory)')
      .argument('<path>', 'Path to template directory or .zip pack')
      .option('--force', 'Overwrite existing template if it exists')
      .action(async (path, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await installTemplatePack({
            sourcePath: String(path),
            destDir: USER_TEMPLATES_DIR,
            force: Boolean(options.force),
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'templates:install',
                args: { path, force: Boolean(options.force) },
                outputs: {
                  templateId: result.id,
                  installPath: result.installPath,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Installed template: ${result.id}`);
          writeStderrLine(`Location: ${result.installPath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .configureHelp({
    sortSubcommands: true,
  })
  .showHelpAfterError();
