/**
 * Workflow installer helpers.
 */
import { cp, mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve, extname } from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { WorkflowDefinitionSchema } from './schema';
import { CMError, NotFoundError, SchemaError } from '../core/errors';

interface InstallWorkflowOptions {
  sourcePath: string;
  destDir: string;
  force?: boolean;
}

interface InstallWorkflowResult {
  id: string;
  installPath: string;
}

function isZip(path: string): boolean {
  return extname(path).toLowerCase() === '.zip';
}

async function extractZipToTemp(zipPath: string): Promise<string> {
  const zip = new AdmZip(zipPath);
  const tempDir = await mkdtemp(join(tmpdir(), 'cm-workflow-'));

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new CMError('INVALID_WORKFLOW', 'Workflow zip contains unsafe paths', {
        entry: entry.entryName,
        fix: 'Remove any absolute paths or .. segments from the workflow zip',
      });
    }

    const destPath = resolve(join(tempDir, normalized));
    if (!destPath.startsWith(tempDir)) {
      throw new CMError('INVALID_WORKFLOW', 'Workflow zip extraction escaped temp dir', {
        entry: entry.entryName,
      });
    }

    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, entry.getData());
  }

  return tempDir;
}

async function findWorkflowRoot(root: string): Promise<string> {
  const workflowJson = join(root, 'workflow.json');
  if (existsSync(workflowJson)) {
    return root;
  }

  const entries = await readdir(root, { withFileTypes: true });
  const candidates: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = join(root, entry.name, 'workflow.json');
    if (existsSync(candidate)) {
      candidates.push(join(root, entry.name));
    }
  }

  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) {
    throw new NotFoundError('workflow.json not found in workflow pack', {
      resource: 'workflow',
      identifier: root,
      fix: 'Ensure workflow.json exists at the root of the workflow directory',
    });
  }

  throw new CMError('INVALID_WORKFLOW', 'Multiple workflow.json files found', {
    root,
    candidates,
    fix: 'Workflow packs must contain exactly one workflow.json',
  });
}

async function loadWorkflowFromDir(workflowDir: string) {
  const workflowPath = join(workflowDir, 'workflow.json');
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

export async function installWorkflowPack(
  options: InstallWorkflowOptions
): Promise<InstallWorkflowResult> {
  const source = resolve(options.sourcePath);
  if (!existsSync(source)) {
    throw new NotFoundError(`Workflow source not found: ${source}`, {
      resource: 'workflow',
      identifier: source,
      fix: 'Provide a valid workflow directory or .zip pack',
    });
  }

  const stats = await stat(source);
  const destDir = resolve(options.destDir);
  const cleanupPaths: string[] = [];

  let workflowRoot = source;

  if (stats.isFile()) {
    if (!isZip(source)) {
      throw new CMError('INVALID_WORKFLOW', 'Workflow source must be a directory or .zip pack', {
        source,
      });
    }
    const tempDir = await extractZipToTemp(source);
    cleanupPaths.push(tempDir);
    workflowRoot = await findWorkflowRoot(tempDir);
  } else if (stats.isDirectory()) {
    workflowRoot = await findWorkflowRoot(source);
  } else {
    throw new CMError('INVALID_WORKFLOW', 'Workflow source must be a directory or .zip pack', {
      source,
    });
  }

  try {
    const { workflow } = await loadWorkflowFromDir(workflowRoot);
    const installPath = join(destDir, workflow.id);
    await mkdir(destDir, { recursive: true });

    if (existsSync(installPath)) {
      if (!options.force) {
        throw new CMError('ALREADY_EXISTS', `Workflow already installed: ${workflow.id}`, {
          installPath,
          fix: 'Use --force to overwrite the existing workflow',
        });
      }
      await rm(installPath, { recursive: true, force: true });
    }

    await cp(workflowRoot, installPath, { recursive: true });
    return { id: workflow.id, installPath };
  } finally {
    await Promise.all(cleanupPaths.map((path) => rm(path, { recursive: true, force: true })));
  }
}
