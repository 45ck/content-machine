/**
 * Workflow registry helpers (list, resolve).
 */
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../domain';
import { createLogger } from '../core/logger';
import { listBuiltinWorkflows } from './resolve';

export type WorkflowSource = 'builtin' | 'user' | 'project';

export interface ListedWorkflow {
  id: string;
  name: string;
  description?: string;
  source: WorkflowSource;
  workflowPath?: string;
}

export interface ListWorkflowsOptions {
  includeBuiltin?: boolean;
  userDir?: string;
  projectDir?: string;
}

const DEFAULT_USER_DIR = join(homedir(), '.cm', 'workflows');
const DEFAULT_PROJECT_DIR = join(process.cwd(), '.cm', 'workflows');

async function readWorkflowFile(path: string): Promise<WorkflowDefinition | null> {
  const log = createLogger({ module: 'workflows:registry' });
  try {
    const raw = await readFile(path, 'utf-8');
    const parsedJson = JSON.parse(raw);
    const parsed = WorkflowDefinitionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      log.warn({ path, issues: parsed.error.issues }, 'Invalid workflow.json');
      return null;
    }
    return parsed.data;
  } catch (error) {
    log.warn({ path, error }, 'Failed to read workflow.json');
    return null;
  }
}

async function listWorkflowsFromDir(
  root: string,
  source: WorkflowSource
): Promise<ListedWorkflow[]> {
  if (!existsSync(root)) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const workflows: ListedWorkflow[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workflowPath = join(root, entry.name, 'workflow.json');
    if (!existsSync(workflowPath)) continue;

    const workflow = await readWorkflowFile(workflowPath);
    if (!workflow) continue;

    workflows.push({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      source,
      workflowPath,
    });
  }

  return workflows;
}

export async function listWorkflows(options: ListWorkflowsOptions = {}): Promise<ListedWorkflow[]> {
  const includeBuiltin = options.includeBuiltin !== false;
  const userDir = options.userDir ?? DEFAULT_USER_DIR;
  const projectDir = options.projectDir ?? DEFAULT_PROJECT_DIR;

  const results: ListedWorkflow[] = [];
  if (includeBuiltin) {
    const builtins = listBuiltinWorkflows().map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      source: 'builtin' as const,
    }));
    results.push(...builtins);
  }

  const [userWorkflows, projectWorkflows] = await Promise.all([
    listWorkflowsFromDir(userDir, 'user'),
    listWorkflowsFromDir(projectDir, 'project'),
  ]);

  results.push(...projectWorkflows, ...userWorkflows);
  return results;
}
