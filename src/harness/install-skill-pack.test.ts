import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { listFlowCatalog } from './flow-catalog';
import { installSkillPack } from './install-skill-pack';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-skill-pack-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('installSkillPack', () => {
  it('materializes a portable pack that points at the installed package runner', async () => {
    const root = await makeTempDir();
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
    expect(packReadme).toContain('npx --no-install cm-agent list');
    expect(packReadme).toContain('"flowsDir": ".content-machine/flows"');
    expect(agentGuide).toContain('Pick the right Content Machine skill or flow');
  });

  it('fails instead of merging into an existing target unless overwrite is set', async () => {
    const root = await makeTempDir();
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

  it('omits flow files, flow artifacts, and flow instructions when includeFlows is false', async () => {
    const root = await makeTempDir();
    const targetDir = '.content-machine';
    const materializedDir = join(root, targetDir);
    const originalCwd = process.cwd();

    process.chdir(root);
    let result: Awaited<ReturnType<typeof installSkillPack>>;
    try {
      result = await installSkillPack({
        targetDir,
        includeFlows: false,
        overwrite: true,
      });
    } finally {
      process.chdir(originalCwd);
    }

    const packReadme = await readFile(join(materializedDir, 'README.md'), 'utf8');
    const agentGuide = await readFile(join(materializedDir, 'AGENTS.md'), 'utf8');
    const combinedDocs = `${packReadme}\n${agentGuide}`;

    expect(result.result.flowsDir).toBeNull();
    expect(existsSync(join(materializedDir, 'flows'))).toBe(false);
    expect(result.artifacts).not.toContainEqual(
      expect.objectContaining({ description: 'Materialized flows directory' })
    );
    expect(combinedDocs).not.toContain('run-flow');
    expect(combinedDocs).not.toContain('"flowsDir"');
    expect(combinedDocs).not.toContain('.content-machine/flows');
  });

  it('strips example request files and generated docs do not reference missing examples', async () => {
    const root = await makeTempDir();
    const targetDir = '.content-machine';
    const materializedDir = join(root, targetDir);
    const originalCwd = process.cwd();

    process.chdir(root);
    try {
      await installSkillPack({
        targetDir,
        includeExamples: false,
        overwrite: true,
      });
    } finally {
      process.chdir(originalCwd);
    }

    const packReadme = await readFile(join(materializedDir, 'README.md'), 'utf8');
    const agentGuide = await readFile(join(materializedDir, 'AGENTS.md'), 'utf8');

    expect(
      existsSync(join(materializedDir, 'skills', 'generate-short', 'examples', 'request.json'))
    ).toBe(false);
    expect(packReadme).not.toContain('examples/request.json');
    expect(packReadme).toContain('"includeExamples": false');
    expect(agentGuide).toContain('"includeExamples": false');
  });

  it('overwrite refresh removes stale files and stale flow directories', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, '.content-machine');

    await installSkillPack({
      targetDir,
      includeFlows: true,
      overwrite: true,
    });
    await writeFile(join(targetDir, 'stale.txt'), 'stale\n');
    await writeFile(join(targetDir, 'flows', 'stale.flow'), 'name: stale\n');

    const result = await installSkillPack({
      targetDir,
      includeFlows: false,
      overwrite: true,
    });

    expect(result.result.flowsDir).toBeNull();
    expect(existsSync(join(targetDir, 'stale.txt'))).toBe(false);
    expect(existsSync(join(targetDir, 'flows'))).toBe(false);
  });

  it('materialized flow catalog resolves operator notes from installed flow paths', async () => {
    const root = await makeTempDir();
    const targetDir = '.content-machine';
    const originalCwd = process.cwd();

    process.chdir(root);
    try {
      await installSkillPack({
        targetDir,
        includeFlows: true,
        overwrite: true,
      });
      const catalog = await listFlowCatalog({ flowsDir: '.content-machine/flows' });
      const generateShort = catalog.result.flows.find((flow) => flow.name === 'generate-short');
      const expectedNotesPath = join(root, '.content-machine', 'flows', 'generate-short.md');

      expect(generateShort?.operatorNotesPath).toBe(expectedNotesPath);
      expect(existsSync(expectedNotesPath)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
