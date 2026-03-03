import { createReadStream } from 'node:fs';
import { open as openFile, stat } from 'node:fs/promises';
import { CMError } from '../../core/errors';
import type { FeedbackEntry } from '../../domain';
import { FeedbackEntrySchema } from '../../domain';

function parseCursor(rawInput: string): number {
  const raw = rawInput.trim() || '0';
  if (!/^\d+$/.test(raw)) {
    throw new CMError('INVALID_CURSOR', `Invalid cursor: ${rawInput}`, {
      fix: 'Use the nextCursor returned by the previous poll (or start with since=0).',
    });
  }

  const since = Number.parseInt(raw, 10);
  if (!Number.isFinite(since) || since < 0) {
    throw new CMError('INVALID_CURSOR', `Invalid cursor: ${rawInput}`, {
      fix: 'Use a non-negative integer cursor.',
    });
  }

  return since;
}

async function getFileSizeBytes(path: string): Promise<number> {
  try {
    const info = await stat(path);
    return info.size;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return 0;
    throw error;
  }
}

async function assertCursorAligned(path: string, since: number): Promise<void> {
  if (since <= 0) return;
  const fh = await openFile(path, 'r');
  try {
    const buf = Buffer.alloc(1);
    await fh.read(buf, 0, 1, since - 1);
    if (buf[0] !== 0x0a) {
      throw new CMError('INVALID_CURSOR', `Cursor is not aligned to a newline boundary: ${since}`, {
        fix: 'Reset since=0 or use the nextCursor returned by the previous poll.',
      });
    }
  } finally {
    await fh.close();
  }
}

function parseFeedbackEntryLine(params: {
  line: Buffer;
  sessionId: string | null;
}): FeedbackEntry | null {
  const trimmed = params.line.toString('utf-8').trim();
  if (!trimmed) return null;
  try {
    const raw = JSON.parse(trimmed) as unknown;
    const parsed = FeedbackEntrySchema.safeParse(raw);
    if (!parsed.success) return null;
    if (params.sessionId && parsed.data.sessionId !== params.sessionId) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function consumeCompleteLines(params: {
  buffered: Buffer;
  cursor: number;
  items: FeedbackEntry[];
  sessionId: string | null;
  limit: number | null;
}): { buffered: Buffer; cursor: number; reachedLimit: boolean } {
  let buffered = params.buffered;
  let cursor = params.cursor;

  while (true) {
    const nl = buffered.indexOf(0x0a); // '\n'
    if (nl === -1) break;

    const lineBuf = buffered.subarray(0, nl);
    buffered = buffered.subarray(nl + 1);
    cursor += nl + 1;

    const entry = parseFeedbackEntryLine({ line: lineBuf, sessionId: params.sessionId });
    if (!entry) continue;

    params.items.push(entry);
    if (params.limit && params.items.length >= params.limit) {
      return { buffered, cursor, reachedLimit: true };
    }
  }

  return { buffered, cursor, reachedLimit: false };
}

export async function readFeedbackSinceCursor(params: {
  storePath: string;
  since: string;
  sessionId: string | null;
  limit: number | null;
}): Promise<{ items: FeedbackEntry[]; nextCursor: string }> {
  const since = parseCursor(params.since);
  const sizeBytes = await getFileSizeBytes(params.storePath);

  if (since === 0 && sizeBytes === 0) return { items: [], nextCursor: '0' };
  if (since > sizeBytes) {
    throw new CMError('INVALID_CURSOR', `Cursor beyond end of file: ${since}`, {
      fix: 'Reset since=0 (cursor must be <= current file size).',
      sizeBytes,
    });
  }

  await assertCursorAligned(params.storePath, since);

  if (since === sizeBytes) return { items: [], nextCursor: String(since) };

  const stream = createReadStream(params.storePath, { start: since });
  let cursor = since;
  const items: FeedbackEntry[] = [];
  let buffered = Buffer.alloc(0) as Buffer;
  let stop = false;

  try {
    for await (const chunk of stream) {
      const buf = (Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))) as Buffer;
      buffered = buffered.length === 0 ? buf : (Buffer.concat([buffered, buf]) as Buffer);

      const consumed = consumeCompleteLines({
        buffered,
        cursor,
        items,
        sessionId: params.sessionId,
        limit: params.limit,
      });
      buffered = consumed.buffered;
      cursor = consumed.cursor;
      if (consumed.reachedLimit) {
        stop = true;
        stream.destroy();
        break;
      }
    }
  } catch (error) {
    if (!stop) throw error;
  }

  return { items, nextCursor: String(cursor) };
}
