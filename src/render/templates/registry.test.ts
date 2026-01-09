/**
 * Template registry tests
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { listVideoTemplates } from './registry';

let tempRoot = '';

async function writeTemplate(dir: string, id: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const template = {
    schemaVersion: '1.0.0',
    id,
    name: `Template ${id}`,
    compositionId: 'ShortVideo',
  };
  await writeFile(join(dir, 'template.json'), JSON.stringify(template, null, 2), 'utf-8');
}

describe('listVideoTemplates', () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-templates-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('lists user and project templates', async () => {
    const userDir = join(tempRoot, 'user');
    const projectDir = join(tempRoot, 'project');

    await writeTemplate(join(userDir, 'user-template'), 'user-template');
    await writeTemplate(join(projectDir, 'project-template'), 'project-template');

    const templates = await listVideoTemplates({
      includeBuiltin: false,
      userDir,
      projectDir,
    });

    const ids = templates.map((t) => t.id).sort();
    expect(ids).toEqual(['project-template', 'user-template']);
  });
});
