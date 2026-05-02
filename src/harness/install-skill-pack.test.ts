import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { installSkillPack } from './install-skill-pack';

describe('installSkillPack', () => {
  it('materializes a portable pack that points at the installed package runner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cm-skill-pack-'));
    const targetDir = '.content-machine';
    const materializedDir = join(root, targetDir);
    const originalCwd = process.cwd();

    process.chdir(root);
    let result: Awaited<ReturnType<typeof installSkillPack>>;
    try {
      result = await installSkillPack({
        targetDir,
        includeFlows: true,
        includeExamples: true,
        overwrite: true,
      });
    } finally {
      process.chdir(originalCwd);
    }

    const briefSkill = await readFile(
      join(materializedDir, 'skills', 'brief-to-script', 'SKILL.md'),
      'utf8'
    );
    const flowReadme = await readFile(join(materializedDir, 'flows', 'README.md'), 'utf8');
    const packReadme = await readFile(join(materializedDir, 'README.md'), 'utf8');
    const agentGuide = await readFile(join(materializedDir, 'AGENTS.md'), 'utf8');

    expect(result.result.targetDir).toContain('.content-machine');
    expect(result.result.flowsDir).toBeTruthy();
    expect(result.result.agentGuidePath).toContain('AGENTS.md');
    expect(briefSkill).toContain(
      'entrypoint: node ./node_modules/@45ck/content-machine/agent/run-tool.mjs brief-to-script'
    );
    expect(flowReadme).toContain(
      'node ./node_modules/@45ck/content-machine/agent/run-tool.mjs flow-catalog'
    );
    expect(packReadme).toContain('"flowsDir": ".content-machine/flows"');
    expect(agentGuide).toContain('Pick the right Content Machine skill or flow');
  });

  it('fails instead of merging into an existing target unless overwrite is set', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cm-skill-pack-'));
    const targetDir = join(root, '.content-machine');

    await installSkillPack({
      targetDir,
      overwrite: true,
    });

    await expect(
      installSkillPack({
        targetDir,
        overwrite: false,
      })
    ).rejects.toThrow('Target already exists');
  });
});
