/**
 * Caption Component
 *
 * TikTok-style PAGED captions with word-by-word highlighting.
 * Supports multiple display modes:
 * - 'page' (default): Show N words at a time, highlight current (TikTok style)
 * - 'single': Show only ONE word at a time, replaces on each word
 * - 'buildup': Words accumulate per sentence, then clear for next sentence
 *
 * Source: remotion-dev/template-tiktok, @remotion/captions
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, Sequence } from 'remotion';
import { createTikTokStyleCaptions, Caption as RemotionCaption } from '@remotion/captions';
import { CaptionStyle } from '../../domain';
import type { WordTimestamp } from '../../domain';
import { SPRING_CONFIGS } from '../tokens/easing';
import { FONT_STACKS } from '../tokens/font';
import type { CaptionDisplayMode } from '../captions/config';

/** Default: How many milliseconds of words to group into a single "page" */
const DEFAULT_COMBINE_WORDS_WITHIN_MS = 800;

/** Default words per page */
const DEFAULT_WORDS_PER_PAGE = 8;

interface CaptionProps {
  words: WordTimestamp[];
  currentTime: number;
  style?: CaptionStyle;
  /** Override the word grouping window in milliseconds */
  combineWordsWithinMs?: number;
  /** Caption display mode */
  displayMode?: CaptionDisplayMode;
  /** Words per page (for 'page' mode) */
  wordsPerPage?: number;
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: FONT_STACKS.body,
  fontSize: 100, // Larger for better readability
  fontWeight: 'bold',
  color: '#FFFFFF',
  highlightColor: '#00FF00',
  highlightCurrentWord: true,
  strokeColor: '#000000',
  strokeWidth: 5,
  position: 'center',
  animation: 'pop',
};

/**
 * Convert our WordTimestamp[] to Remotion Caption[] format
 */
function toRemotionCaptions(words: WordTimestamp[]): RemotionCaption[] {
  return words.map((w) => ({
    text: w.word + ' ',
    startMs: w.start * 1000,
    endMs: w.end * 1000,
    confidence: 1,
    timestampMs: w.start * 1000,
  }));
}

/**
 * Paged Captions Container
 * Creates TikTok-style pages and renders them as Sequences
 * Supports multiple display modes: page, single, buildup
 */
export const Caption: React.FC<CaptionProps> = ({
  words,
  style = DEFAULT_STYLE,
  combineWordsWithinMs,
  displayMode = 'page',
  wordsPerPage = DEFAULT_WORDS_PER_PAGE,
}) => {
  const { fps } = useVideoConfig();
  const groupMs = combineWordsWithinMs ?? DEFAULT_COMBINE_WORDS_WITHIN_MS;

  // Route to appropriate renderer based on display mode
  if (displayMode === 'single') {
    return <SingleWordCaption words={words} style={style} />;
  }

  if (displayMode === 'buildup') {
    return <BuildupCaption words={words} style={style} />;
  }

  // Default 'page' mode - uses TikTok-style pages with word grouping
  return (
    <PagedCaption
      words={words}
      style={style}
      groupMs={groupMs}
      wordsPerPage={wordsPerPage}
      fps={fps}
    />
  );
};

/**
 * Page Mode: Show N words at a time, highlight current (TikTok style)
 */
interface PagedCaptionProps {
  words: WordTimestamp[];
  style: CaptionStyle;
  groupMs: number;
  wordsPerPage: number;
  fps: number;
}

const PagedCaption: React.FC<PagedCaptionProps> = ({
  words,
  style,
  groupMs,
  wordsPerPage,
  fps,
}) => {
  // Convert to Remotion format and create TikTok-style pages
  const pages = useMemo(() => {
    if (words.length === 0) return [];

    const remotionCaptions = toRemotionCaptions(words);
    const { pages: tikTokPages } = createTikTokStyleCaptions({
      captions: remotionCaptions,
      combineTokensWithinMilliseconds: groupMs,
    });

    // Limit pages to wordsPerPage if needed
    const limitedPages = tikTokPages.map((page) => {
      if (page.tokens.length <= wordsPerPage) return page;
      // Split into multiple pages if too many words
      return {
        ...page,
        tokens: page.tokens.slice(0, wordsPerPage),
      };
    });

    return limitedPages;
  }, [words, groupMs, wordsPerPage]);

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const endFrame = nextPage
          ? Math.floor((nextPage.startMs / 1000) * fps)
          : Math.floor(
              ((page.tokens[page.tokens.length - 1]?.toMs ?? page.startMs + 2000) / 1000) * fps
            );
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionPage page={page} style={style} />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Single Word Mode: Show only ONE word at a time
 * Each word appears when spoken and is replaced by the next word
 */
interface SingleWordCaptionProps {
  words: WordTimestamp[];
  style: CaptionStyle;
}

const SingleWordCaption: React.FC<SingleWordCaptionProps> = ({ words, style }) => {
  const { fps } = useVideoConfig();

  if (words.length === 0) return null;

  return (
    <>
      {words.map((word, index) => {
        const startFrame = Math.floor(word.start * fps);
        const endFrame = Math.floor(word.end * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <SingleWord word={word.word} style={style} />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Single Word Display Component
 */
interface SingleWordProps {
  word: string;
  style: CaptionStyle;
}

const SingleWord: React.FC<SingleWordProps> = ({ word, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pop-in animation
  const enterProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
    durationInFrames: 6,
  });

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    padding: '20px 40px',
    ...(style.position === 'bottom' && { bottom: '20%' }),
    ...(style.position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
    ...(style.position === 'top' && { top: '15%' }),
  };

  const wordStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize * 1.2, // Bigger for single word impact
    fontWeight: style.fontWeight,
    color: style.highlightColor, // Always highlighted since it's the current word
    textShadow: `
      -${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      -${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor}
    `,
    transform: `scale(${0.5 + 0.5 * enterProgress})`,
    opacity: enterProgress,
    textAlign: 'center',
  };

  return (
    <div style={positionStyle}>
      <span style={wordStyle}>{word}</span>
    </div>
  );
};

/**
 * Buildup Mode: Words accumulate per sentence, then clear for next sentence
 * Detects sentence boundaries by punctuation (. ! ?)
 */
interface BuildupCaptionProps {
  words: WordTimestamp[];
  style: CaptionStyle;
}

const BuildupCaption: React.FC<BuildupCaptionProps> = ({ words, style }) => {
  const { fps } = useVideoConfig();

  // Split words into sentences based on punctuation
  const sentences = useMemo(() => {
    if (words.length === 0) return [];

    const result: { words: WordTimestamp[]; startTime: number; endTime: number }[] = [];
    let currentSentence: WordTimestamp[] = [];

    for (const word of words) {
      currentSentence.push(word);

      // Check if word ends a sentence (ends with . ! ? or similar)
      const trimmedWord = word.word.trim();
      if (/[.!?]$/.test(trimmedWord)) {
        result.push({
          words: [...currentSentence],
          startTime: currentSentence[0].start,
          endTime: word.end,
        });
        currentSentence = [];
      }
    }

    // Add remaining words as final sentence
    if (currentSentence.length > 0) {
      result.push({
        words: currentSentence,
        startTime: currentSentence[0].start,
        endTime: currentSentence[currentSentence.length - 1].end,
      });
    }

    return result;
  }, [words]);

  if (sentences.length === 0) return null;

  return (
    <>
      {sentences.map((sentence, sentenceIndex) => {
        const startFrame = Math.floor(sentence.startTime * fps);
        const endFrame = Math.floor(sentence.endTime * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={sentenceIndex} from={startFrame} durationInFrames={durationInFrames}>
            <BuildupSentence
              words={sentence.words}
              sentenceStartTime={sentence.startTime}
              style={style}
            />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Buildup Sentence: Shows words accumulating one by one
 */
interface BuildupSentenceProps {
  words: WordTimestamp[];
  sentenceStartTime: number;
  style: CaptionStyle;
}

const BuildupSentence: React.FC<BuildupSentenceProps> = ({ words, sentenceStartTime, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Current time relative to sentence start
  const currentTimeMs = (frame / fps) * 1000 + sentenceStartTime * 1000;

  // Entrance animation
  const enterProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
    durationInFrames: 8,
  });

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    padding: '20px 40px',
    ...(style.position === 'bottom' && { bottom: '20%' }),
    ...(style.position === 'center' && {
      top: '50%',
      transform: `translateY(-50%) scale(${0.8 + 0.2 * enterProgress})`,
    }),
    ...(style.position === 'top' && { top: '15%' }),
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '90%',
    opacity: enterProgress,
  };

  return (
    <div style={positionStyle}>
      <div style={containerStyle}>
        {words.map((word, index) => {
          const wordStartMs = word.start * 1000;
          const wordEndMs = word.end * 1000;

          // Only show words that have started
          const hasStarted = currentTimeMs >= wordStartMs;
          if (!hasStarted) return null;

          // Is this word currently being spoken?
          const isActive = currentTimeMs >= wordStartMs && currentTimeMs < wordEndMs;

          return <BuildupWord key={index} word={word.word} isActive={isActive} style={style} />;
        })}
      </div>
    </div>
  );
};

/**
 * Single word in buildup mode
 */
interface BuildupWordProps {
  word: string;
  isActive: boolean;
  style: CaptionStyle;
}

const BuildupWord: React.FC<BuildupWordProps> = ({ word, isActive, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Word entrance animation
  const wordEnter = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
    durationInFrames: 5,
  });

  const textColor = isActive ? style.highlightColor : style.color;

  const wordStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: textColor,
    textShadow: `
      -${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      -${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor}
    `,
    display: 'inline-block',
    whiteSpace: 'pre',
    transition: 'color 50ms ease-out',
    transform: `scale(${0.7 + 0.3 * wordEnter})`,
    opacity: wordEnter,
  };

  return <span style={wordStyle}>{word} </span>;
};

/**
 * Single Caption Page - shows all words in the phrase with highlight moving through
 */
interface CaptionPageProps {
  page: {
    text: string;
    startMs: number;
    tokens: Array<{
      text: string;
      fromMs: number;
      toMs: number;
    }>;
  };
  style: CaptionStyle;
}

const CaptionPage: React.FC<CaptionPageProps> = ({ page, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Current time in ms relative to video start
  const currentTimeMs = (frame / fps) * 1000;

  // Page entrance animation
  const enterProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.snappy,
    durationInFrames: 8,
  });

  // Position styling based on style.position
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    padding: '20px 40px',
    ...(style.position === 'bottom' && {
      bottom: '20%',
    }),
    ...(style.position === 'center' && {
      top: '50%',
      transform: `translateY(-50%) scale(${0.8 + 0.2 * enterProgress})`,
    }),
    ...(style.position === 'top' && {
      top: '15%',
    }),
  };

  // Apply entrance animation (scale + translateY)
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '90%',
    transform:
      style.position !== 'center'
        ? `scale(${0.8 + 0.2 * enterProgress}) translateY(${(1 - enterProgress) * 30}px)`
        : undefined,
    opacity: enterProgress,
  };

  return (
    <div style={positionStyle}>
      <div style={containerStyle}>
        {page.tokens.map((token, tokenIndex) => {
          // Is this word currently being spoken?
          const isActive = currentTimeMs >= token.fromMs && currentTimeMs < token.toMs;

          return (
            <WordSpan
              key={`${token.fromMs}-${tokenIndex}`}
              text={token.text}
              isActive={isActive}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Single Word - handles highlight color only (no sliding, no repositioning)
 */
interface WordSpanProps {
  text: string;
  isActive: boolean;
  style: CaptionStyle;
}

const WordSpan: React.FC<WordSpanProps> = ({ text, isActive, style }) => {
  const textColor = isActive ? style.highlightColor : style.color;

  const wordStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: textColor,
    textShadow: `
      -${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
      -${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor},
      ${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor}
    `,
    display: 'inline-block',
    whiteSpace: 'pre',
    transition: 'color 50ms ease-out',
  };

  return <span style={wordStyle}>{text}</span>;
};
