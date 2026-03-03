import { describe, it, expect } from 'vitest';
import { getActiveWord } from './timing';

describe('captions timing', () => {
  it('selects active word by start-time boundaries', () => {
    const words = [
      { text: 'a', startMs: 0, endMs: 50 },
      { text: 'b', startMs: 60, endMs: 65 },
      { text: 'c', startMs: 70, endMs: 90 },
    ];

    // In the gap after "a", we still want "a" active until "b" starts.
    expect(getActiveWord(words, 55)?.text).toBe('a');
    expect(getActiveWord(words, 60)?.text).toBe('b');
    expect(getActiveWord(words, 69)?.text).toBe('b');
    expect(getActiveWord(words, 70)?.text).toBe('c');
  });

  it('returns null before the first word', () => {
    const words = [{ text: 'a', startMs: 100, endMs: 150 }];
    expect(getActiveWord(words, 0)).toBeNull();
  });

  it('handles unsorted input', () => {
    const words = [
      { text: 'b', startMs: 50, endMs: 60 },
      { text: 'a', startMs: 0, endMs: 10 },
    ];
    expect(getActiveWord(words, 5)?.text).toBe('a');
    expect(getActiveWord(words, 55)?.text).toBe('b');
  });
});
