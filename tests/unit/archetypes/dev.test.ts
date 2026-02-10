import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import AdmZip from 'adm-zip';
import { packArchetype, scaffoldArchetype } from '../../../src/archetypes/dev';

let tempRoot = '';

afterEach(async () => {
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  tempRoot = '';
});

describe('archetypes dev tooling', () => {
  it('scaffolds an archetype YAML file under rootDir', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-archetype-dev-'));
    const result = await scaffoldArchetype({
      id: 'my-archetype',
      rootDir: tempRoot,
      from: 'listicle',
    });

    expect(result.id).toBe('my-archetype');
    const st = await stat(result.archetypePath);
    expect(st.isFile()).toBe(true);

    const raw = await readFile(result.archetypePath, 'utf-8');
    expect(raw).toMatch(/id:\s*my-archetype/);
  });

  it('packs an archetype from a directory containing exactly one spec file', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-archetype-dev-'));
    const dir = join(tempRoot, 'one');
    const path = join(dir, 'only.yaml');
    await mkdir(dir, { recursive: true });
    await writeFile(
      path,
      [
        'schemaVersion: "1.0.0"',
        'id: "only-one"',
        'name: "Only One"',
        'description: "Test"',
        'script:',
        '  template: "Hello {{topic}}"',
        '',
      ].join('\n'),
      'utf-8'
    );

    const packed = await packArchetype({ path: dir });
    expect(packed.id).toBe('only-one');
    expect(packed.outputPath.endsWith('.cmarchetype.zip')).toBe(true);

    const zip = new AdmZip(packed.outputPath);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toContain('only-one.yaml');
  });
});
