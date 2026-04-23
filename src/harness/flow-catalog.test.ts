import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { listFlowCatalog } from './flow-catalog';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-flow-catalog-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('listFlowCatalog', () => {
  it('lists executable `.flow` files and ignores prose docs', async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, 'alpha.flow'),
      [
        'name: alpha-flow',
        'description: alpha flow',
        'entrySkill: generate-short',
        'inputs:',
        '  - name: topic',
        '    description: topic',
        '    required: true',
        'outputs:',
        '  - name: outputDir',
        '    description: output directory',
        '    required: true',
        '',
      ].join('\n')
    );
    await writeFile(join(dir, 'README.md'), '# docs\n');
    await mkdir(join(dir, '_template'), { recursive: true });

    const result = await listFlowCatalog({ flowsDir: dir });

    expect(result.result.flowCount).toBe(1);
    expect(result.result.flows[0]).toMatchObject({
      name: 'alpha-flow',
      entrySkill: 'generate-short',
      manifestPath: join(dir, 'alpha.flow'),
    });
    expect(result.artifacts).toEqual([
      {
        path: dir,
        kind: 'directory',
        description: 'Flow catalog root directory',
      },
    ]);
  });
});
