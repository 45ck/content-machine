import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import AdmZip from 'adm-zip';
import { packWorkflow, scaffoldWorkflow } from '../../../src/workflows/dev';

let tempRoot = '';

afterEach(async () => {
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  tempRoot = '';
});

describe('workflows dev tooling', () => {
  it('scaffolds a workflow.json under rootDir', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-workflow-dev-'));
    const result = await scaffoldWorkflow({ id: 'my-workflow', rootDir: tempRoot });

    expect(result.id).toBe('my-workflow');
    const st = await stat(result.workflowPath);
    expect(st.isFile()).toBe(true);

    const raw = await readFile(result.workflowPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe('my-workflow');
    expect(parsed.stages).toBeTruthy();
    expect(parsed.stages.script.mode).toBe('builtin');
  });

  it('packs a workflow directory into a .cmworkflow.zip', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-workflow-dev-'));
    const scaffold = await scaffoldWorkflow({ id: 'pack-me', rootDir: tempRoot });

    const packed = await packWorkflow({ workflowDir: scaffold.workflowDir });
    expect(packed.id).toBe('pack-me');
    expect(packed.outputPath.endsWith('.cmworkflow.zip')).toBe(true);

    const zip = new AdmZip(packed.outputPath);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toContain('pack-me/workflow.json');
  });
});
