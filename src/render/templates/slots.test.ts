import { describe, expect, it } from 'vitest';
import { getTemplateOverlays } from './slots';
import { RenderTemplateSchema, type RenderTemplate } from '../../domain/render-templates';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

function makeTemplate(partial: Partial<RenderTemplate>): RenderTemplate {
  return RenderTemplateSchema.parse({
    schemaVersion: '1.0.0',
    id: 't1',
    name: 'Template 1',
    compositionId: 'ShortVideo',
    ...partial,
  });
}

describe('getTemplateOverlays', () => {
  it('resolves relative overlay paths against templateDir and applies defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-template-'));
    const template = makeTemplate({
      assets: {
        overlays: ['assets/overlays/logo.png', { src: 'assets/overlays/frame.mp4', position: 'center' }],
      },
    });

    const overlays = getTemplateOverlays(template, dir);
    expect(overlays).toHaveLength(2);
    expect(overlays[0]!.src).toBe(resolve(dir, 'assets/overlays/logo.png'));
    expect(overlays[0]!.kind).toBe('image');
    expect(overlays[0]!.layer).toBe('below-captions');
    expect(overlays[0]!.position).toBe('top-right');
    expect(overlays[0]!.opacity).toBe(1);
    expect(overlays[0]!.marginPx).toBe(24);

    expect(overlays[1]!.src).toBe(resolve(dir, 'assets/overlays/frame.mp4'));
    expect(overlays[1]!.kind).toBe('video');
    expect(overlays[1]!.position).toBe('center');
  });

  it('accepts remote overlay URLs without resolving', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-template-'));
    const template = makeTemplate({
      assets: {
        overlays: [{ src: 'https://example.com/logo.png', kind: 'image', layer: 'above-captions' }],
      },
    });

    const overlays = getTemplateOverlays(template, dir);
    expect(overlays).toHaveLength(1);
    expect(overlays[0]!.src).toBe('https://example.com/logo.png');
    expect(overlays[0]!.layer).toBe('above-captions');
  });

  it('rejects absolute overlay paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-template-'));
    const template = makeTemplate({
      assets: { overlays: ['/etc/passwd'] },
    });
    expect(() => getTemplateOverlays(template, dir)).toThrow(/absolute paths/i);
  });

  it('rejects overlay path traversal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-template-'));
    const template = makeTemplate({
      assets: { overlays: ['../secrets.png'] },
    });
    expect(() => getTemplateOverlays(template, dir)).toThrow(/path traversal/i);
  });

  it('rejects unsupported overlay file extensions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-template-'));
    const template = makeTemplate({
      assets: { overlays: ['assets/overlays/file.exe'] },
    });
    expect(() => getTemplateOverlays(template, dir)).toThrow(/unsupported file extension/i);
  });
});
