/**
 * Template installer tests
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { installTemplatePack } from './installer';
import AdmZip from 'adm-zip';
import { SchemaError } from '../../core/errors';

let tempRoot = '';

async function createTemplateDir(root: string, id: string): Promise<string> {
  const templateDir = join(root, id);
  await mkdir(templateDir, { recursive: true });
  await writeFile(
    join(templateDir, 'template.json'),
    JSON.stringify(
      {
        schemaVersion: '1.0.0',
        id,
        name: `Template ${id}`,
        compositionId: 'ShortVideo',
      },
      null,
      2
    ),
    'utf-8'
  );
  return templateDir;
}

describe('installTemplatePack', () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-template-install-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('installs from a directory', async () => {
    const sourceDir = await createTemplateDir(join(tempRoot, 'source'), 'dir-template');
    const destDir = join(tempRoot, 'dest');

    const result = await installTemplatePack({
      sourcePath: sourceDir,
      destDir,
      force: false,
    });

    expect(result.id).toBe('dir-template');
    expect(result.installPath).toBe(join(destDir, 'dir-template'));
  });

  it('installs from a zip archive', async () => {
    const sourceDir = await createTemplateDir(join(tempRoot, 'zip-source'), 'zip-template');
    const zipPath = join(tempRoot, 'template.zip');
    const destDir = join(tempRoot, 'dest');

    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir, 'zip-template');
    zip.writeZip(zipPath);

    const result = await installTemplatePack({
      sourcePath: zipPath,
      destDir,
      force: false,
    });

    expect(result.id).toBe('zip-template');
    expect(result.installPath).toBe(join(destDir, 'zip-template'));
  });

  it('rejects unsafe template ids (path traversal)', async () => {
    const sourceDir = await createTemplateDir(join(tempRoot, 'source-evil'), 'safe-dir');
    const destDir = join(tempRoot, 'dest');

    // Overwrite template.json with an unsafe id to ensure installers do not allow escaping destDir.
    await writeFile(
      join(sourceDir, 'template.json'),
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          id: '../evil',
          name: 'Evil',
          compositionId: 'ShortVideo',
        },
        null,
        2
      ),
      'utf-8'
    );

    await expect(
      installTemplatePack({ sourcePath: sourceDir, destDir, force: false })
    ).rejects.toBeInstanceOf(SchemaError);
  });
});
