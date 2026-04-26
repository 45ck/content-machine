import { describe, expect, it } from 'vitest';
import {
  analyzeCaptionSegments,
  formatAssCaptions,
  formatSrtCaptions,
  toCaptionSegments,
  toRemotionCaptions,
} from './export';

describe('caption export', () => {
  const words = [
    { word: '[_TT_100]', start: 0, end: 0.1, confidence: 0.99 },
    { word: 'Stop', start: 1.2, end: 1.45, confidence: 0.9 },
    { word: 'scrolling', start: 1.5, end: 1.9, confidence: 0.8 },
    { word: 'now', start: 2.2, end: 2.5, confidence: 0.7 },
  ];

  it('creates clean Remotion-compatible caption segments from word timestamps', () => {
    const segments = toCaptionSegments(words, {
      mode: 'page',
      layout: { maxWordsPerPage: 2, maxCharsPerLine: 30 },
    });

    expect(segments).toEqual([
      {
        text: 'Stop scrolling',
        startMs: 1200,
        endMs: 1900,
        timestampMs: 1200,
        confidence: 0.85,
        words: [
          { text: 'Stop', startMs: 1200, endMs: 1450, confidence: 0.9 },
          { text: 'scrolling', startMs: 1500, endMs: 1900, confidence: 0.8 },
        ],
      },
      {
        text: 'now',
        startMs: 2200,
        endMs: 2500,
        timestampMs: 2200,
        confidence: 0.7,
        words: [{ text: 'now', startMs: 2200, endMs: 2500, confidence: 0.7 }],
      },
    ]);

    expect(toRemotionCaptions(segments)).toEqual([
      {
        text: 'Stop scrolling',
        startMs: 1200,
        endMs: 1900,
        timestampMs: 1200,
        confidence: 0.85,
      },
      {
        text: 'now',
        startMs: 2200,
        endMs: 2500,
        timestampMs: 2200,
        confidence: 0.7,
      },
    ]);
  });

  it('serializes caption segments as SRT', () => {
    const srt = formatSrtCaptions([
      {
        text: 'Stop scrolling',
        startMs: 1200,
        endMs: 2500,
        timestampMs: 1200,
        confidence: null,
        words: [],
      },
    ]);

    expect(srt).toBe('1\n00:00:01,200 --> 00:00:02,500\nStop scrolling\n');
  });

  it('serializes caption segments as ASS with escaped text', () => {
    const ass = formatAssCaptions([
      {
        text: 'Use {contracts}\nnot vibes',
        startMs: 1200,
        endMs: 2500,
        timestampMs: 1200,
        confidence: null,
        words: [],
      },
    ]);

    expect(ass).toContain('Format: Layer, Start, End, Style, Text');
    expect(ass).toContain('SecondaryColour');
    expect(ass).toContain('Dialogue: 0,0:00:01.20,0:00:02.50,Default,Use contracts\\Nnot vibes');
  });

  it('serializes caption segments as karaoke ASS when requested', () => {
    const ass = formatAssCaptions(
      [
        {
          text: 'Stop scrolling',
          startMs: 1200,
          endMs: 1900,
          timestampMs: 1200,
          confidence: null,
          words: [
            { text: 'Stop', startMs: 1200, endMs: 1450, confidence: 0.9 },
            { text: 'scrolling', startMs: 1500, endMs: 1900, confidence: 0.8 },
          ],
        },
      ],
      { karaoke: true, marginV: 560, positionX: 540, positionY: 960 }
    );

    expect(ass).toContain('Style: Default,Arial,72,&H00FFFFFF,&H008A8A8A');
    expect(ass).toContain(',80,80,560,1');
    expect(ass).toContain(
      'Dialogue: 0,0:00:01.20,0:00:01.50,Default,{\\pos(540,960)}{\\c&H00FFFFFF\\3c&H00000000\\bord4\\1a&H00&}Stop{\\r}\\h{\\c&H008A8A8A\\3c&H00000000\\bord4\\1a&H00&}scrolling{\\r}'
    );
    expect(ass).toContain(
      'Dialogue: 0,0:00:01.50,0:00:01.90,Default,{\\pos(540,960)}{\\c&H008A8A8A\\3c&H00000000\\bord4\\1a&H00&}Stop{\\r}\\h{\\c&H00FFFFFF\\3c&H00000000\\bord4\\1a&H00&}scrolling{\\r}'
    );
  });

  it('reports segment-level readability issues', () => {
    const report = analyzeCaptionSegments([
      {
        text: 'This caption is far too dense for a fast short',
        startMs: 0,
        endMs: 500,
        timestampMs: 0,
        confidence: null,
        words: [],
      },
    ]);

    expect(report.passed).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'fast-cps',
          severity: 'error',
        }),
        expect.objectContaining({
          type: 'too-short',
          severity: 'warning',
        }),
        expect.objectContaining({
          type: 'too-many-words',
          severity: 'warning',
        }),
      ])
    );
  });
});
