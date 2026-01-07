import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { resolveVideoTemplate } from '../../../../src/render/templates';
import { NotFoundError } from '../../../../src/core/errors';

describe('resolveVideoTemplate', () => {
  it('resolves a built-in template by id', async () => {
    const resolved = await resolveVideoTemplate('tiktok-captions');
    expect(resolved.source).toBe('builtin');
    expect(resolved.template.id).toBe('tiktok-captions');
    expect(resolved.template.compositionId).toBe('ShortVideo');
  });

  it('loads a template from a file path', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp', 'template-resolver-file');
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    const templatePath = join(tmpDir, 'template.json');
    writeFileSync(
      templatePath,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          id: 'test-template',
          name: 'Test Template',
          compositionId: 'ShortVideo',
          defaults: { orientation: 'square', fps: 60, captionPreset: 'neon' },
        },
        null,
        2
      ),
      'utf-8'
    );

    const resolved = await resolveVideoTemplate(templatePath);
    expect(resolved.source).toBe('file');
    expect(resolved.template.id).toBe('test-template');
    expect(resolved.template.defaults?.orientation).toBe('square');
    expect(resolved.template.defaults?.fps).toBe(60);
  });

  it('throws NotFoundError for unknown ids', async () => {
    await expect(resolveVideoTemplate('does-not-exist')).rejects.toBeInstanceOf(NotFoundError);
  });
});

