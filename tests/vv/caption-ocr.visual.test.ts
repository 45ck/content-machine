/**
 * FAIL-FIRST VISUAL TEST: OCR should detect separate inactive words.
 */
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import type { VideoConfig } from 'remotion';
import { createWorker } from 'tesseract.js';

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
    id: 'caption-ocr-test',
  });
}, 60000);

describe('V&V: caption OCR separation', () => {
  it(
    'detects separate inactive words',
    async () => {
      const { buffer } = await renderStill({
        serveUrl: bundleLocation,
        composition,
        frame: Math.round(1.0 * composition.fps),
        imageFormat: 'png',
        scale: 2,
      });

      if (!buffer) {
        throw new Error('renderStill did not return a buffer.');
      }

      const worker = await createWorker('eng');
      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyz ',
        tessedit_pageseg_mode: '7',
        user_defined_dpi: '600',
      });

      const result = await worker.recognize(buffer);
      await worker.terminate();

      const text = result.data.text.toLowerCase().replace(/[^a-z\s]/g, ' ');
      const tokens = text.split(/\s+/).filter(Boolean);
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    },
    { timeout: 60000 }
  );
});
