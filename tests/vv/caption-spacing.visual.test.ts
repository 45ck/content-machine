/**
 * FAIL-FIRST VISUAL TESTS: Ensures caption word spacing is readable.
 */
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import type { VideoConfig } from 'remotion';
import type { CaptionConfigInput } from '../../src/render/captions/config';
import { decodePng, computeMinGapBetweenInkRuns } from '../helpers/image';

const entryPoint = path.join(process.cwd(), 'src', 'render', 'remotion', 'index.ts');
const words = [
  { word: 'Spacing', start: 0, end: 0.5 },
  { word: 'should', start: 0.5, end: 1.0 },
  { word: 'feel', start: 1.0, end: 1.5 },
  { word: 'natural', start: 1.5, end: 2.0 },
];

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
}, 30000);

async function measureMinGap(
  config: CaptionConfigInput,
  frameSeconds: number,
  customWords?: Array<{ word: string; start: number; end: number }>
): Promise<number> {
  const frame = Math.round(frameSeconds * composition.fps);
  const { buffer } = await renderStill({
    serveUrl: bundleLocation,
    composition,
    frame,
    imageFormat: 'png',
    inputProps: { words: customWords ?? words, config },
  });

  if (!buffer) {
    throw new Error('renderStill did not return a buffer.');
  }

  const image = decodePng(buffer);
  return computeMinGapBetweenInkRuns(image, {
    background: { r: 0, g: 0, b: 0 },
    threshold: 20,
    minInkPixels: 6,
    minGapPx: 6,
    minRunWidth: 6,
  });
}

describe('V&V: caption word spacing (visual)', () => {
  it('keeps minimum gap in page mode', async () => {
    const minGap = await measureMinGap({ displayMode: 'page' }, 1.2);
    expect(minGap).toBeGreaterThanOrEqual(8);
  });

  it('keeps minimum gap in chunk mode', async () => {
    const minGap = await measureMinGap({ displayMode: 'chunk' }, 1.2);
    expect(minGap).toBeGreaterThanOrEqual(8);
  });

  it('keeps minimum gap in buildup mode', async () => {
    const minGap = await measureMinGap({ displayMode: 'buildup' }, 1.2);
    expect(minGap).toBeGreaterThanOrEqual(8);
  });

  it('prevents pill overlap for long words', async () => {
    const longWords = [
      { word: 'extraordinary', start: 0, end: 0.8 },
      { word: 'breakthrough', start: 0.8, end: 1.6 },
    ];
    const minGap = await measureMinGap(
      {
        displayMode: 'page',
        wordSpacing: 0.2,
        highlightMode: 'background',
        pillStyle: { paddingX: 16, paddingY: 8, borderRadius: 10, color: '#0066FF' },
      },
      0.4,
      longWords
    );
    expect(minGap).toBeGreaterThanOrEqual(6);
  });

  it('keeps readable gaps between inactive words (no pill)', async () => {
    const neutralWords = [
      { word: 'inactive', start: 0, end: 0.5 },
      { word: 'words', start: 0.5, end: 1.0 },
      { word: 'must', start: 1.0, end: 1.5 },
      { word: 'separate', start: 1.5, end: 2.0 },
    ];
    const minGap = await measureMinGap(
      {
        displayMode: 'page',
        highlightMode: 'color',
        textColor: '#FFFFFF',
        highlightColor: '#FFFFFF',
        wordSpacing: 0.2,
        shadow: { enabled: false },
        stroke: { width: 0, color: '#000000', useWebkitStroke: true },
      },
      1.0,
      neutralWords
    );
    expect(minGap).toBeGreaterThanOrEqual(8);
  });
});
