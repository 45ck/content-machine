import { describe, expect, it } from 'vitest';
import { parseByteRange } from '../../../src/lab/server/range';

describe('parseByteRange', () => {
  it('parses a closed range', () => {
    expect(parseByteRange({ rangeHeader: 'bytes=0-9', sizeBytes: 100 })).toEqual({
      start: 0,
      end: 9,
    });
  });

  it('parses an open-ended range', () => {
    expect(parseByteRange({ rangeHeader: 'bytes=10-', sizeBytes: 100 })).toEqual({
      start: 10,
      end: 99,
    });
  });

  it('parses a suffix range', () => {
    expect(parseByteRange({ rangeHeader: 'bytes=-10', sizeBytes: 100 })).toEqual({
      start: 90,
      end: 99,
    });
  });

  it('clamps end to file size', () => {
    expect(parseByteRange({ rangeHeader: 'bytes=0-999', sizeBytes: 100 })).toEqual({
      start: 0,
      end: 99,
    });
  });

  it('throws when range starts beyond end', () => {
    expect(() => parseByteRange({ rangeHeader: 'bytes=100-101', sizeBytes: 100 })).toThrowError(
      /Range start beyond end of file/
    );
  });
});
