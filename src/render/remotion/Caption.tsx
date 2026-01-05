/**
 * Caption Component
 *
 * TikTok-style word-by-word captions with highlighting.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CaptionStyle } from '../schema';
import { WordTimestamp } from '../../audio/schema';

interface CaptionProps {
  words: WordTimestamp[];
  currentTime: number;
  style?: CaptionStyle;
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#FFFFFF',
  highlightColor: '#FFE135',
  highlightCurrentWord: true,
  strokeColor: '#000000',
  strokeWidth: 3,
  position: 'center',
  animation: 'pop',
};

export const Caption: React.FC<CaptionProps> = ({ words, currentTime, style = DEFAULT_STYLE }) => {
  if (words.length === 0) return null;

  // Position styling
  const positionStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 40px',
    maxWidth: '90%',
    ...(style.position === 'bottom' && {
      position: 'absolute',
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
    }),
    ...(style.position === 'center' && {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }),
    ...(style.position === 'top' && {
      position: 'absolute',
      top: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
    }),
  };

  return (
    <div style={positionStyle}>
      {words.map((word, _index) => {
        const isActive = currentTime >= word.start && currentTime < word.end;
        const isPast = currentTime >= word.end;

        return (
          <Word
            key={`${word.word}-${_index}`}
            word={word.word}
            isActive={isActive}
            isPast={isPast}
            style={style}
            index={_index}
          />
        );
      })}
    </div>
  );
};

interface WordProps {
  word: string;
  isActive: boolean;
  isPast: boolean;
  style: CaptionStyle;
  index: number;
}

const Word: React.FC<WordProps> = ({ word, isActive, isPast, style, index: _index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation based on style
  let scale = 1;
  let opacity = isPast ? 0.7 : 1;

  if (isActive) {
    if (style.animation === 'pop') {
      scale = interpolate(
        frame % 10, // Subtle pulse every 10 frames
        [0, 5, 10],
        [1, 1.15, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
    } else if (style.animation === 'bounce') {
      const progress = spring({
        frame: frame % 15,
        fps,
        config: {
          damping: 10,
          stiffness: 100,
        },
      });
      scale = 1 + 0.2 * progress;
    }
  }

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
    transform: `scale(${scale})`,
    opacity,
    transition: 'color 0.1s ease-out',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };

  return <span style={wordStyle}>{word}</span>;
};
