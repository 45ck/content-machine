import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { runRedditStoryAssets } from './reddit-story-assets';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-reddit-assets-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runRedditStoryAssets', () => {
  it('writes reddit-style svg cards and a manifest', async () => {
    const dir = await makeTempDir();
    const result = await runRedditStoryAssets({
      outputDir: dir,
      title: "AITA for replacing my roommate's fake work setup?",
      cards: [
        {
          id: 'hook',
          kind: 'post',
          label: 'Original Post',
          body: 'My roommate staged fake work calls for months, so I replaced the set with the real thing.',
        },
        {
          id: 'comment-1',
          kind: 'comment',
          label: 'Top Comment',
          body: 'He made you part of the lie. That alone is enough for me.',
        },
      ],
    });

    expect(result.result.assets).toHaveLength(2);
    await expect(readFile(join(dir, 'hook.svg'), 'utf8')).resolves.toContain('ORIGINAL POST');
    await expect(readFile(join(dir, 'comment-1.svg'), 'utf8')).resolves.toContain('TOP COMMENT');
    await expect(readFile(result.result.manifestPath, 'utf8')).resolves.toContain('comment-1.svg');
  });
});
