import { describe, expect, it } from 'vitest';
import { chunkTextForTts } from '../../../src/audio/tts/text-chunking';

describe('chunkTextForTts', () => {
  it('returns [] for empty/whitespace input', () => {
    expect(chunkTextForTts('   ', { maxChars: 100 })).toEqual([]);
  });

  it('returns a single chunk when under maxChars', () => {
    expect(chunkTextForTts('Hello world.', { maxChars: 100 })).toEqual(['Hello world.']);
  });

  it('chunks long text and never emits empty chunks', () => {
    const text =
      'One sentence. Two sentence! Three sentence? Four sentence. Five sentence. Six sentence.';
    const chunks = chunkTextForTts(text, { maxChars: 25 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
    expect(chunks.every((c) => c.length <= 25)).toBe(true);
  });

  it('falls back to word splitting when a single unit exceeds maxChars', () => {
    const text = 'ThisIsAReallyLongSingleUnitWithoutPunctuation ' + 'word '.repeat(80);
    const chunks = chunkTextForTts(text, { maxChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 50)).toBe(true);
  });
});
