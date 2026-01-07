/**
 * Caption Component
 *
 * TikTok-style captions with full configuration support.
 * Uses character-based paging for optimal readability.
 *
 * Features:
 * - Background pill highlighting (like native TikTok)
 * - Character-limited lines (not word-count based)
 * - Configurable fonts, colors, animations
 * - Multiple preset styles
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, Sequence, interpolate } from 'remotion';
import { CaptionConfig, CaptionConfigSchema } from './config';
import { createCaptionPages, toTimedWords, CaptionPage, TimedWord } from './paging';
import { PRESET_TIKTOK } from './presets';

/**
 * Props for the Caption component
 */
export interface CaptionProps {
  /** Word timestamps from ASR */
  words: Array<{ word: string; start: number; end: number }>;
  /** Caption configuration (uses TikTok preset if not provided) */
  config?: Partial<CaptionConfig>;
}

/**
 * Main Caption Component
 *
 * Renders TikTok-style paged captions with word-by-word highlighting.
 */
export const Caption: React.FC<CaptionProps> = ({ words, config: configInput }) => {
  const { fps } = useVideoConfig();

  // Merge config with defaults
  const config = useMemo(() => {
    return CaptionConfigSchema.parse({ ...PRESET_TIKTOK, ...configInput });
  }, [configInput]);

  // Convert words and create pages
  const pages = useMemo(() => {
    if (words.length === 0) return [];
    const timedWords = toTimedWords(words);
    return createCaptionPages(timedWords, config.layout);
  }, [words, config.layout]);

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
 * Single Caption Page View
 */
interface CaptionPageViewProps {
  page: CaptionPage;
  config: CaptionConfig;
}

const CaptionPageView: React.FC<CaptionPageViewProps> = ({ page, config }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // Entrance animation
  const enterProgress = useEnterAnimation(frame, fps, config);

  // Position styling
  const positionStyle = usePositionStyle(config, height, enterProgress);

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
                isActive={currentTimeMs >= word.startMs && currentTimeMs < word.endMs}
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
  screenHeight: number,
  enterProgress: number
): React.CSSProperties {
  const edgePx = (config.positionOffset.edgeDistance / 100) * screenHeight;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: `0 ${config.positionOffset.horizontalPadding}px`,
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
        top: edgePx,
        transform: `translateY(${translateY}px)`,
      };
    case 'center':
      return {
        ...baseStyle,
        top: '50%',
        transform: `translateY(calc(-50% + ${translateY}px))`,
      };
    case 'bottom':
    default:
      return {
        ...baseStyle,
        bottom: edgePx,
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

export default Caption;
