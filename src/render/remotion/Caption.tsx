/**
 * Caption Component
 *
 * TikTok-style PAGED captions with word-by-word highlighting.
 * The phrase stays STATIC on screen while the highlight moves across words.
 * When phrase ends, it snaps to the next phrase.
 *
 * This matches how real TikTok/Reels captions work - like karaoke!
 *
 * Source: remotion-dev/template-tiktok, @remotion/captions
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, Sequence } from 'remotion';
import { createTikTokStyleCaptions, Caption as RemotionCaption } from '@remotion/captions';
import { CaptionStyle } from '../schema';
import { WordTimestamp } from '../../audio/schema';
import { SPRING_CONFIGS } from '../tokens/easing';

/** How many milliseconds of words to group into a single "page" */
const COMBINE_WORDS_WITHIN_MS = 800;

interface CaptionProps {
  words: WordTimestamp[];
  currentTime: number;
  style?: CaptionStyle;
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
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
 */
export const Caption: React.FC<CaptionProps> = ({ words, style = DEFAULT_STYLE }) => {
  const { fps } = useVideoConfig();

  // Convert to Remotion format and create TikTok-style pages
  const pages = useMemo(() => {
    if (words.length === 0) return [];

    const remotionCaptions = toRemotionCaptions(words);
    const { pages: tikTokPages } = createTikTokStyleCaptions({
      captions: remotionCaptions,
      combineTokensWithinMilliseconds: COMBINE_WORDS_WITHIN_MS,
    });

    return tikTokPages;
  }, [words]);

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
