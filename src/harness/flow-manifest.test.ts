import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlowManifest } from './flow-manifest';

const repoRoot = process.cwd();

describe('parseFlowManifest', () => {
  it('parses the shipped flow manifests', async () => {
    const flows = readdirSync(join(repoRoot, 'flows'))
      .filter((file) => file.endsWith('.flow'))
      .sort()
      .map((file) => join('flows', file));

    for (const relativePath of flows) {
      const manifestSource = await readFile(join(repoRoot, relativePath), 'utf8');
      const manifest = parseFlowManifest(manifestSource);
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.entrySkill.length).toBeGreaterThan(0);
      expect(manifest.inputs.length).toBeGreaterThan(0);
    }
  });
});
