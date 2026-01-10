/**
 * Workflow resolution helpers.
 *
 * Resolve workflows by id or by path to workflow.json.
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { NotFoundError, SchemaError } from '../core/errors';
import { WorkflowDefinitionSchema, type WorkflowDefinition } from './schema';

export interface ResolvedWorkflow {
  workflow: WorkflowDefinition;
  /** Original spec provided (id or path). */
  spec: string;
  /** Where the workflow was loaded from. */
  source: 'builtin' | 'file';
  /** Absolute workflow.json path when source === 'file'. */
  workflowPath?: string;
  /** Directory containing workflow.json */
  baseDir?: string;
}

const BUILTIN_WORKFLOWS: Record<string, WorkflowDefinition> = {};

export function listBuiltinWorkflows(): WorkflowDefinition[] {
  return Object.values(BUILTIN_WORKFLOWS);
}

export function getBuiltinWorkflow(id: string): WorkflowDefinition | undefined {
  return BUILTIN_WORKFLOWS[id];
}

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function looksLikePath(spec: string): boolean {
  return (
    spec.includes('/') ||
    spec.includes('\\') ||
    spec.startsWith('.') ||
    spec.startsWith('~') ||
    /^[a-zA-Z]:[\\/]/.test(spec) ||
    spec.endsWith('.json')
  );
}

async function loadWorkflowFromFile(workflowPath: string): Promise<WorkflowDefinition> {
  const absolutePath = resolve(expandTilde(workflowPath));
  const raw = await readFile(absolutePath, 'utf-8');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid workflow JSON', {
      path: absolutePath,
      fix: 'Fix JSON syntax and re-run with `cm workflows validate <path>`',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const parsed = WorkflowDefinitionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid workflow definition', {
      path: absolutePath,
      issues: parsed.error.issues,
      fix: 'Validate required fields (id, name) and fix schema issues',
    });
  }

  return parsed.data;
}

async function resolveWorkflowFilePath(spec: string): Promise<string> {
  const expanded = resolve(expandTilde(spec));

  if (existsSync(expanded)) {
    const st = await stat(expanded);
    if (st.isDirectory()) return join(expanded, 'workflow.json');
    return expanded;
  }

  return expanded;
}

/**
 * Resolve a workflow by id or by file path.
 */
export async function resolveWorkflow(spec: string): Promise<ResolvedWorkflow> {
  if (!spec || !spec.trim()) {
    throw new SchemaError('Invalid --workflow value', {
      spec,
      fix: 'Provide a workflow id or a path to workflow.json',
    });
  }

  if (looksLikePath(spec) || existsSync(resolve(expandTilde(spec)))) {
    const workflowPath = await resolveWorkflowFilePath(spec);
    if (!existsSync(workflowPath)) {
      throw new NotFoundError(`Workflow file not found: ${workflowPath}`, {
        resource: 'workflow',
        identifier: spec,
        workflowPath,
        fix: 'Provide a valid path (file or dir containing workflow.json)',
      });
    }
    const workflow = await loadWorkflowFromFile(workflowPath);
    return {
      workflow,
      spec,
      source: 'file',
      workflowPath,
      baseDir: dirname(workflowPath),
    };
  }

  const builtin = getBuiltinWorkflow(spec);
  if (builtin) {
    return { workflow: builtin, spec, source: 'builtin' };
  }

  const candidates = [
    join(process.cwd(), '.cm', 'workflows', spec, 'workflow.json'),
    join(homedir(), '.cm', 'workflows', spec, 'workflow.json'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const workflow = await loadWorkflowFromFile(candidate);
    return {
      workflow,
      spec,
      source: 'file',
      workflowPath: candidate,
      baseDir: dirname(candidate),
    };
  }

  throw new NotFoundError(`Unknown workflow: ${spec}`, {
    resource: 'workflow',
    identifier: spec,
    searched: candidates,
    fix: 'Install a workflow to ~/.cm/workflows/<id>/workflow.json, or pass a path via --workflow',
  });
}

export function formatWorkflowSource(resolved: ResolvedWorkflow): string {
  if (resolved.source === 'builtin') return `builtin:${resolved.workflow.id}`;
  return resolved.workflowPath ? `file:${resolved.workflowPath}` : 'file';
}
