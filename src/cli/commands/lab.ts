import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { CMError } from '../../core/errors';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { handleCommandError } from '../utils';
import { createLabSession } from '../../lab/session/session';
import type { LabTask } from '../../lab/session/task';
import { resolveAllowedRoots } from '../../lab/security/path';
import { startLabServer } from '../../lab/server/server';
import { importLabRunFromPath } from '../../lab/services/runs';
import { labExperimentsStorePath } from '../../lab/paths';
import {
  appendExperiment,
  generateExperimentId,
  generateVariantId,
} from '../../lab/stores/experiments-store';
import { LabExperimentSchema } from '../../domain';

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) {
    throw new CMError('INVALID_ARGUMENT', `Invalid port: ${raw}`, {
      fix: 'Use --port 0 for ephemeral or a number between 1..65535.',
    });
  }
  return n;
}

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

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

interface BaseLabOptions {
  host?: string;
  port?: string;
  allowRoot?: string[];
  open?: boolean;
  allowExternal?: boolean;
  exitAfterSubmit?: string;
  stayOpen?: boolean;
}

interface RequireFeedbackOptions {
  requireOverall?: boolean;
}

interface CompareLabOptions extends BaseLabOptions, RequireFeedbackOptions {
  name?: string;
  hypothesis?: string;
  goodBad?: boolean;
}

function buildReviewQuery(options: RequireFeedbackOptions = {}): string {
  const params = new URLSearchParams();
  if (options.requireOverall) params.set('requireOverall', '1');
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function buildCompareQuery(options: CompareLabOptions = {}): string {
  const params = new URLSearchParams();
  if (options.requireOverall) params.set('requireOverall', '1');
  if (options.goodBad) params.set('goodBadMode', '1');
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function computeDefaultAllowedRoots(extra: string[] | undefined): string[] {
  const roots = [process.cwd(), join(process.cwd(), 'output'), ...(extra ?? [])];
  return Array.from(new Set(roots.map((r) => resolve(r))));
}

function shouldAutoOpen(
  runtime: ReturnType<typeof getCliRuntime>,
  options: BaseLabOptions,
  forceIfNotTty: boolean
): boolean {
  if (runtime.json) return false;
  if (options.open === false) return false;
  if (options.open === true) return true;
  if (runtime.isTty) return true;
  if (forceIfNotTty && !process.env.CI && process.env.NODE_ENV !== 'test') return true;
  return false;
}

function parseExitAfterSubmit(options: BaseLabOptions, defaultValue: number): number {
  if (options.stayOpen) return 0;
  if (options.exitAfterSubmit === undefined) return defaultValue;
  const n = Number.parseInt(String(options.exitAfterSubmit), 10);
  if (!Number.isFinite(n) || n < 0 || n > 1000) {
    throw new CMError(
      'INVALID_ARGUMENT',
      `Invalid --exit-after-submit value: ${options.exitAfterSubmit}`,
      {
        fix: 'Use a non-negative integer (0 disables auto-exit).',
      }
    );
  }
  return n;
}

async function resolveLabCommonOptions(options: BaseLabOptions): Promise<{
  runtime: ReturnType<typeof getCliRuntime>;
  host: string;
  port: number;
  allowedRoots: Awaited<ReturnType<typeof resolveAllowedRoots>>;
}> {
  const runtime = getCliRuntime();

  const host = String(options.host ?? '127.0.0.1');
  if (!isLoopbackHost(host) && !options.allowExternal) {
    throw new CMError('FORBIDDEN', `Refusing to bind to non-loopback host: ${host}`, {
      fix: 'Use --host 127.0.0.1 (default) or pass --allow-external if you really want external bind.',
    });
  }

  const port = parsePort(options.port, 3939);
  const allowedRoots = await resolveAllowedRoots(computeDefaultAllowedRoots(options.allowRoot));
  if (allowedRoots.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'No valid --allow-root directories found', {
      fix: 'Start `cm lab` from your repo root or pass --allow-root /abs/path/to/output',
    });
  }

  return { runtime, host, port, allowedRoots };
}

async function startLab(params: {
  runtime: ReturnType<typeof getCliRuntime>;
  options: BaseLabOptions;
  host: string;
  port: number;
  session: ReturnType<typeof createLabSession>;
  allowedRoots: Awaited<ReturnType<typeof resolveAllowedRoots>>;
  task: LabTask | null;
  exitAfterSubmitDefault: number;
  deepLink?: string;
  outputs?: Record<string, unknown>;
}): Promise<void> {
  const exitAfterSubmit = parseExitAfterSubmit(params.options, params.exitAfterSubmitDefault);

  const started = await startLabServer({
    host: params.host,
    port: params.port,
    session: params.session,
    allowedRoots: params.allowedRoots,
    task: params.task,
    exitAfterSubmit,
  });

  const url = started.url + (params.deepLink ? params.deepLink : '');

  if (params.runtime.json) {
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'lab',
        outputs: { url, sessionId: params.session.sessionId, ...(params.outputs ?? {}) },
        timingsMs: Date.now() - params.runtime.startTime,
      })
    );
  } else {
    writeStderrLine(`Lab session: ${params.session.sessionId}`);
    writeStderrLine(`Lab URL: ${url}`);
  }

  // In one-shot review/compare flows we expect a human to act next, so prefer opening even when not in a TTY.
  const forceOpen = params.task !== null;
  if (shouldAutoOpen(params.runtime, params.options, forceOpen)) {
    await openBrowser(url);
  }
}

export const labCommand = new Command('lab')
  .description('Local Experiment Lab (human feedback loop)')
  .option('--host <host>', 'Host to bind (default: 127.0.0.1)', '127.0.0.1')
  .option('--port <port>', 'Port to bind (default: 3939, auto-increments if in use)', '3939')
  .option('--allow-root <path...>', 'Allowed import root(s) for artifacts/video paths')
  .option('--open', 'Auto-open the Lab UI in your browser (TTY default)')
  .option('--no-open', 'Do not auto-open the browser') // negates --open
  .option('--allow-external', 'Allow binding to non-loopback hosts (dangerous)', false)
  .option('--exit-after-submit <n>', 'Auto-exit after N matching submissions (one-shot mode)')
  .option('--stay-open', 'Disable auto-exit even in one-shot flows', false)
  .action(async (options: BaseLabOptions) => {
    try {
      const common = await resolveLabCommonOptions(options);
      const session = createLabSession();
      await startLab({
        runtime: common.runtime,
        options,
        host: common.host,
        port: common.port,
        session,
        allowedRoots: common.allowedRoots,
        task: null,
        exitAfterSubmitDefault: 0,
      });
    } catch (error) {
      handleCommandError(error);
    }
  })
  .addCommand(
    new Command('review')
      .description('One-shot review: import a run and open directly into review')
      .argument('<path>', 'Artifacts directory or output video path')
      .option('--require-overall', 'Require overall feedback before submit (disabled by default)')
      .action(
        async (
          inputPath: string,
          _options: BaseLabOptions & RequireFeedbackOptions,
          command: Command
        ) => {
          try {
            const options = command.optsWithGlobals() as BaseLabOptions & RequireFeedbackOptions;
            const common = await resolveLabCommonOptions(options);
            const session = createLabSession();
            const { run } = await importLabRunFromPath({
              session,
              allowedRoots: common.allowedRoots,
              inputPath,
            });

            await startLab({
              runtime: common.runtime,
              options,
              host: common.host,
              port: common.port,
              task: { type: 'review', runId: run.runId },
              session,
              allowedRoots: common.allowedRoots,
              exitAfterSubmitDefault: 1,
              deepLink: `#/review/${encodeURIComponent(run.runId)}${buildReviewQuery(options)}`,
              outputs: common.runtime.json ? { runId: run.runId } : undefined,
            });
          } catch (error) {
            handleCommandError(error);
          }
        }
      )
  )
  .addCommand(
    new Command('compare')
      .description('One-shot A/B compare: import two runs and open directly into compare')
      .argument('<pathA>', 'Artifacts directory or output video path (A/baseline)')
      .argument('<pathB>', 'Artifacts directory or output video path (B/variant)')
      .option('--name <name>', 'Experiment name', 'A/B Compare')
      .option('--hypothesis <text>', 'Hypothesis (one sentence)')
      .option('--require-overall', 'Require overall feedback before submit (disabled by default)')
      .option('--good-bad', 'Enable Tinder-style good/bad mode (no tie)')
      .action(
        async (pathA: string, pathB: string, _options: CompareLabOptions, command: Command) => {
          try {
            const options = command.optsWithGlobals() as CompareLabOptions;
            const common = await resolveLabCommonOptions(options);
            const session = createLabSession();

            const a = await importLabRunFromPath({
              session,
              allowedRoots: common.allowedRoots,
              inputPath: pathA,
            });
            const b = await importLabRunFromPath({
              session,
              allowedRoots: common.allowedRoots,
              inputPath: pathB,
            });

            const experimentId = generateExperimentId();
            const variantId = generateVariantId();
            const exp = LabExperimentSchema.parse({
              schemaVersion: 1,
              experimentId,
              sessionId: session.sessionId,
              createdAt: new Date().toISOString(),
              name: String(options.name ?? 'A/B Compare').trim() || 'A/B Compare',
              hypothesis:
                typeof options.hypothesis === 'string' && options.hypothesis.trim()
                  ? options.hypothesis.trim()
                  : undefined,
              topic: a.run.topic ?? b.run.topic,
              baselineRunId: a.run.runId,
              variants: [{ variantId, label: 'B', runId: b.run.runId }],
              status: 'queued',
            });
            await appendExperiment(labExperimentsStorePath(), exp);

            await startLab({
              runtime: common.runtime,
              options,
              host: common.host,
              port: common.port,
              session,
              allowedRoots: common.allowedRoots,
              task: { type: 'compare', experimentId },
              exitAfterSubmitDefault: 1,
              deepLink: `#/compare/${encodeURIComponent(experimentId)}${buildCompareQuery(options)}`,
              outputs: { experimentId, baselineRunId: a.run.runId, variantRunId: b.run.runId },
            });
          } catch (error) {
            handleCommandError(error);
          }
        }
      )
  );
