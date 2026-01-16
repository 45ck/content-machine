/**
 * Visual test composition for caption spacing.
 */
import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { Caption } from '../captions/Caption';
import type { CaptionConfigInput } from '../captions/config';
import { parseCaptionConfig } from '../captions/config';

export type CaptionSpacingTestProps = {
  words?: Array<{ word: string; start: number; end: number }>;
  config?: CaptionConfigInput;
};

const DEFAULT_WORDS: Array<{ word: string; start: number; end: number }> = [
  { word: 'Captions', start: 0, end: 0.35 },
  { word: 'should', start: 0.35, end: 0.7 },
  { word: 'feel', start: 0.7, end: 1.05 },
  { word: 'clean,', start: 1.05, end: 1.4 },
  { word: 'spaced,', start: 1.4, end: 1.8 },
  { word: 'and', start: 1.8, end: 2.1 },
  { word: 'readable', start: 2.1, end: 2.6 },
  { word: 'always.', start: 2.6, end: 3.0 },
];

const baseOverrides: CaptionConfigInput = {
  fontSize: 80,
  textTransform: 'none',
  position: 'center',
  highlightMode: 'background',
  textColor: '#FFFFFF',
  highlightColor: '#FFFFFF',
  shadow: { enabled: false },
  stroke: { width: 0, color: '#000000', useWebkitStroke: true },
  layout: {
    maxCharsPerLine: 10,
    maxLinesPerPage: 2,
    maxWordsPerPage: 4,
  },
};

const CaptionSpacingTest: React.FC<CaptionSpacingTestProps> = ({ words, config }) => {
  const mergedConfig: CaptionConfigInput = {
    ...baseOverrides,
    ...config,
    layout: { ...baseOverrides.layout, ...(config?.layout ?? {}) },
    shadow: { ...baseOverrides.shadow, ...(config?.shadow ?? {}) },
    stroke: { ...baseOverrides.stroke, ...(config?.stroke ?? {}) },
  };
  const captionConfig = parseCaptionConfig(mergedConfig);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <Caption words={words ?? DEFAULT_WORDS} config={captionConfig} />
    </AbsoluteFill>
  );
};

export const CaptionSpacingTestComposition: React.FC = () => {
  return (
    <Composition
      id="caption-spacing-test"
      component={CaptionSpacingTest}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};

const CaptionOcrTest: React.FC = () => {
  return (
    <CaptionSpacingTest
      words={[
        { word: 'one', start: 0, end: 0.5 },
        { word: 'two', start: 0.5, end: 1.0 },
        { word: 'three', start: 1.0, end: 1.5 },
        { word: 'four', start: 1.5, end: 2.0 },
      ]}
      config={{
        displayMode: 'page',
        textTransform: 'none',
        highlightMode: 'color',
        textColor: '#FFFFFF',
        highlightColor: '#FFFFFF',
        fontFamily: 'Courier New, Courier, monospace',
        wordSpacing: 0.8,
        letterSpacing: 0.04,
        fontSize: 96,
        shadow: { enabled: false },
        stroke: { width: 0, color: '#000000', useWebkitStroke: true },
      }}
    />
  );
};

export const CaptionOcrTestComposition: React.FC = () => {
  return (
    <Composition
      id="caption-ocr-test"
      component={CaptionOcrTest}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};
