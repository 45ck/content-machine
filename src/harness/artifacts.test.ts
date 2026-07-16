import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonArtifact } from './artifacts';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('writeJsonArtifact', () => {
  it('writes valid JSON with exactly one terminal LF and no extra blank', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-artifacts-'));
    tempDirs.push(dir);
    const path = join(dir, 'artifact.json');
    const data = { binding: { id: 'pack-v4', sha256: 'abc123' }, beats: ['B01', 'B05'] };

    await writeJsonArtifact(path, data);

    const raw = await readFile(path, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw.endsWith('\n\n')).toBe(false);
    expect(raw.includes('\r')).toBe(false);
    expect(raw.match(/\n$/g)).toHaveLength(1);
    expect(JSON.parse(raw)).toEqual(data);
  });
});
