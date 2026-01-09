/**
 * Short Video Composition
 *
 * Main Remotion composition for short-form videos.
 * Based on SYSTEM-DESIGN §7.4 render composition layers.
 */
import React, { useMemo } from 'react';
import { Composition, AbsoluteFill, Audio, Sequence, useVideoConfig, staticFile } from 'remotion';
import type { RenderProps } from '../schema';
import { Caption } from '../captions';
import { buildSequences, buildVisualTimeline, LegacyClip, SceneBackground } from './visuals';

/**
 * Main video component
 */
export const ShortVideo: React.FC<RenderProps> = ({
  scenes,
  clips,
  words,
  audioPath,
  duration: totalDuration,
  captionConfig,
}) => {
  const { fps } = useVideoConfig();
  const videoAssets = scenes ?? [];
  const durationMs = Math.max(0, Math.round(totalDuration * 1000));

  const visualTimeline = useMemo(
    () => buildVisualTimeline(videoAssets, durationMs),
    [videoAssets, durationMs]
  );

  const visualSequences = useMemo(
    () => buildSequences(visualTimeline, totalDuration, fps),
    [visualTimeline, totalDuration, fps]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
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

      <Audio src={staticFile(audioPath)} />
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
          duration: 60,
          width: 1080,
          height: 1920,
          fps: 30,
        }}
      />
    </>
  );
};
