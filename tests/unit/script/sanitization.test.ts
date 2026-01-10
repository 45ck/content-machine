/**
 * Script sanitization tests
 *
 * Ensures spoken text removes emojis and markdown artifacts.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeSpokenText } from '../../../src/script/sanitize';

describe('sanitizeSpokenText', () => {
  it('strips emojis and markdown from spoken text fields', () => {
    const fireEmoji = '\u{1F525}';
    const robotEmoji = '\u{1F916}';

    const hook = sanitizeSpokenText(`**Stop scrolling** ${robotEmoji}`);
    const scene = sanitizeSpokenText(`Use \`Redis\` for caching fast ${fireEmoji}`);
    const cta = sanitizeSpokenText(`Follow for more *tips* ${fireEmoji}`);
    const linked = sanitizeSpokenText(
      'Learn more at [Redis docs](https://redis.io/docs) right now.'
    );
    const bullets = sanitizeSpokenText('- First tip\n• Second tip');
    const hashtags = sanitizeSpokenText('Use Redis #caching #fast for speed.');

    expect(hook).toBe('Stop scrolling');
    expect(scene).toBe('Use Redis for caching fast');
    expect(cta).toBe('Follow for more tips');
    expect(linked).toBe('Learn more at Redis docs right now.');
    expect(bullets).toBe('First tip Second tip');
    expect(hashtags).toBe('Use Redis for speed.');
  });
});
