/**
 * Caption Component
 *
 * CapCut-style captions with full configuration support.
 * Uses character-based paging for optimal readability.
 *
 * Features:
 * - Background pill highlighting (like native TikTok)
 * - Character-limited lines (not word-count based)
 * - Configurable fonts, colors, animations
 * - Multiple preset styles
 * - Multiple display modes: page, single, buildup
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, Sequence, interpolate } from 'remotion';
import { CaptionConfig, CaptionConfigSchema, CaptionDisplayMode } from './config';
import { createCaptionPages, toTimedWords, CaptionPage, TimedWord, isDisplayableWord } from './paging';
import { createCaptionChunks, layoutToChunkingConfig, chunkToPage } from './chunking';
import { PRESET_CAPCUT_BOLD } from './presets';
import { isWordActive } from './timing';
import { SAFE_ZONES, type PlatformName } from '../tokens/safe-zone';

/**
 * Props for the Caption component
 */
export interface CaptionProps {
  /** Word timestamps from ASR */
  words: Array<{ word: string; start: number; end: number }>;
  /** Caption configuration (uses CapCut preset if not provided) */
  config?: Partial<CaptionConfig>;
}

/**
 * Main Caption Component
 *
 * Renders captions with configurable display mode:
 * - 'page' (default): TikTok-style paged captions with word highlighting
 * - 'single': Show only ONE word at a time
 * - 'buildup': Words accumulate per sentence, then clear
 */
export const Caption: React.FC<CaptionProps> = ({ words, config: configInput }) => {
  const { fps } = useVideoConfig();

  // Merge config with defaults
  const config = useMemo(() => {
    return CaptionConfigSchema.parse({ ...PRESET_CAPCUT_BOLD, ...configInput });
  }, [configInput]);

  const displayMode: CaptionDisplayMode = config.displayMode ?? 'page';
  const displayWords = useMemo(
    () => words.filter((word) => typeof word.word === 'string' && isDisplayableWord(word.word)),
    [words]
  );

  // Route to appropriate renderer based on display mode
  if (displayMode === 'single') {
    return <SingleWordCaption words={displayWords} config={config} />;
  }

  if (displayMode === 'buildup') {
    return <BuildupCaption words={displayWords} config={config} />;
  }

  if (displayMode === 'chunk') {
    return <ChunkedCaption words={displayWords} config={config} fps={fps} />;
  }

  // Default 'page' mode - uses TikTok-style pages with word grouping
  return <PagedCaption words={displayWords} config={config} fps={fps} />;
};

/**
 * Page Mode: Show N words at a time, highlight current (TikTok style)
 */
interface PagedCaptionProps {
  words: Array<{ word: string; start: number; end: number }>;
  config: CaptionConfig;
  fps: number;
}

const PagedCaption: React.FC<PagedCaptionProps> = ({ words, config, fps }) => {
  // Convert words and create pages
  const pages = useMemo(() => {
    if (words.length === 0) return [];
    const timedWords = toTimedWords(words);
    return createCaptionPages(timedWords, {
      ...config.layout,
      maxWordsPerPage: config.wordsPerPage ?? config.layout.maxWordsPerPage,
    });
  }, [words, config.layout, config.wordsPerPage]);

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1];
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const endFrame = nextPage
          ? Math.floor((nextPage.startMs / 1000) * fps)
          : Math.floor((page.endMs / 1000) * fps) + Math.floor(fps * 0.5); // Hold for 0.5s after last word
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={page.index} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionPageView page={page} config={config} />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Chunk Mode: CapCut-style phrase grouping using timing-aware chunking
 */
interface ChunkedCaptionProps {
  words: Array<{ word: string; start: number; end: number }>;
  config: CaptionConfig;
  fps: number;
}

const ChunkedCaption: React.FC<ChunkedCaptionProps> = ({ words, config, fps }) => {
  const pages = useMemo(() => {
    if (words.length === 0) return [];
    const timedWords = toTimedWords(words);
    const chunkWords = timedWords.map((word) => ({
      word: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
    }));
    const chunks = createCaptionChunks(
      chunkWords,
      layoutToChunkingConfig({
        ...config.layout,
        maxWordsPerPage: config.wordsPerPage ?? config.layout.maxWordsPerPage,
      })
    );
    return chunks.map((chunk) => chunkToPage(chunk));
  }, [words, config.layout, config.wordsPerPage]);

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1];
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const endFrame = nextPage
          ? Math.floor((nextPage.startMs / 1000) * fps)
          : Math.floor((page.endMs / 1000) * fps) + Math.floor(fps * 0.35);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={`chunk-${page.index}`} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionPageView page={page} config={config} />
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
  words: Array<{ word: string; start: number; end: number }>;
  config: CaptionConfig;
}

const SingleWordCaption: React.FC<SingleWordCaptionProps> = ({ words, config }) => {
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
            <SingleWordView word={word.word} config={config} />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Single Word Display Component
 */
interface SingleWordViewProps {
  word: string;
  config: CaptionConfig;
}

const SingleWordView: React.FC<SingleWordViewProps> = ({ word, config }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();

  // Pop-in animation
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 300 },
    durationInFrames: 6,
  });

  const safeZone = getSafeZoneMetrics(config, width, height);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    paddingLeft: safeZone.paddingLeft,
    paddingRight: safeZone.paddingRight,
    ...(config.position === 'bottom' && { bottom: safeZone.bottomOffset }),
    ...(config.position === 'center' && {
      top: safeZone.centerY,
      transform: 'translateY(-50%)',
    }),
    ...(config.position === 'top' && { top: safeZone.topOffset }),
  };

  const text = applyTextTransform(word, config.textTransform);

  // Build text shadow/stroke
  const textShadow = buildTextShadow(config);

  const wordStyle: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize * 1.2, // Bigger for single word impact
    fontWeight: config.fontWeight === 'black' ? 900 : config.fontWeight === 'bold' ? 700 : 400,
    color: config.highlightColor, // Always highlighted since it's the current word
    letterSpacing: `${config.letterSpacing}em`,
    transform: `scale(${0.5 + 0.5 * enterProgress})`,
    opacity: enterProgress,
    textAlign: 'center',
    textShadow,
    ...(config.stroke.width > 0 &&
      config.stroke.useWebkitStroke && {
        WebkitTextStroke: `${config.stroke.width}px ${config.stroke.color}`,
        WebkitTextFillColor: config.highlightColor,
        paintOrder: 'stroke fill',
      }),
  };

  // Wrap in pill if background mode
  if (config.highlightMode === 'background') {
    return (
      <div style={positionStyle}>
        <span style={getPillStyle(config)}>
          <span style={wordStyle}>{text}</span>
        </span>
      </div>
    );
  }

  return (
    <div style={positionStyle}>
      <span style={wordStyle}>{text}</span>
    </div>
  );
};

/**
 * Buildup Mode: Words accumulate per sentence, then clear for next sentence
 * Detects sentence boundaries by punctuation (. ! ?)
 */
interface BuildupCaptionProps {
  words: Array<{ word: string; start: number; end: number }>;
  config: CaptionConfig;
}

const BuildupCaption: React.FC<BuildupCaptionProps> = ({ words, config }) => {
  const { fps } = useVideoConfig();

  // Split words into sentences based on punctuation
  const sentences = useMemo(() => {
    if (words.length === 0) return [];

    const result: { words: typeof words; startTime: number; endTime: number }[] = [];
    let currentSentence: typeof words = [];

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
            <BuildupSentenceView
              words={sentence.words}
              sentenceStartTime={sentence.startTime}
              config={config}
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
interface BuildupSentenceViewProps {
  words: Array<{ word: string; start: number; end: number }>;
  sentenceStartTime: number;
  config: CaptionConfig;
}

const BuildupSentenceView: React.FC<BuildupSentenceViewProps> = ({
  words,
  sentenceStartTime,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();

  // Current time relative to sentence start
  const sequenceTimeMs = (frame / fps) * 1000;
  const sentenceStartMs = sentenceStartTime * 1000;

  // Entrance animation
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 300 },
    durationInFrames: 8,
  });

  const safeZone = getSafeZoneMetrics(config, width, height);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
    paddingLeft: safeZone.paddingLeft,
    paddingRight: safeZone.paddingRight,
    ...(config.position === 'bottom' && { bottom: safeZone.bottomOffset }),
    ...(config.position === 'center' && {
      top: safeZone.centerY,
      transform: `translateY(-50%) scale(${0.8 + 0.2 * enterProgress})`,
    }),
    ...(config.position === 'top' && { top: safeZone.topOffset }),
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

          // Relative timing: word start relative to sentence start
          const relativeWordStartMs = wordStartMs - sentenceStartMs;

          // Only show words that have started (relative to sequence start)
          const hasStarted = sequenceTimeMs >= relativeWordStartMs;
          if (!hasStarted) return null;

          // Is this word currently being spoken?
          const isActive =
            sequenceTimeMs >= relativeWordStartMs && sequenceTimeMs < wordEndMs - sentenceStartMs;

          return (
            <BuildupWordView key={index} word={word.word} isActive={isActive} config={config} />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Single word in buildup mode
 */
interface BuildupWordViewProps {
  word: string;
  isActive: boolean;
  config: CaptionConfig;
}

const BuildupWordView: React.FC<BuildupWordViewProps> = ({ word, isActive, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Word entrance animation
  const wordEnter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 300 },
    durationInFrames: 5,
  });

  const textColor = isActive ? config.highlightColor : config.textColor;
  const text = applyTextTransform(word, config.textTransform);
  const textShadow = buildTextShadow(config);

  const wordStyle: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight === 'black' ? 900 : config.fontWeight === 'bold' ? 700 : 400,
    color: textColor,
    letterSpacing: `${config.letterSpacing}em`,
    display: 'inline-block',
    whiteSpace: 'pre',
    transition: `color ${config.wordTransitionMs}ms ease-out`,
    transform: `scale(${0.7 + 0.3 * wordEnter})`,
    opacity: wordEnter,
    textShadow,
    ...(config.stroke.width > 0 &&
      config.stroke.useWebkitStroke && {
        WebkitTextStroke: `${config.stroke.width}px ${config.stroke.color}`,
        WebkitTextFillColor: textColor,
        paintOrder: 'stroke fill',
      }),
  };

  // Wrap in pill if background mode and active
  if (isActive && config.highlightMode === 'background') {
    return (
      <span style={getPillStyle(config)}>
        <span style={wordStyle}>{text} </span>
      </span>
    );
  }

  return <span style={wordStyle}>{text} </span>;
};

/**
 * Single Caption Page View
 */
interface CaptionPageViewProps {
  page: CaptionPage;
  config: CaptionConfig;
}

const CaptionPageView: React.FC<CaptionPageViewProps> = ({ page, config }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();

  // CRITICAL: Convert frame to sequence-relative time in ms
  // frame is relative to Sequence start (resets to 0 for each page)
  const sequenceTimeMs = (frame / fps) * 1000;

  // Entrance animation
  const enterProgress = useEnterAnimation(frame, fps, config);

  // Position styling
  const positionStyle = usePositionStyle(config, width, height, enterProgress);

  return (
    <div style={positionStyle}>
      <div style={getContainerStyle(config, enterProgress)}>
        {page.lines.map((line, lineIndex) => (
          <div key={lineIndex} style={getLineStyle(config)}>
            {line.words.map((word, wordIndex) => (
              <WordView
                key={`${word.startMs}-${wordIndex}`}
                word={word}
                config={config}
                isActive={isWordActive(
                  { startMs: word.startMs, endMs: word.endMs },
                  page.startMs,
                  sequenceTimeMs
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Single Word View with highlighting
 */
interface WordViewProps {
  word: TimedWord;
  config: CaptionConfig;
  isActive: boolean;
}

const WordView: React.FC<WordViewProps> = ({ word, config, isActive }) => {
  const wordStyle = getWordStyle(config, isActive);
  const pillStyle =
    isActive && config.highlightMode === 'background' ? getPillStyle(config) : undefined;

  const text =
    config.textTransform === 'uppercase'
      ? word.text.toUpperCase()
      : config.textTransform === 'lowercase'
        ? word.text.toLowerCase()
        : config.textTransform === 'capitalize'
          ? word.text.charAt(0).toUpperCase() + word.text.slice(1)
          : word.text;

  if (pillStyle) {
    return (
      <span style={getWordWrapperStyle()}>
        <span style={pillStyle}>
          <span style={wordStyle}>{text}</span>
        </span>
      </span>
    );
  }

  return (
    <span style={getWordWrapperStyle()}>
      <span style={wordStyle}>{text}</span>
    </span>
  );
};

// === STYLE HELPERS ===

interface SafeZoneMetrics {
  paddingLeft: number;
  paddingRight: number;
  topOffset: number;
  bottomOffset: number;
  centerY: number;
}

function resolveSafeZoneInsets(
  config: CaptionConfig,
  width: number,
  height: number
): { top: number; bottom: number; left: number; right: number } {
  if (!config.safeZone?.enabled) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const platform = (config.safeZone.platform ?? 'universal') as PlatformName;
  const zone = SAFE_ZONES[platform];
  const scaleX = width / 1080;
  const scaleY = height / 1920;

  return {
    top: zone.top * scaleY,
    bottom: zone.bottom * scaleY,
    left: zone.left * scaleX,
    right: zone.right * scaleX,
  };
}

function getSafeZoneMetrics(
  config: CaptionConfig,
  width: number,
  height: number
): SafeZoneMetrics {
  const safeZone = resolveSafeZoneInsets(config, width, height);
  const edgePx = (config.positionOffset.edgeDistance / 100) * height;
  const paddingLeft = Math.max(config.positionOffset.horizontalPadding, safeZone.left);
  const paddingRight = Math.max(config.positionOffset.horizontalPadding, safeZone.right);
  const topOffset = Math.max(edgePx, safeZone.top);
  const bottomOffset = Math.max(edgePx, safeZone.bottom);
  const safeHeight = Math.max(0, height - safeZone.top - safeZone.bottom);
  const centerY = safeZone.top + safeHeight * 0.5;

  return {
    paddingLeft,
    paddingRight,
    topOffset,
    bottomOffset,
    centerY,
  };
}

function useEnterAnimation(frame: number, fps: number, config: CaptionConfig): number {
  const animDuration = Math.ceil((config.animationDuration / 1000) * fps);

  switch (config.pageAnimation) {
    case 'pop':
    case 'bounce':
      return spring({
        frame,
        fps,
        config:
          config.pageAnimation === 'bounce'
            ? { damping: 8, stiffness: 200 }
            : { damping: 15, stiffness: 300 },
        durationInFrames: animDuration,
      });
    case 'fade':
    case 'slideUp':
    case 'slideDown':
      return interpolate(frame, [0, animDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    default:
      return 1;
  }
}

function usePositionStyle(
  config: CaptionConfig,
  screenWidth: number,
  screenHeight: number,
  enterProgress: number
): React.CSSProperties {
  const safeZone = getSafeZoneMetrics(config, screenWidth, screenHeight);

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    paddingLeft: safeZone.paddingLeft,
    paddingRight: safeZone.paddingRight,
  };

  // Slide animation offset
  let translateY = 0;
  if (config.pageAnimation === 'slideUp') {
    translateY = (1 - enterProgress) * 50;
  } else if (config.pageAnimation === 'slideDown') {
    translateY = (enterProgress - 1) * 50;
  }

  switch (config.position) {
    case 'top':
      return {
        ...baseStyle,
        top: safeZone.topOffset,
        transform: `translateY(${translateY}px)`,
      };
    case 'center':
      return {
        ...baseStyle,
        top: safeZone.centerY,
        transform: `translateY(calc(-50% + ${translateY}px))`,
      };
    case 'bottom':
    default:
      return {
        ...baseStyle,
        bottom: safeZone.bottomOffset,
        transform: `translateY(${-translateY}px)`,
      };
  }
}

function getContainerStyle(config: CaptionConfig, enterProgress: number): React.CSSProperties {
  const scale =
    config.pageAnimation === 'pop' || config.pageAnimation === 'bounce'
      ? 0.8 + 0.2 * enterProgress
      : 1;

  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${config.lineHeight * 0.5}em`,
    opacity: enterProgress,
    transform: `scale(${scale})`,
  };
}

function getLineStyle(config: CaptionConfig): React.CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    lineHeight: config.lineHeight,
  };
}

function getWordWrapperStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
  };
}

function getWordStyle(config: CaptionConfig, isActive: boolean): React.CSSProperties {
  const textColor = isActive ? config.highlightColor : config.textColor;
  const opacity = isActive ? 1 : config.inactiveOpacity;

  // Build text shadow
  let textShadow = '';
  if (config.shadow.enabled) {
    textShadow = `${config.shadow.offsetX}px ${config.shadow.offsetY}px ${config.shadow.blur}px ${config.shadow.color}`;
  }

  // Glow effect for active word
  if (isActive && config.highlightMode === 'glow') {
    textShadow = `0 0 20px ${config.highlightColor}, 0 0 40px ${config.highlightColor}, ${textShadow}`;
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight === 'black' ? 900 : config.fontWeight === 'bold' ? 700 : 400,
    color: textColor,
    letterSpacing: `${config.letterSpacing}em`,
    opacity,
    transition: `color ${config.wordTransitionMs}ms ease-out, opacity ${config.wordTransitionMs}ms ease-out`,
    whiteSpace: 'pre',
  };

  // Apply stroke
  if (config.stroke.width > 0) {
    if (config.stroke.useWebkitStroke) {
      return {
        ...baseStyle,
        WebkitTextStroke: `${config.stroke.width}px ${config.stroke.color}`,
        WebkitTextFillColor: textColor,
        paintOrder: 'stroke fill',
        textShadow,
      };
    } else {
      // Fallback to text-shadow based stroke
      const sw = config.stroke.width;
      const sc = config.stroke.color;
      const strokeShadow = `
        -${sw}px -${sw}px 0 ${sc},
        ${sw}px -${sw}px 0 ${sc},
        -${sw}px ${sw}px 0 ${sc},
        ${sw}px ${sw}px 0 ${sc}
      `;
      return {
        ...baseStyle,
        textShadow: strokeShadow + (textShadow ? `, ${textShadow}` : ''),
      };
    }
  }

  return { ...baseStyle, textShadow };
}

function getPillStyle(config: CaptionConfig): React.CSSProperties {
  return {
    backgroundColor: config.pillStyle.color,
    borderRadius: config.pillStyle.borderRadius,
    padding: `${config.pillStyle.paddingY}px ${config.pillStyle.paddingX}px`,
    marginLeft: -config.pillStyle.paddingX / 2,
    marginRight: -config.pillStyle.paddingX / 2,
    border:
      config.pillStyle.borderWidth > 0
        ? `${config.pillStyle.borderWidth}px solid ${config.pillStyle.borderColor}`
        : undefined,
    display: 'inline-block',
  };
}

/**
 * Apply text transform to a word
 */
function applyTextTransform(text: string, transform: CaptionConfig['textTransform']): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.charAt(0).toUpperCase() + text.slice(1);
    default:
      return text;
  }
}

/**
 * Build text shadow string from config
 */
function buildTextShadow(config: CaptionConfig): string {
  let textShadow = '';

  if (config.shadow.enabled) {
    textShadow = `${config.shadow.offsetX}px ${config.shadow.offsetY}px ${config.shadow.blur}px ${config.shadow.color}`;
  }

  // If not using webkit stroke, add text-shadow based stroke
  if (config.stroke.width > 0 && !config.stroke.useWebkitStroke) {
    const sw = config.stroke.width;
    const sc = config.stroke.color;
    const strokeShadow = `
      -${sw}px -${sw}px 0 ${sc},
      ${sw}px -${sw}px 0 ${sc},
      -${sw}px ${sw}px 0 ${sc},
      ${sw}px ${sw}px 0 ${sc}
    `.trim();
    textShadow = strokeShadow + (textShadow ? `, ${textShadow}` : '');
  }

  return textShadow;
}

export default Caption;
