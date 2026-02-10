import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SchemaError } from '../../core/errors';
import { installTemplatePack } from './installer';
import { packVideoTemplate, scaffoldVideoTemplate } from './dev';

describe('video template dev tooling', () => {
  it('scaffolds and packs an installable template', async () => {
    const root = join(process.cwd(), 'tests', '.tmp', 'template-dev', 'scaffold-pack');
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });

    const templatesRoot = join(root, 'templates');
    const scaffolded = await scaffoldVideoTemplate({
      id: 'acme-demo',
      rootDir: templatesRoot,
      from: 'tiktok-captions',
    });
    expect(existsSync(scaffolded.templatePath)).toBe(true);

    const zipPath = join(root, 'acme-demo.cmtemplate.zip');
    const packed = await packVideoTemplate({ templateDir: scaffolded.templateDir, outputPath: zipPath });
    expect(packed.id).toBe('acme-demo');
    expect(existsSync(zipPath)).toBe(true);

    const installed = await installTemplatePack({ sourcePath: zipPath, destDir: join(root, 'installed') });
    expect(installed.id).toBe('acme-demo');
    expect(existsSync(join(installed.installPath, 'template.json'))).toBe(true);
  });

  it('scaffolds a code template with a Remotion project', async () => {
    const root = join(process.cwd(), 'tests', '.tmp', 'template-dev', 'scaffold-code');
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });

    const templatesRoot = join(root, 'templates');
    const scaffolded = await scaffoldVideoTemplate({
      id: 'acme-code-demo',
      rootDir: templatesRoot,
      from: 'tiktok-captions',
      mode: 'code',
    });

    expect(existsSync(scaffolded.templatePath)).toBe(true);
    expect(existsSync(join(scaffolded.templateDir, 'package.json'))).toBe(true);
    expect(existsSync(join(scaffolded.templateDir, 'public', 'README.txt'))).toBe(true);
    expect(existsSync(join(scaffolded.templateDir, 'remotion', 'index.ts'))).toBe(true);
    expect(existsSync(join(scaffolded.templateDir, 'remotion', 'root.tsx'))).toBe(true);
    expect(existsSync(join(scaffolded.templateDir, 'remotion', 'Main.tsx'))).toBe(true);
  });

  it('rejects unsafe template ids', async () => {
    const root = join(process.cwd(), 'tests', '.tmp', 'template-dev', 'unsafe-id');
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });

    await expect(
      scaffoldVideoTemplate({
        id: '../evil',
        rootDir: join(root, 'templates'),
        from: 'tiktok-captions',
      })
    ).rejects.toBeInstanceOf(SchemaError);
  });
});
