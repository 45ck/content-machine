/**
 * Workflow developer tooling.
 *
 * - scaffoldWorkflow(): create a new workflow directory + workflow.json
 * - packWorkflow(): bundle a workflow directory into a .zip pack for install
 */
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import AdmZip from 'adm-zip';
import { CMError, NotFoundError, SchemaError } from '../core/errors';
import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../domain';
import { WorkflowIdSchema } from '../domain/ids';
import { resolveWorkflow } from './resolve';

export interface ScaffoldWorkflowOptions {
  id: string;
  rootDir: string;
  /** Base workflow id or path. */
  from?: string;
  /** Overwrite if the destination directory already exists. */
  force?: boolean;
}

export interface ScaffoldWorkflowResult {
  id: string;
  workflowDir: string;
  workflowPath: string;
}

export interface PackWorkflowOptions {
  workflowDir: string;
  /** Output path for the workflow pack zip. Defaults to `<parent>/<id>.cmworkflow.zip`. */
  outputPath?: string;
}

export interface PackWorkflowResult {
  id: string;
  outputPath: string;
}

function toTitleCaseFromId(id: string): string {
  return id
    .trim()
    .split(/[-_ ]+/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function assertNonEmpty(value: string, label: string): string {
  if (!value || !value.trim()) {
    throw new SchemaError(`Invalid ${label}`, {
      [label]: value,
      fix: `Provide a non-empty ${label}`,
    });
  }
  return value.trim();
}

/**
 * Scaffold a new workflow directory under `rootDir`.
 *
 * Workflows are data-only JSON definitions consumed by `cm generate`.
 */
export async function scaffoldWorkflow(
  options: ScaffoldWorkflowOptions
): Promise<ScaffoldWorkflowResult> {
  const idRaw = assertNonEmpty(options.id, 'id');
  const parsedId = WorkflowIdSchema.safeParse(idRaw);
  if (!parsedId.success) {
    throw new SchemaError('Invalid workflow id', {
      id: idRaw,
      issues: parsedId.error.issues,
      fix: 'Use a kebab-case workflow id (letters/digits/hyphens), e.g. "default"',
    });
  }
  const id = parsedId.data;
  const rootDir = resolve(assertNonEmpty(options.rootDir, 'rootDir'));
  const from = options.from ? assertNonEmpty(options.from, 'from') : undefined;

  const workflowDir = join(rootDir, id);
  const workflowPath = join(workflowDir, 'workflow.json');

  if (existsSync(workflowDir)) {
    if (!options.force) {
      throw new CMError('ALREADY_EXISTS', `Workflow directory already exists: ${workflowDir}`, {
        workflowDir,
        fix: 'Use --force to overwrite the existing workflow directory',
      });
    }
    await rm(workflowDir, { recursive: true, force: true });
  }

  await mkdir(workflowDir, { recursive: true });

  let base: WorkflowDefinition | null = null;
  if (from) {
    const resolvedBase = await resolveWorkflow(from);
    base = resolvedBase.workflow;
  }

  const candidate: WorkflowDefinition = WorkflowDefinitionSchema.parse(
    base
      ? {
          ...base,
          id,
          name: toTitleCaseFromId(id) || base.name || id,
          description: base.description,
        }
      : {
          schemaVersion: '1.0.0',
          id,
          name: toTitleCaseFromId(id) || id,
          description: 'Generated workflow scaffold (edit as needed).',
          stages: {
            script: { mode: 'builtin' },
            audio: { mode: 'builtin' },
            visuals: { mode: 'builtin' },
            render: { mode: 'builtin' },
          },
        }
  );

  await writeFile(workflowPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf-8');
  return { id: candidate.id, workflowDir, workflowPath };
}

async function loadWorkflowFromDir(
  workflowDir: string
): Promise<{ workflow: WorkflowDefinition; workflowPath: string }> {
  const workflowPath = join(workflowDir, 'workflow.json');
  if (!existsSync(workflowPath)) {
    throw new NotFoundError(`workflow.json not found: ${workflowPath}`, {
      resource: 'workflow',
      identifier: workflowDir,
      workflowPath,
      fix: 'Ensure the directory contains a workflow.json file',
    });
  }

  const raw = await readFile(workflowPath, 'utf-8');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid workflow.json', {
      path: workflowPath,
      error: error instanceof Error ? error.message : String(error),
      fix: 'Fix JSON syntax errors in workflow.json',
    });
  }

  const parsed = WorkflowDefinitionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid workflow schema', {
      path: workflowPath,
      issues: parsed.error.issues,
      fix: 'Update workflow.json to match the required schema',
    });
  }

  return { workflow: parsed.data, workflowPath };
}

/**
 * Pack a workflow directory into a `.cmworkflow.zip` bundle.
 */
export async function packWorkflow(options: PackWorkflowOptions): Promise<PackWorkflowResult> {
  const workflowDir = resolve(assertNonEmpty(options.workflowDir, 'workflowDir'));
  if (!existsSync(workflowDir)) {
    throw new NotFoundError(`Workflow directory not found: ${workflowDir}`, {
      resource: 'workflow',
      identifier: workflowDir,
      fix: 'Provide a valid workflow directory path',
    });
  }

  const stats = await stat(workflowDir);
  if (!stats.isDirectory()) {
    throw new CMError('INVALID_WORKFLOW', 'Workflow path must be a directory', {
      workflowDir,
      fix: 'Provide a directory containing workflow.json',
    });
  }

  const { workflow } = await loadWorkflowFromDir(workflowDir);
  const outputPath = resolve(
    options.outputPath
      ? assertNonEmpty(options.outputPath, 'outputPath')
      : join(dirname(workflowDir), `${workflow.id}.cmworkflow.zip`)
  );

  // If the output path already exists, remove it so it does not get included during packing.
  if (existsSync(outputPath)) {
    await rm(outputPath, { force: true });
  }
  await mkdir(dirname(outputPath), { recursive: true });

  const zip = new AdmZip();
  zip.addLocalFolder(workflowDir, workflow.id, (filename) => {
    const normalized = filename.replace(/\\/g, '/');
    if (normalized.includes('/node_modules/')) return false;
    if (normalized.endsWith('/node_modules')) return false;
    if (normalized.includes('/.git/')) return false;
    if (normalized.endsWith('/.git')) return false;
    return true;
  });
  zip.writeZip(outputPath);

  return { id: workflow.id, outputPath };
}
