import { Command } from 'commander';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdout } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { loadConfig, resolveConfigFiles } from '../../core/config';

function writePrettyJson(value: unknown): void {
  writeStdout(`${JSON.stringify(value, null, 2)}\n`);
}

export const configCommand = new Command('config')
  .description('Inspect resolved configuration')
  .addCommand(
    new Command('paths')
      .description('Show which config files would be loaded (merge order)')
      .action(async () => {
        try {
          const runtime = getCliRuntime();
          const files = resolveConfigFiles();

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: runtime.command ?? 'config:paths',
                outputs: { files },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine('Config files (merge order):');
          if (files.userConfigPath) writeStderrLine(`- user:    ${files.userConfigPath}`);
          else writeStderrLine(`- user:    (none)`);

          if (files.projectConfigPath) writeStderrLine(`- project: ${files.projectConfigPath}`);
          else writeStderrLine(`- project: (none)`);

          if (files.envConfigPath) writeStderrLine(`- CM_CONFIG: ${files.envConfigPath}`);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('show').description('Print resolved config (defaults applied)').action(async () => {
      try {
        const runtime = getCliRuntime();
        const files = resolveConfigFiles();
        const config = loadConfig();

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: runtime.command ?? 'config:show',
              outputs: { config, files },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          return;
        }

        writeStderrLine('Resolved config:');
        writeStderrLine(
          `- loaded from: ${files.loadedConfigPaths.length ? files.loadedConfigPaths.join(', ') : '(defaults only)'}`
        );
        writePrettyJson(config);
      } catch (error) {
        handleCommandError(error);
      }
    })
  )
  .addCommand(
    new Command('validate').description('Validate config and exit 0 if ok').action(async () => {
      try {
        const runtime = getCliRuntime();
        const files = resolveConfigFiles();
        loadConfig();

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: runtime.command ?? 'config:validate',
              outputs: { ok: true, files },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          return;
        }

        writeStderrLine('Config: OK');
        if (files.loadedConfigPaths.length) {
          writeStderrLine(`Loaded: ${files.loadedConfigPaths.join(', ')}`);
        }
      } catch (error) {
        handleCommandError(error);
      }
    })
  )
  .configureHelp({ sortSubcommands: true })
  .showHelpAfterError();
