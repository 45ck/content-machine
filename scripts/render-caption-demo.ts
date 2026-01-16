import { mkdir } from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { CaptionConfigInput } from '../src/render/captions/config';

const entryPoint = path.join(process.cwd(), 'src', 'render', 'remotion', 'index.ts');
const outputDir = path.join(process.cwd(), 'output');
const outputPath = path.join(outputDir, 'caption-demo.mp4');

const words = [
  { word: 'Captions', start: 0, end: 0.35 },
  { word: 'should', start: 0.35, end: 0.7 },
  { word: 'feel', start: 0.7, end: 1.05 },
  { word: 'clean,', start: 1.05, end: 1.4 },
  { word: 'spaced,', start: 1.4, end: 1.8 },
  { word: 'and', start: 1.8, end: 2.1 },
  { word: 'readable', start: 2.1, end: 2.6 },
  { word: 'always.', start: 2.6, end: 3.0 },
];

const config: CaptionConfigInput = {
  displayMode: 'page',
  wordSpacing: 1.0,
  lineHeight: 1.3,
  letterSpacing: 0.01,
  highlightMode: 'background',
  pillStyle: { paddingX: 14, paddingY: 8, borderRadius: 8, color: '#0066FF' },
  layout: {
    maxCharsPerLine: 10,
    maxLinesPerPage: 2,
    maxWordsPerPage: 4,
    minWordsPerPage: 2,
    targetWordsPerChunk: 3,
  },
};

async function renderCaptionDemo() {
  await mkdir(outputDir, { recursive: true });

  const bundleLocation = await bundle({
    entryPoint,
    onProgress: () => undefined,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'caption-spacing-test',
  });

  await renderMedia({
    serveUrl: bundleLocation,
    composition,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { words, config },
    logLevel: 'warn',
  });

  return outputPath;
}

renderCaptionDemo()
  .then((location) => {
    console.log(`Rendered caption demo to ${location}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
