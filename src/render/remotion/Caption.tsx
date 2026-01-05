/**
 * Caption Component
 *
 * TikTok-style word-by-word captions with highlighting.
 * Uses research-backed animation values from the style system.
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CaptionStyle } from '../schema';
import { WordTimestamp } from '../../audio/schema';
import { SPRING_CONFIGS } from '../tokens/easing';
import { TIMING_MS, msToFrames } from '../tokens/timing';
import { ANIMATION_PRESETS } from '../presets/animation';

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

  // Get animation preset for scale values
  const popPreset = ANIMATION_PRESETS.pop;
  const bouncePreset = ANIMATION_PRESETS.bounce;

  // Calculate frame duration from research-backed timing (100ms = ~3 frames at 30fps)
  const popFrameDuration = msToFrames(TIMING_MS.wordPop, fps);

  // Animation based on style
  let scale = 1;
  let opacity = isPast ? 0.7 : 1;

  if (isActive) {
    if (style.animation === 'pop') {
      // Research-backed: 70-130ms pop with scale 1→1.15
      // Using punchyPop easing (cubic-bezier(0.34, 1.56, 0.64, 1))
      const animFrame = frame % popFrameDuration;
      const midPoint = Math.floor(popFrameDuration / 2);
      scale = interpolate(
        animFrame,
        [0, midPoint, popFrameDuration],
        [1, popPreset.scale?.to ?? 1.15, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
    } else if (style.animation === 'bounce') {
      // Research-backed: Spring-based bounce with overshoot
      // Using bouncy spring config from tokens
      const progress = spring({
        frame: frame % msToFrames(TIMING_MS.wordPop, fps),
        fps,
        config: SPRING_CONFIGS.bouncy,
      });
      scale = 1 + ((bouncePreset.scale?.to ?? 1.2) - 1) * progress;
    } else if (style.animation === 'fade') {
      // Fade animation from presets
      const fadePreset = ANIMATION_PRESETS.fade;
      const fadeFrames = msToFrames(fadePreset.duration, fps);
      opacity = interpolate(frame % fadeFrames, [0, fadeFrames], [0.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  const textColor = isActive ? style.highlightColor : style.color;

  // Research-backed: Use highlightTransition timing (100ms)
  const transitionDuration = `${TIMING_MS.highlightTransition}ms`;

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
    transition: `color ${transitionDuration} ease-out`,
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };

  return <span style={wordStyle}>{word}</span>;
};
