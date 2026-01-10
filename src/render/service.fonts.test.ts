/**
 * Caption font bundling tests
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resolveCaptionFontAssets, type RenderVideoOptions } from './service';

describe('resolveCaptionFontAssets', () => {
  const outDir = join(process.cwd(), 'tests', '.tmp', 'render-fonts');

  beforeEach(() => {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('bundles local fonts from the fonts array', () => {
    const fontPath = join(outDir, 'Custom-Bold.woff2');
    writeFileSync(fontPath, 'test');

    const result = resolveCaptionFontAssets({
      fonts: [{ family: 'Custom', src: fontPath, weight: 700 }],
    } as RenderVideoOptions);

    expect(result.fontAssets).toEqual([
      { sourcePath: fontPath, destPath: 'fonts/Custom-Bold.woff2' },
    ]);
    expect(result.fontSources).toEqual([
      { family: 'Custom', src: 'fonts/Custom-Bold.woff2', weight: 700 },
    ]);
  });

  it('bundles caption font file overrides', () => {
    const fontPath = join(outDir, 'Inter-Bold.woff2');
    writeFileSync(fontPath, 'test');

    const result = resolveCaptionFontAssets({
      captionFontFile: fontPath,
      captionFontFamily: 'Inter',
      captionFontWeight: 700,
    } as RenderVideoOptions);

    expect(result.captionFontFamily).toBe('Inter');
    expect(result.fontAssets).toEqual([
      { sourcePath: fontPath, destPath: 'fonts/Inter-Bold.woff2' },
    ]);
    expect(result.fontSources[0]).toMatchObject({
      family: 'Inter',
      src: 'fonts/Inter-Bold.woff2',
      weight: 700,
    });
  });
});
