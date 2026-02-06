import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFeedbackSinceCursor } from '../../../src/lab/feedback/cursor';

function fb(params: { id: string; sessionId?: string }): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: params.id,
    createdAt: '2026-02-06T00:00:00.000Z',
    sessionId: params.sessionId,
    ratings: { overall: 80 },
  };
}

describe('readFeedbackSinceCursor', () => {
  it('returns empty for missing store file', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-cursor-'));
    try {
      const storePath = join(base, 'missing.jsonl');
      const out = await readFeedbackSinceCursor({
        storePath,
        since: '0',
        sessionId: null,
        limit: null,
      });
      expect(out.items).toEqual([]);
      expect(out.nextCursor).toBe('0');
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('rejects misaligned cursors', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-cursor-'));
    try {
      const storePath = join(base, 'feedback.jsonl');
      const line = JSON.stringify(fb({ id: 'a1', sessionId: 's1' })) + '\n';
      await writeFile(storePath, line, 'utf-8');

      await expect(
        readFeedbackSinceCursor({ storePath, since: '1', sessionId: null, limit: null })
      ).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('does not advance cursor past a partial trailing line', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-cursor-'));
    try {
      const storePath = join(base, 'feedback.jsonl');
      const l1 = JSON.stringify(fb({ id: 'a1', sessionId: 's1' }));
      const l2 = JSON.stringify(fb({ id: 'a2', sessionId: 's2' }));
      const partial = '{"schemaVersion":1';
      const content = `${l1}\n${l2}\n${partial}`;
      await writeFile(storePath, content, 'utf-8');

      const out = await readFeedbackSinceCursor({
        storePath,
        since: '0',
        sessionId: null,
        limit: null,
      });
      expect(out.items.map((i) => i.id)).toEqual(['a1', 'a2']);

      const expectedCursor = Buffer.byteLength(`${l1}\n${l2}\n`, 'utf-8');
      expect(out.nextCursor).toBe(String(expectedCursor));
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('applies session filter and limit after filter', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-cursor-'));
    try {
      const storePath = join(base, 'feedback.jsonl');
      const l1 = JSON.stringify(fb({ id: 'a1', sessionId: 's1' }));
      const l2 = JSON.stringify(fb({ id: 'a2', sessionId: 's2' }));
      const l3 = JSON.stringify(fb({ id: 'a3', sessionId: 's1' }));
      await writeFile(storePath, `${l1}\n${l2}\n${l3}\n`, 'utf-8');

      const first = await readFeedbackSinceCursor({
        storePath,
        since: '0',
        sessionId: 's1',
        limit: 1,
      });
      expect(first.items.map((i) => i.id)).toEqual(['a1']);
      expect(first.nextCursor).toBe(String(Buffer.byteLength(`${l1}\n`, 'utf-8')));

      const second = await readFeedbackSinceCursor({
        storePath,
        since: first.nextCursor,
        sessionId: 's1',
        limit: null,
      });
      expect(second.items.map((i) => i.id)).toEqual(['a3']);
      expect(second.nextCursor).toBe(String(Buffer.byteLength(`${l1}\n${l2}\n${l3}\n`, 'utf-8')));
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
