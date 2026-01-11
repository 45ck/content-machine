/**
 * Workflow execution helpers.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { CMError } from '../core/errors';
import type {
  WorkflowCommand,
  WorkflowDefinition,
  WorkflowStage,
  WorkflowStageMode,
  WorkflowStages,
} from './schema';

export interface WorkflowCommandRunOptions {
  baseDir?: string;
  allowOutput?: boolean;
}

export function resolveWorkflowStageMode(stage?: WorkflowStage): WorkflowStageMode {
  if (!stage) return 'builtin';
  if (stage.mode && stage.mode !== 'builtin') return stage.mode;
  if (stage.exec) return 'external';
  return stage.mode ?? 'builtin';
}

export function workflowHasExec(workflow: WorkflowDefinition): boolean {
  const hooks = workflow.hooks;
  if (hooks?.pre && hooks.pre.length > 0) return true;
  if (hooks?.post && hooks.post.length > 0) return true;
  return collectStageExecCommands(workflow.stages).length > 0;
}

function collectStageExecCommands(stages: WorkflowStages | undefined): WorkflowCommand[] {
  if (!stages) return [];
  const order: Array<keyof WorkflowStages> = ['script', 'audio', 'visuals', 'render'];
  const commands: WorkflowCommand[] = [];
  for (const key of order) {
    const stage = stages[key];
    if (!stage?.exec) continue;
    const mode = resolveWorkflowStageMode(stage);
    if (mode === 'builtin') continue;
    commands.push(stage.exec);
  }
  return commands;
}

export function collectWorkflowPreCommands(workflow: WorkflowDefinition): WorkflowCommand[] {
  const pre = workflow.hooks?.pre ?? [];
  const stageExecs = collectStageExecCommands(workflow.stages);
  return [...pre, ...stageExecs];
}

export function collectWorkflowPostCommands(workflow: WorkflowDefinition): WorkflowCommand[] {
  return workflow.hooks?.post ?? [];
}

function resolveCommandCwd(
  command: WorkflowCommand,
  baseDir: string | undefined
): string | undefined {
  if (command.cwd) {
    return resolve(baseDir ?? process.cwd(), command.cwd);
  }
  return baseDir;
}

async function runWorkflowCommand(
  command: WorkflowCommand,
  options: WorkflowCommandRunOptions
): Promise<void> {
  const cwd = resolveCommandCwd(command, options.baseDir);
  const env = { ...process.env, ...(command.env ?? {}) };
  const stdio = options.allowOutput ? 'inherit' : 'pipe';

  const child = spawn(command.command, command.args ?? [], {
    cwd,
    env,
    stdio,
    shell: true,
  });

  const timeoutMs = command.timeoutMs;
  let timeout: NodeJS.Timeout | undefined;
  if (timeoutMs && timeoutMs > 0) {
    timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
  }

  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolveExit(code));
  });

  if (timeout) {
    clearTimeout(timeout);
  }

  if (exitCode !== 0) {
    throw new CMError('WORKFLOW_COMMAND_FAILED', 'Workflow command failed', {
      command: command.command,
      args: command.args ?? [],
      cwd,
      exitCode,
      fix: 'Check the command output and ensure it returns exit code 0',
    });
  }
}

export async function runWorkflowCommands(
  commands: WorkflowCommand[],
  options: WorkflowCommandRunOptions
): Promise<void> {
  for (const command of commands) {
    await runWorkflowCommand(command, options);
  }
}
