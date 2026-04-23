import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlowManifest } from './flow-manifest';

const repoRoot = process.cwd();

describe('parseFlowManifest', () => {
  it('parses the shipped flow manifests', async () => {
    const flows = [
      'flows/doctor.flow',
      'flows/generate-short.flow',
      'flows/reverse-engineer-winner.flow',
    ];

    for (const relativePath of flows) {
      const manifestSource = await readFile(join(repoRoot, relativePath), 'utf8');
      const manifest = parseFlowManifest(manifestSource);
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.entrySkill.length).toBeGreaterThan(0);
      expect(manifest.inputs.length).toBeGreaterThan(0);
    }
  });
});
