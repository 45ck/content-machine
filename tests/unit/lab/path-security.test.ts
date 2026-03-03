import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertImportPathAllowed,
  resolveAllowedRoots,
  safeResolveUnderRoot,
} from '../../../src/lab/security/path';

describe('Experiment Lab path security', () => {
  it('rejects imports outside allowed roots', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-path-'));
    try {
      const allowed = join(base, 'allowed');
      const outside = join(base, 'outside');
      await mkdir(allowed, { recursive: true });
      await mkdir(outside, { recursive: true });

      const allowedRoots = await resolveAllowedRoots([allowed]);
      await expect(
        assertImportPathAllowed({ inputPath: outside, allowedRoots })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('prevents symlink escape under run root', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-symlink-'));
    try {
      const root = join(base, 'run');
      const outsideDir = join(base, 'outside');
      await mkdir(root, { recursive: true });
      await mkdir(outsideDir, { recursive: true });

      const outsideFile = join(outsideDir, 'video.mp4');
      await writeFile(outsideFile, Buffer.from('not really an mp4'));

      const linkPath = join(root, 'video.mp4');
      await symlink(outsideFile, linkPath);

      const rootReal = await realpath(root);
      await expect(
        safeResolveUnderRoot({ rootRealpath: rootReal, candidatePath: linkPath })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
