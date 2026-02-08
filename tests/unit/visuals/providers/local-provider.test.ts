import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalProvider } from '../../../../src/visuals/providers/local-provider';

describe('LocalProvider', () => {
  it('returns best match by filename tokens', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-local-provider-'));
    try {
      mkdirSync(dir, { recursive: true });
      const a = join(dir, 'city-skyline.mp4');
      const b = join(dir, 'laptop-typing.mp4');
      writeFileSync(a, 'stub-video-a');
      writeFileSync(b, 'stub-video-b---longer');

      const provider = new LocalProvider({ dir, recursive: false });
      const results = await provider.search({ query: 'laptop typing', orientation: 'portrait' });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('video');
      expect(results[0].url).toBe(b);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
