import { describe, expect, it } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { importRemotionTemplate } from './importer';

async function makeTempDir(prefix: string): Promise<string> {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

describe('importRemotionTemplate', () => {
  it('imports a local directory and scaffolds a CM code template wrapper', async () => {
    const srcDir = await makeTempDir('cm-importer-src');
    const destRootDir = await makeTempDir('cm-importer-dest');

    try {
      // Minimal "project-ish" structure.
      await writeFile(join(srcDir, 'package.json'), JSON.stringify({ name: 'demo', private: true }, null, 2));
      await writeFile(join(srcDir, 'index.ts'), `export const x = 1;\n`, 'utf-8');

      // Ensure we don't copy node_modules and .git.
      await mkdir(join(srcDir, 'node_modules', 'foo'), { recursive: true });
      await writeFile(join(srcDir, 'node_modules', 'foo', 'secret.txt'), 'nope', 'utf-8');
      await mkdir(join(srcDir, '.git'), { recursive: true });
      await writeFile(join(srcDir, '.git', 'config'), 'nope', 'utf-8');

      const result = await importRemotionTemplate({
        source: srcDir,
        destRootDir,
        id: 'demo-template',
        force: true,
      });

      expect(result.id).toBe('demo-template');
      expect(result.templateDir).toContain('demo-template');

      const templateJson = JSON.parse(await readFile(join(result.templateDir, 'template.json'), 'utf-8')) as any;

      expect(templateJson.schemaVersion).toBe('1.0.0');
      expect(templateJson.id).toBe('demo-template');
      expect(templateJson.remotion.entryPoint).toBe('index.ts');
      expect(templateJson.remotion.rootDir).toBe('remotion');
      expect(templateJson.remotion.publicDir).toBe('public');

      // Wrapper files.
      await readFile(join(result.templateDir, 'remotion', 'index.ts'), 'utf-8');
      await readFile(join(result.templateDir, 'remotion', 'root.tsx'), 'utf-8');
      await readFile(join(result.templateDir, 'remotion', 'Main.tsx'), 'utf-8');
      await readFile(join(result.templateDir, 'remotion', 'README.txt'), 'utf-8');

      // Imported project should be nested and filtered.
      await readFile(join(result.templateDir, 'imported', 'index.ts'), 'utf-8');
      await expect(
        readFile(join(result.templateDir, 'imported', 'node_modules', 'foo', 'secret.txt'), 'utf-8')
      ).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(join(result.templateDir, 'imported', '.git', 'config'), 'utf-8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await rm(srcDir, { recursive: true, force: true });
      await rm(destRootDir, { recursive: true, force: true });
    }
  });

  it('derives a kebab-case id from the source dir basename when id is omitted', async () => {
    const base = await makeTempDir('cm-importer-basename');
    const srcDir = join(base, 'My Remotion Project');
    const destRootDir = await makeTempDir('cm-importer-dest2');
    await mkdir(srcDir, { recursive: true });

    try {
      const result = await importRemotionTemplate({
        source: srcDir,
        destRootDir,
        force: true,
      });
      expect(result.id).toBe('my-remotion-project');
    } finally {
      await rm(base, { recursive: true, force: true });
      await rm(destRootDir, { recursive: true, force: true });
    }
  });

  it('rejects remote sources in offline mode', async () => {
    const destRootDir = await makeTempDir('cm-importer-offline');
    try {
      await expect(
        importRemotionTemplate({
          source: 'github:owner/repo',
          destRootDir,
          offline: true,
        })
      ).rejects.toMatchObject({ name: 'CMError', code: 'OFFLINE' });
    } finally {
      await rm(destRootDir, { recursive: true, force: true });
    }
  });

  it('imports a remote Remotion template page by resolving to GitHub and downloading a zip (mocked)', async () => {
    const destRootDir = await makeTempDir('cm-importer-remote');

    // Create a zip that looks like a GitHub codeload archive: <repo>-<ref>/...
    const zip = new AdmZip();
    zip.addFile(
      'demo-main/package.json',
      Buffer.from(JSON.stringify({ name: 'demo', private: true }, null, 2))
    );
    zip.addFile('demo-main/index.ts', Buffer.from(`export const hello = 'world';\n`));
    const zipBuf = zip.toBuffer();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any) => {
      const u = String(url);
      if (u.startsWith('https://www.remotion.dev/templates/')) {
        return {
          ok: true,
          status: 200,
          text: async () => `<html><a href=https://github.com/acme/demo>source</a></html>`,
        } as any;
      }
      if (u.startsWith('https://codeload.github.com/acme/demo/zip/main')) {
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(zipBuf);
            controller.close();
          },
        });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          body,
        } as any;
      }
      return { ok: false, status: 404, statusText: 'Not Found', body: null } as any;
    }) as any;

    try {
      const result = await importRemotionTemplate({
        source: 'https://www.remotion.dev/templates/fake-template',
        destRootDir,
        id: 'remote-demo',
        force: true,
      });

      expect(result.id).toBe('remote-demo');
      expect(result.importedFrom.resolvedSource).toContain('github:acme/demo#main');

      const templateJson = JSON.parse(await readFile(join(result.templateDir, 'template.json'), 'utf-8')) as any;
      expect(templateJson.remotion.entryPoint).toBe('index.ts');
      expect(templateJson.remotion.rootDir).toBe('remotion');

      await readFile(join(result.templateDir, 'imported', 'index.ts'), 'utf-8');
    } finally {
      globalThis.fetch = originalFetch;
      await rm(destRootDir, { recursive: true, force: true });
    }
  });
});
