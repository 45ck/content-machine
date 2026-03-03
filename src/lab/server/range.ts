import { CMError } from '../../core/errors';

export interface ByteRange {
  start: number;
  end: number;
}

function parseIntStrict(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseByteRange(params: {
  rangeHeader: string;
  sizeBytes: number;
}): ByteRange | null {
  const header = params.rangeHeader.trim();
  if (!header.startsWith('bytes=')) return null;
  const spec = header.slice('bytes='.length).trim();
  if (!spec) return null;

  // Single range only: "start-end", "start-", "-suffix"
  const [first] = spec.split(',');
  const s = first.trim();
  const dash = s.indexOf('-');
  if (dash === -1) return null;
  const left = s.slice(0, dash).trim();
  const right = s.slice(dash + 1).trim();

  const size = params.sizeBytes;
  if (size <= 0) return null;

  // Suffix range: "-N"
  if (!left && right) {
    const suffix = parseIntStrict(right);
    if (suffix === null) return null;
    const clamped = Math.min(suffix, size);
    return { start: Math.max(0, size - clamped), end: size - 1 };
  }

  const start = parseIntStrict(left);
  if (start === null) return null;
  if (start >= size) {
    throw new CMError('INVALID_ARGUMENT', 'Range start beyond end of file', {
      fix: 'Use a Range within the file size.',
      sizeBytes: size,
    });
  }

  // Open-ended: "start-"
  if (!right) {
    return { start, end: size - 1 };
  }

  const end = parseIntStrict(right);
  if (end === null) return null;
  if (end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}
