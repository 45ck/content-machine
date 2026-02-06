import type { LabIdempotencyRecord } from '../../domain';
import { LabIdempotencyRecordSchema } from '../../domain';
import { appendJsonl, readJsonl } from './jsonl';

export async function readIdempotencyRecords(storePath: string): Promise<LabIdempotencyRecord[]> {
  return readJsonl({ path: storePath, schema: LabIdempotencyRecordSchema });
}

export async function findIdempotencyRecord(params: {
  storePath: string;
  requestId: string;
  type: LabIdempotencyRecord['type'];
}): Promise<LabIdempotencyRecord | null> {
  const records = await readIdempotencyRecords(params.storePath);
  // Last-write-wins if duplicates exist for any reason.
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i];
    if (rec.requestId === params.requestId && rec.type === params.type) return rec;
  }
  return null;
}

export async function appendIdempotencyRecord(
  storePath: string,
  record: LabIdempotencyRecord
): Promise<LabIdempotencyRecord> {
  return appendJsonl({ path: storePath, value: record, schema: LabIdempotencyRecordSchema });
}
