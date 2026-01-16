/**
 * FAIL-FIRST V&V: caption block should not jitter between word highlights.
 */
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import type { VideoConfig } from 'remotion';
import type { CaptionConfigInput } from '../../src/render/captions/config';
import { decodePng, findInkBoundingBox } from '../helpers/image';

const entryPoint = path.join(process.cwd(), 'src', 'render', 'remotion', 'index.ts');

let bundleLocation = '';
let composition: VideoConfig;

beforeAll(async () => {
  bundleLocation = await bundle({
    entryPoint,
    onProgress: () => undefined,
  });

  composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'caption-spacing-test',
  });
}, 60000);

async function renderBounds(frameSeconds: number, config: CaptionConfigInput) {
  const words = [
    { word: 'Spacing', start: 0, end: 0.5 },
    { word: 'should', start: 0.5, end: 1.0 },
    { word: 'feel', start: 1.0, end: 1.5 },
    { word: 'natural', start: 1.5, end: 2.0 },
  ];
  const { buffer } = await renderStill({
    serveUrl: bundleLocation,
    composition,
    frame: Math.round(frameSeconds * composition.fps),
    imageFormat: 'png',
    inputProps: { words, config },
  });

  if (!buffer) {
    throw new Error('renderStill did not return a buffer.');
  }

  const image = decodePng(buffer);
  return findInkBoundingBox(image, { r: 0, g: 0, b: 0 }, 20);
}

describe('V&V: caption jitter', () => {
  it('keeps caption block stable across word highlights', async () => {
    const config: CaptionConfigInput = {
      displayMode: 'page',
      highlightMode: 'background',
      wordSpacing: 1.0,
      textTransform: 'none',
      shadow: { enabled: false },
      stroke: { width: 0, color: '#000000', useWebkitStroke: true },
      layout: { maxCharsPerLine: 12, maxLinesPerPage: 2, maxWordsPerPage: 4 },
    };

    const a = await renderBounds(0.3, config);
    const b = await renderBounds(0.8, config);

    const centerAx = (a.minX + a.maxX) / 2;
    const centerBx = (b.minX + b.maxX) / 2;
    const widthA = a.maxX - a.minX;
    const widthB = b.maxX - b.minX;

    expect(Math.abs(centerAx - centerBx)).toBeLessThanOrEqual(2);
    expect(Math.abs(widthA - widthB)).toBeLessThanOrEqual(4);
  });
});
