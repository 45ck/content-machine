/**
 * Demo command - generate a deterministic mock video + artifacts
 *
 * Usage: cm demo --output output/demo.mp4
 */
import { Command } from 'commander';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { runDemo } from '../../demo/runner';
import { createLabSession } from '../../lab/session/session';
import { resolveAllowedRoots } from '../../lab/security/path';
import { startLabServer } from '../../lab/server/server';
import { importLabRunFromPath } from '../../lab/services/runs';
import type { LabTask } from '../../lab/session/task';

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];

  await new Promise<void>((resolvePromise) => {
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.on('error', () => resolvePromise());
    child.on('close', () => resolvePromise());
  });
}

export const demoCommand = new Command('demo')
  .description('Render a deterministic mock demo video (no API keys required)')
  .option('-o, --output <path>', 'Output mp4 path', 'output/demo.mp4')
  .option('--topic <topic>', 'Demo topic', 'Content Machine demo')
  .option('--duration <seconds>', 'Approximate duration in seconds', '20')
  .option('--open-lab', 'Open the Experiment Lab review UI after rendering', false)
  .action(
    async (options: { output?: string; topic?: string; duration?: string; openLab?: boolean }) => {
      try {
        const runtime = getCliRuntime();
        const outputPath = resolve(String(options.output ?? 'output/demo.mp4'));
        const durationSeconds = Number.parseInt(String(options.duration ?? '20'), 10);
        const topic = String(options.topic ?? 'Content Machine demo');

        const result = await runDemo({ outputPath, topic, durationSeconds });

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: 'demo',
              args: {
                output: outputPath,
                topic,
                duration: durationSeconds,
                openLab: Boolean(options.openLab),
              },
              outputs: result as unknown as Record<string, unknown>,
              timingsMs: Date.now() - runtime.startTime,
            })
          );
        } else {
          writeStderrLine('Demo video rendered.');
          writeStderrLine(`Artifacts: ${result.artifactsDir}`);
          writeStderrLine(`Video: ${result.outputPath}`);
          writeStderrLine(`Next: cm lab review ${result.outputPath}`);

          // Human-mode stdout should be reserved for the primary artifact path.
          writeStdoutLine(result.outputPath);
        }

        if (!options.openLab || runtime.json) {
          process.exitCode = 0;
          return;
        }

        const session = createLabSession();
        const allowedRoots = await resolveAllowedRoots([
          resolve(process.cwd()),
          resolve(result.artifactsDir),
        ]);
        const { run } = await importLabRunFromPath({
          session,
          allowedRoots,
          inputPath: result.artifactsDir,
        });

        const task: LabTask = { type: 'review', runId: run.runId };
        const started = await startLabServer({
          host: '127.0.0.1',
          port: 0,
          session,
          allowedRoots,
          task,
          exitAfterSubmit: 1,
        });

        const url = started.url + `#/review/${encodeURIComponent(run.runId)}`;
        writeStderrLine(`Lab URL: ${url}`);
        await openBrowser(url);
      } catch (error) {
        handleCommandError(error);
      }
    }
  )
  .showHelpAfterError();
