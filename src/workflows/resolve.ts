/**
 * Workflow resolution helpers.
 *
 * Resolve workflows by id or by path to workflow.json.
 */
import { readFile } from 'fs/promises';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { stat } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { NotFoundError, SchemaError } from '../core/errors';
import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../domain';
import { createRequireSafe } from '../core/require';

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

function getPackageRoot(): string {
  const require = createRequireSafe(import.meta.url);
  const candidates = ['../../package.json', '../package.json', './package.json'];
  for (const candidate of candidates) {
    try {
      const pkgJsonPath = require.resolve(candidate);
      return dirname(pkgJsonPath);
    } catch {
      continue;
    }
  }
  throw new SchemaError('Unable to locate package.json to resolve built-in workflows', {
    fix: 'Run CM from an installed package or from a repository checkout that contains package.json',
  });
}

function getBuiltinWorkflowsDir(): string {
  return join(getPackageRoot(), 'assets', 'workflows');
}

function loadBuiltinWorkflowsSync(): Record<string, WorkflowDefinition> {
  const root = getBuiltinWorkflowsDir();
  if (!existsSync(root)) return {};

  const entries = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const workflows: Record<string, WorkflowDefinition> = {};

  for (const entry of entries) {
    const workflowPath = join(root, entry.name, 'workflow.json');
    if (!existsSync(workflowPath)) continue;

    const raw = readFileSync(workflowPath, 'utf-8');
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new SchemaError('Invalid built-in workflow JSON', {
        path: workflowPath,
        error: error instanceof Error ? error.message : String(error),
        fix: 'Fix JSON syntax in assets/workflows/*/workflow.json',
      });
    }

    const parsed = WorkflowDefinitionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new SchemaError('Invalid built-in workflow definition', {
        path: workflowPath,
        issues: parsed.error.issues,
        fix: 'Fix schema issues in assets/workflows/*/workflow.json',
      });
    }

    workflows[parsed.data.id] = parsed.data;
  }

  return workflows;
}

const BUILTIN_WORKFLOWS = loadBuiltinWorkflowsSync();
let builtinWorkflowOverrides: Record<string, WorkflowDefinition> | null = null;

export function __setBuiltinWorkflows(workflows: Record<string, WorkflowDefinition>): void {
  builtinWorkflowOverrides = { ...workflows };
}

export function __resetBuiltinWorkflows(): void {
  builtinWorkflowOverrides = null;
}

export function listBuiltinWorkflows(): WorkflowDefinition[] {
  return Object.values(builtinWorkflowOverrides ?? BUILTIN_WORKFLOWS);
}

export function getBuiltinWorkflow(id: string): WorkflowDefinition | undefined {
  return (builtinWorkflowOverrides ?? BUILTIN_WORKFLOWS)[id];
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

  const builtin = getBuiltinWorkflow(spec);
  if (builtin) {
    return { workflow: builtin, spec, source: 'builtin' };
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
