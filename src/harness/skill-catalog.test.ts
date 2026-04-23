import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { listSkillCatalog } from './skill-catalog';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-skill-catalog-'));
  tempDirs.push(dir);
  return dir;
}

async function writeSkill(dir: string, id: string, withExample = false): Promise<void> {
  const skillDir = join(dir, id);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, 'SKILL.md'),
    `---
name: ${id}
description: ${id} description
allowedTools:
  - shell
  - read
model: inherit
argumentHint: '{"topic":"example"}'
entrypoint: npx tsx scripts/harness/${id}.ts
inputs:
  - name: topic
    description: topic
    required: true
outputs:
  - name: output.json
    description: output
---

# ${id}
`
  );

  if (withExample) {
    await mkdir(join(skillDir, 'examples'), { recursive: true });
    await writeFile(join(skillDir, 'examples', 'request.json'), '{ "topic": "example" }\n');
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('listSkillCatalog', () => {
  it('lists shipped-style skills and skips the template by default', async () => {
    const dir = await makeTempDir();
    await writeSkill(dir, '_template');
    await writeSkill(dir, 'alpha-skill', true);
    await writeSkill(dir, 'beta-skill');

    const result = await listSkillCatalog({ skillsDir: dir });

    expect(result.result.skillsDir).toBe(dir);
    expect(result.result.skillCount).toBe(2);
    expect(result.result.skills.map((skill) => skill.name)).toEqual(['alpha-skill', 'beta-skill']);
    expect(result.result.skills[0]?.exampleRequestPath).toBe(
      join(dir, 'alpha-skill', 'examples', 'request.json')
    );
    expect(result.result.skills[1]?.exampleRequestPath).toBeNull();
    expect(result.artifacts).toEqual([
      {
        path: dir,
        kind: 'directory',
        description: 'Skill catalog root directory',
      },
    ]);
  });
});
