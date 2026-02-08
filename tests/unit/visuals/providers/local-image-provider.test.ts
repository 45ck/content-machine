import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalImageProvider } from '../../../../src/visuals/providers/local-image-provider';

describe('LocalImageProvider', () => {
  it('returns best match by filename tokens', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-localimage-provider-'));
    try {
      mkdirSync(dir, { recursive: true });
      const a = join(dir, 'city-skyline.png');
      const b = join(dir, 'laptop-typing.webp');
      writeFileSync(a, 'stub-image-a');
      writeFileSync(b, 'stub-image-b---longer');

      const provider = new LocalImageProvider({ dir, recursive: false });
      const results = await provider.search({ query: 'laptop typing', orientation: 'portrait' });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('image');
      expect(results[0].url).toBe(b);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
