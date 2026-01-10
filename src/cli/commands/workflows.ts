/**
 * Workflows command - manage workflow definitions
 */
import { Command } from 'commander';
import { homedir } from 'os';
import { join } from 'path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { resolveWorkflow, formatWorkflowSource } from '../../workflows/resolve';
import { listWorkflows } from '../../workflows/registry';
import { installWorkflowPack } from '../../workflows/installer';

const USER_WORKFLOWS_DIR = join(homedir(), '.cm', 'workflows');

function formatWorkflowLine(entry: {
  id: string;
  name: string;
  description?: string;
  source: string;
  workflowPath?: string;
}): string {
  const label = `${entry.id} (${entry.source})`;
  const name = entry.name ? ` - ${entry.name}` : '';
  const desc = entry.description ? `: ${entry.description}` : '';
  const path = entry.workflowPath ? ` @ ${entry.workflowPath}` : '';
  return `${label}${name}${desc}${path}`;
}

export const workflowsCommand = new Command('workflows')
  .description('Manage workflow definitions')
  .addCommand(
    new Command('list')
      .description('List available workflows')
      .option('--source <source>', 'Filter by source (builtin, user, project)')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          const entries = await listWorkflows();
          const filtered = options.source
            ? entries.filter((entry) => entry.source === options.source)
            : entries;

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'workflows:list',
                args: { source: options.source ?? null },
                outputs: { workflows: filtered },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (filtered.length === 0) {
            writeStderrLine('No workflows found.');
            return;
          }

          filtered.forEach((entry) => {
            writeStderrLine(formatWorkflowLine(entry));
          });
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show a workflow definition')
      .argument('<idOrPath>', 'Workflow id or path to workflow.json')
      .action(async (idOrPath) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveWorkflow(String(idOrPath));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'workflows:show',
                args: { workflow: idOrPath },
                outputs: {
                  workflow: resolved.workflow,
                  source: formatWorkflowSource(resolved),
                  workflowPath: resolved.workflowPath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Workflow: ${resolved.workflow.id}`);
          if (resolved.workflowPath) {
            writeStderrLine(`Source: ${resolved.workflowPath}`);
          }
          writeStderrLine(JSON.stringify(resolved.workflow, null, 2));
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate a workflow file or directory')
      .argument('<path>', 'Path to workflow.json or workflow directory')
      .action(async (path) => {
        try {
          const runtime = getCliRuntime();
          const resolved = await resolveWorkflow(String(path));

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'workflows:validate',
                args: { path },
                outputs: {
                  valid: true,
                  workflowId: resolved.workflow.id,
                  workflowPath: resolved.workflowPath ?? null,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Workflow OK: ${resolved.workflow.id}`);
          if (resolved.workflowPath) {
            writeStderrLine(`Path: ${resolved.workflowPath}`);
          }
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('install')
      .description('Install a workflow pack (.zip or directory)')
      .argument('<path>', 'Path to workflow directory or .zip pack')
      .option('--force', 'Overwrite existing workflow if it exists')
      .action(async (path, options) => {
        try {
          const runtime = getCliRuntime();
          const result = await installWorkflowPack({
            sourcePath: String(path),
            destDir: USER_WORKFLOWS_DIR,
            force: Boolean(options.force),
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'workflows:install',
                args: { path, force: Boolean(options.force) },
                outputs: {
                  workflowId: result.id,
                  installPath: result.installPath,
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Installed workflow: ${result.id}`);
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
