/**
 * Short Video Composition
 *
 * Main Remotion composition for short-form videos.
 * Based on SYSTEM-DESIGN §7.4 render composition layers.
 */
import React, { useMemo } from 'react';
import { Composition, AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import type { RenderProps } from '../schema';
import { Caption } from '../captions';
import {
  buildSequences,
  buildVisualTimeline,
  HookClipLayer,
  LegacyClip,
  SceneBackground,
} from './visuals';
import { FontLoader } from './FontLoader';
import { AudioLayers } from './AudioLayers';

/**
 * Main video component
 */
export const ShortVideo: React.FC<RenderProps> = ({
  scenes,
  clips,
  words,
  audioPath,
  audioMix,
  duration: totalDuration,
  captionConfig,
  hook,
  fonts,
}) => {
  const { fps } = useVideoConfig();
  const videoAssets = scenes ?? [];
  const hookDuration = hook?.duration ?? 0;
  const contentDuration = Math.max(0, totalDuration - hookDuration);
  const durationMs = Math.max(0, Math.round(contentDuration * 1000));
  const hookFrames = Math.max(0, Math.ceil(hookDuration * fps));
  const contentFrames = Math.max(1, Math.ceil(contentDuration * fps));

  const visualTimeline = useMemo(
    () => buildVisualTimeline(videoAssets, durationMs),
    [videoAssets, durationMs]
  );

  const visualSequences = useMemo(
    () => buildSequences(visualTimeline, contentDuration, fps),
    [visualTimeline, contentDuration, fps]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <FontLoader fonts={fonts} />
      {hook && hookFrames > 0 ? (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookClipLayer hook={hook} />
        </Sequence>
      ) : null}

      <Sequence from={hookFrames} durationInFrames={contentFrames}>
        {visualSequences.map(({ fromFrame, durationInFrames, scene }, index) => (
          <Sequence key={`scene-${index}`} from={fromFrame} durationInFrames={durationInFrames}>
            <SceneBackground scene={scene} />
          </Sequence>
        ))}

        {clips?.map((clip) => (
          <LegacyClip key={clip.id} clip={clip} fps={fps} />
        ))}

        <AbsoluteFill>
          <Caption words={words} config={captionConfig} />
        </AbsoluteFill>

        <AudioLayers audioPath={audioPath} mix={audioMix} />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Composition registration
 */
export const ShortVideoComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortVideo"
        component={ShortVideo as React.FC}
        durationInFrames={30 * 60} // 60 seconds max
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          clips: [],
          words: [],
          audioPath: '',
          audioMix: undefined,
          duration: 60,
          width: 1080,
          height: 1920,
          fps: 30,
        }}
      />
    </>
  );
};
