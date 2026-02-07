import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
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
});

