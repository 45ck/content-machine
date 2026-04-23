import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { installSkillPack } from './install-skill-pack';

describe('installSkillPack', () => {
  it('materializes a portable pack that points at the installed package runner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cm-skill-pack-'));
    const targetDir = join(root, '.content-machine');

    const result = await installSkillPack({
      targetDir,
      includeFlows: true,
      includeExamples: true,
      overwrite: true,
    });

    const briefSkill = await readFile(
      join(targetDir, 'skills', 'brief-to-script', 'SKILL.md'),
      'utf8'
    );
    const packReadme = await readFile(join(targetDir, 'README.md'), 'utf8');

    expect(result.result.targetDir).toContain('.content-machine');
    expect(result.result.flowsDir).toBeTruthy();
    expect(briefSkill).toContain(
      'entrypoint: node ./node_modules/@45ck/content-machine/agent/run-tool.mjs brief-to-script'
    );
    expect(packReadme).toContain('node ./node_modules/@45ck/content-machine/agent/run-tool.mjs');
  });
});
