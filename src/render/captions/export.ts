import { z } from 'zod';
import type { WordTimestamp } from '../../domain';
import type { CaptionLayout } from './config';
import { createCaptionChunks, layoutToChunkingConfig } from './chunking';
import { createCaptionPages, isDisplayableWord } from './paging';

const CAPTION_EXPORT_SCHEMA_VERSION = '1.0.0' as const;

const MsSchema = z.number().int().nonnegative();
const ConfidenceSchema = z.number().min(0).max(1).nullable();

export const CaptionExportWordSchema = z
  .object({
    text: z.string().min(1),
    startMs: MsSchema,
    endMs: MsSchema,
    confidence: ConfidenceSchema.optional(),
  })
  .refine((value) => value.endMs >= value.startMs, {
    message: 'caption word endMs must be >= startMs',
    path: ['endMs'],
  });

export type CaptionExportWord = z.infer<typeof CaptionExportWordSchema>;

/**
 * Ubiquitous Language: Caption segment.
 *
 * Remotion-compatible grouped caption with optional word-level backing data.
 */
export const CaptionSegmentSchema = z
  .object({
    text: z.string().min(1),
    startMs: MsSchema,
    endMs: MsSchema,
    timestampMs: MsSchema.nullable(),
    confidence: ConfidenceSchema,
    words: z.array(CaptionExportWordSchema),
  })
  .refine((value) => value.endMs >= value.startMs, {
    message: 'caption segment endMs must be >= startMs',
    path: ['endMs'],
  });

export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;

/**
 * Remotion `Caption`-compatible shape from `@remotion/captions`.
 */
export const RemotionCaptionSchema = z
  .object({
    text: z.string().min(1),
    startMs: MsSchema,
    endMs: MsSchema,
    timestampMs: MsSchema.nullable(),
    confidence: ConfidenceSchema,
  })
  .refine((value) => value.endMs >= value.startMs, {
    message: 'Remotion caption endMs must be >= startMs',
    path: ['endMs'],
  });

export type RemotionCaption = z.infer<typeof RemotionCaptionSchema>;

export const CaptionSegmentQualityIssueSchema = z.object({
  type: z.enum(['fast-cps', 'too-short', 'too-many-words', 'low-confidence', 'invalid-duration']),
  severity: z.enum(['error', 'warning']),
  segmentIndex: z.number().int().nonnegative(),
  text: z.string(),
  message: z.string(),
  details: z.record(z.number()).optional(),
});

export type CaptionSegmentQualityIssue = z.infer<typeof CaptionSegmentQualityIssueSchema>;

export const CaptionSegmentQualityReportSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  thresholds: z.object({
    maxCharsPerSecond: z.number().positive(),
    minSegmentMs: z.number().int().positive(),
    maxWordsPerSegment: z.number().int().positive(),
    minConfidence: z.number().min(0).max(1),
  }),
  summary: z.object({
    segmentCount: z.number().int().nonnegative(),
    maxCharsPerSecond: z.number().nonnegative(),
    shortestSegmentMs: z.number().int().nonnegative(),
    maxWordsPerSegment: z.number().int().nonnegative(),
    lowConfidenceCount: z.number().int().nonnegative(),
  }),
  issues: z.array(CaptionSegmentQualityIssueSchema),
});

export type CaptionSegmentQualityReport = z.infer<typeof CaptionSegmentQualityReportSchema>;

export const CaptionExportSchema = z.object({
  schemaVersion: z.literal(CAPTION_EXPORT_SCHEMA_VERSION),
  captions: z.array(RemotionCaptionSchema),
  segments: z.array(CaptionSegmentSchema),
  quality: CaptionSegmentQualityReportSchema,
});

export type CaptionExport = z.infer<typeof CaptionExportSchema>;

export interface CaptionSegmentOptions {
  mode?: 'chunk' | 'page';
  layout?: Partial<CaptionLayout>;
  timingOffsetMs?: number;
  minConfidence?: number;
}

export interface AssCaptionStyle {
  fontName?: string;
  fontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  outlineColor?: string;
  backColor?: string;
  alignment?: number;
  marginL?: number;
  marginR?: number;
  marginV?: number;
  karaoke?: boolean;
}

export interface CaptionSegmentQualityThresholds {
  maxCharsPerSecond?: number;
  minSegmentMs?: number;
  maxWordsPerSegment?: number;
  minConfidence?: number;
}

const DEFAULT_QUALITY_THRESHOLDS: Required<CaptionSegmentQualityThresholds> = {
  maxCharsPerSecond: 18,
  minSegmentMs: 700,
  maxWordsPerSegment: 7,
  minConfidence: 0.5,
};

const DEFAULT_ASS_STYLE: Required<AssCaptionStyle> = {
  fontName: 'Arial',
  fontSize: 72,
  primaryColor: '&H00FFFFFF',
  secondaryColor: '&H008A8A8A',
  outlineColor: '&H00000000',
  backColor: '&H64000000',
  alignment: 2,
  marginL: 80,
  marginR: 80,
  marginV: 220,
  karaoke: false,
};

function toCaptionExportWords(
  words: WordTimestamp[],
  options: Pick<CaptionSegmentOptions, 'timingOffsetMs' | 'minConfidence'>
): CaptionExportWord[] {
  const timingOffsetMs = options.timingOffsetMs ?? 0;
  const minConfidence = options.minConfidence ?? 0;

  return words.flatMap((word): CaptionExportWord[] => {
    const text = word.word.trim();
    if (!text || !isDisplayableWord(text)) return [];
    if (word.confidence !== undefined && word.confidence < minConfidence) return [];

    const startMs = Math.max(0, Math.round(word.start * 1000 + timingOffsetMs));
    const rawEndMs = Math.round(word.end * 1000 + timingOffsetMs);
    const endMs = Math.max(startMs + 1, rawEndMs);

    return [
      CaptionExportWordSchema.parse({
        text,
        startMs,
        endMs,
        confidence: word.confidence ?? undefined,
      }),
    ];
  });
}

function averageConfidence(words: CaptionExportWord[]): number | null {
  const values = words
    .map((word) => word.confidence)
    .filter((confidence): confidence is number => typeof confidence === 'number');
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 1000) / 1000;
}

function createSegment(text: string, words: CaptionExportWord[]): CaptionSegment {
  return CaptionSegmentSchema.parse({
    text,
    startMs: words[0].startMs,
    endMs: words[words.length - 1].endMs,
    timestampMs: words[0].startMs,
    confidence: averageConfidence(words),
    words,
  });
}

/**
 * Convert word-level timestamps into grouped, portable caption segments.
 *
 * The output keeps word timing for karaoke/highlight rendering while also
 * matching Remotion's caption JSON fields for template interoperability.
 */
export function toCaptionSegments(
  words: WordTimestamp[],
  options: CaptionSegmentOptions = {}
): CaptionSegment[] {
  const captionWords = toCaptionExportWords(words, options);
  if (captionWords.length === 0) return [];

  if ((options.mode ?? 'chunk') === 'page') {
    return createCaptionPages(
      captionWords.map((word) => ({
        text: word.text,
        startMs: word.startMs,
        endMs: word.endMs,
      })),
      options.layout
    ).flatMap((page) => {
      const wordsByTime = captionWords.filter(
        (word) => word.startMs >= page.startMs && word.endMs <= page.endMs
      );
      return wordsByTime.length > 0 ? [createSegment(page.text, wordsByTime)] : [];
    });
  }

  return createCaptionChunks(
    captionWords.map((word) => ({
      word: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
    })),
    layoutToChunkingConfig(options.layout ?? {})
  ).map((chunk) => {
    const wordsByTime = captionWords.filter(
      (word) => word.startMs >= chunk.startMs && word.endMs <= chunk.endMs
    );
    return createSegment(chunk.text, wordsByTime);
  });
}

function countCaptionWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scoreRatio(value: number, limit: number): number {
  if (limit <= 0) return 1;
  if (value <= limit) return 1;
  return Math.max(0, limit / value);
}

function scoreMinimum(value: number, minimum: number): number {
  if (minimum <= 0) return 1;
  if (value >= minimum) return 1;
  return Math.max(0, value / minimum);
}

export function analyzeCaptionSegments(
  segments: CaptionSegment[],
  thresholds: CaptionSegmentQualityThresholds = {}
): CaptionSegmentQualityReport {
  const resolved = { ...DEFAULT_QUALITY_THRESHOLDS, ...thresholds };
  const issues: CaptionSegmentQualityIssue[] = [];

  let maxCharsPerSecond = 0;
  let shortestSegmentMs = segments.length > 0 ? Number.POSITIVE_INFINITY : 0;
  let maxWordsPerSegment = 0;
  let lowConfidenceCount = 0;
  let scoreTotal = 0;

  for (const [index, segment] of segments.entries()) {
    const durationMs = Math.max(0, segment.endMs - segment.startMs);
    const durationSeconds = durationMs / 1000;
    const charCount = segment.text.replace(/\s+/g, '').length;
    const charsPerSecond = durationSeconds > 0 ? charCount / durationSeconds : Infinity;
    const wordCount =
      segment.words.length > 0 ? segment.words.length : countCaptionWords(segment.text);
    const confidence = segment.confidence ?? 1;

    maxCharsPerSecond = Math.max(
      maxCharsPerSecond,
      Number.isFinite(charsPerSecond) ? charsPerSecond : 0
    );
    shortestSegmentMs = Math.min(shortestSegmentMs, durationMs);
    maxWordsPerSegment = Math.max(maxWordsPerSegment, wordCount);

    if (durationMs <= 0) {
      issues.push({
        type: 'invalid-duration',
        severity: 'error',
        segmentIndex: index,
        text: segment.text,
        message: 'Caption segment has zero or negative duration.',
        details: { durationMs },
      });
    }

    if (charsPerSecond > resolved.maxCharsPerSecond) {
      issues.push({
        type: 'fast-cps',
        severity: 'error',
        segmentIndex: index,
        text: segment.text,
        message: `Caption segment is too fast to read at ${charsPerSecond.toFixed(1)} characters per second.`,
        details: { charsPerSecond, maxCharsPerSecond: resolved.maxCharsPerSecond },
      });
    }

    if (durationMs > 0 && durationMs < resolved.minSegmentMs) {
      issues.push({
        type: 'too-short',
        severity: 'warning',
        segmentIndex: index,
        text: segment.text,
        message: `Caption segment is on screen for only ${durationMs}ms.`,
        details: { durationMs, minSegmentMs: resolved.minSegmentMs },
      });
    }

    if (wordCount > resolved.maxWordsPerSegment) {
      issues.push({
        type: 'too-many-words',
        severity: 'warning',
        segmentIndex: index,
        text: segment.text,
        message: `Caption segment contains ${wordCount} words.`,
        details: { wordCount, maxWordsPerSegment: resolved.maxWordsPerSegment },
      });
    }

    if (confidence < resolved.minConfidence) {
      lowConfidenceCount += 1;
      issues.push({
        type: 'low-confidence',
        severity: 'warning',
        segmentIndex: index,
        text: segment.text,
        message: `Caption segment confidence is ${(confidence * 100).toFixed(0)}%.`,
        details: { confidence, minConfidence: resolved.minConfidence },
      });
    }

    const segmentScore =
      scoreRatio(charsPerSecond, resolved.maxCharsPerSecond) * 0.45 +
      scoreMinimum(durationMs, resolved.minSegmentMs) * 0.25 +
      scoreRatio(wordCount, resolved.maxWordsPerSegment) * 0.2 +
      scoreMinimum(confidence, resolved.minConfidence) * 0.1;
    scoreTotal += segmentScore;
  }

  const score = segments.length > 0 ? Math.round((scoreTotal / segments.length) * 1000) / 1000 : 1;
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return CaptionSegmentQualityReportSchema.parse({
    passed: !hasErrors && score >= 0.85,
    score,
    thresholds: resolved,
    summary: {
      segmentCount: segments.length,
      maxCharsPerSecond: Math.round(maxCharsPerSecond * 10) / 10,
      shortestSegmentMs: Number.isFinite(shortestSegmentMs) ? shortestSegmentMs : 0,
      maxWordsPerSegment,
      lowConfidenceCount,
    },
    issues,
  });
}

export function toRemotionCaptions(segments: CaptionSegment[]): RemotionCaption[] {
  return segments.map((segment) =>
    RemotionCaptionSchema.parse({
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs,
      timestampMs: segment.timestampMs,
      confidence: segment.confidence,
    })
  );
}

export function createCaptionExport(
  words: WordTimestamp[],
  options: CaptionSegmentOptions = {}
): CaptionExport {
  const segments = toCaptionSegments(words, options);
  return CaptionExportSchema.parse({
    schemaVersion: CAPTION_EXPORT_SCHEMA_VERSION,
    captions: toRemotionCaptions(segments),
    segments,
    quality: analyzeCaptionSegments(segments),
  });
}

function formatSrtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

function formatAssTime(ms: number): string {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    centiseconds
  ).padStart(2, '0')}`;
}

function normalizeSubtitleText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function escapeAssText(text: string): string {
  return normalizeSubtitleText(text).replace(/[{}]/g, '').replace(/\n/g, '\\N');
}

function buildAssKaraokeText(segment: CaptionSegment): string {
  if (!segment.words.length) {
    return escapeAssText(segment.text);
  }

  const parts: string[] = [];
  for (const [index, word] of segment.words.entries()) {
    const durationCs = Math.max(1, Math.round((word.endMs - word.startMs) / 10));
    const safeWord = escapeAssText(word.text);
    parts.push(`{\\k${durationCs}}${safeWord}`);
    if (index < segment.words.length - 1) {
      parts.push(' ');
    }
  }
  return parts.join('');
}

export function formatSrtCaptions(segments: CaptionSegment[]): string {
  return segments
    .map((segment, index) =>
      [
        String(index + 1),
        `${formatSrtTime(segment.startMs)} --> ${formatSrtTime(segment.endMs)}`,
        normalizeSubtitleText(segment.text),
        '',
      ].join('\n')
    )
    .join('\n');
}

export function formatAssCaptions(
  segments: CaptionSegment[],
  styleOverrides: AssCaptionStyle = {}
): string {
  const style = { ...DEFAULT_ASS_STYLE, ...styleOverrides };
  const events = segments.map(
    (segment) =>
      `Dialogue: 0,${formatAssTime(segment.startMs)},${formatAssTime(
        segment.endMs
      )},Default,${style.karaoke ? buildAssKaraokeText(segment) : escapeAssText(segment.text)}`
  );

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${style.fontName},${style.fontSize},${style.primaryColor},${style.secondaryColor},${style.outlineColor},${style.backColor},1,0,0,0,100,100,0,0,1,4,0,${style.alignment},${style.marginL},${style.marginR},${style.marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Text',
    ...events,
    '',
  ].join('\n');
}
