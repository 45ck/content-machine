/**
 * Gameplay selection tests
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { NotFoundError } from '../core/errors';
import { selectGameplayClip } from './gameplay';

let tempRoot = '';

async function createTempFile(path: string): Promise<void> {
  await writeFile(path, '');
}

describe('selectGameplayClip', () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cm-gameplay-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('selects a clip from a style folder', async () => {
    const library = join(tempRoot, 'gameplay');
    const styleDir = join(library, 'subway-surfers');
    await mkdir(styleDir, { recursive: true });

    const clipPath = join(styleDir, 'clip-001.mp4');
    await createTempFile(clipPath);

    const clip = await selectGameplayClip({
      library,
      style: 'subway-surfers',
      targetDuration: 12,
      strict: true,
      random: () => 0,
    });

    expect(clip?.path).toBe(clipPath);
    expect(clip?.duration).toBe(12);
    expect(clip?.style).toBe('subway-surfers');
  });

  it('selects a direct clip path when provided', async () => {
    const clipPath = join(tempRoot, 'direct.mp4');
    await createTempFile(clipPath);

    const clip = await selectGameplayClip({
      clip: clipPath,
      targetDuration: 8,
      strict: true,
    });

    expect(clip?.path).toBe(clipPath);
    expect(clip?.duration).toBe(8);
  });

  it('throws when strict and library is missing', async () => {
    await expect(
      selectGameplayClip({
        library: join(tempRoot, 'missing'),
        targetDuration: 10,
        strict: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns null when not strict and no clips found', async () => {
    const clip = await selectGameplayClip({
      library: join(tempRoot, 'empty'),
      targetDuration: 10,
      strict: false,
    });

    expect(clip).toBeNull();
  });
});
