import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSkillManifest } from './skill-manifest';

const repoRoot = process.cwd();

describe('parseSkillManifest', () => {
  it('parses the starter skill manifests', async () => {
    const skills = [
      'skills/doctor-report/SKILL.md',
      'skills/generate-short/SKILL.md',
      'skills/skill-catalog/SKILL.md',
      'skills/brief-to-script/SKILL.md',
      'skills/reverse-engineer-winner/SKILL.md',
      'skills/script-to-audio/SKILL.md',
      'skills/short-form-captions/SKILL.md',
      'skills/timestamps-to-visuals/SKILL.md',
      'skills/video-render/SKILL.md',
      'skills/publish-prep-review/SKILL.md',
    ];

    for (const relativePath of skills) {
      const markdown = await readFile(join(repoRoot, relativePath), 'utf8');
      const manifest = parseSkillManifest(markdown);
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.description.length).toBeGreaterThan(0);
      expect(Array.isArray(manifest.allowedTools)).toBe(true);
      if (manifest.model) {
        expect(manifest.model).toBe('inherit');
      }
    }
  });
});
