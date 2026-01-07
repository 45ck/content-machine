/**
 * Short Video Composition
 *
 * Main Remotion composition for short-form videos.
 * Based on SYSTEM-DESIGN §7.4 render composition layers.
 */
import React, { useMemo } from 'react';
import {
  Composition,
  AbsoluteFill,
  Audio,
  Video,
  Sequence,
  useVideoConfig,
  staticFile,
} from 'remotion';
import type { RenderProps } from '../schema';
import type { VisualAsset, VideoClip } from '../../visuals/schema';
import { Caption } from '../captions';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';

interface VisualSequenceInfo {
  fromFrame: number;
  durationInFrames: number;
  scene: VisualScene;
}

/**
 * Build visual timeline from video assets
 */
function buildVisualTimeline(videoAssets: VisualAsset[], durationMs: number): VisualScene[] {
  let currentStartMs = 0;

  const rawScenes: VisualScene[] = videoAssets.map((asset) => {
    const assetDurationMs = Math.max(0, Math.round(asset.duration * 1000));
    const startMs = currentStartMs;
    const endMs = currentStartMs + assetDurationMs;
    currentStartMs = endMs;

    if (asset.source === 'fallback-color') {
      return {
        startMs,
        endMs,
        url: null,
        backgroundColor: asset.assetPath,
        durationMs: assetDurationMs,
      };
    }
    return { startMs, endMs, url: asset.assetPath, durationMs: assetDurationMs };
  });

  return ensureVisualCoverage(rawScenes, durationMs, { fallbackColor: '#000000' });
}

/**
 * Convert visual timeline to frame-based sequences
 */
function buildSequences(
  visualTimeline: VisualScene[],
  durationSeconds: number,
  fps: number
): VisualSequenceInfo[] {
  const totalFrames = Math.ceil(durationSeconds * fps);
  let fromFrame = 0;

  return visualTimeline.map((scene, index) => {
    const isLast = index === visualTimeline.length - 1;
    const rawDurationFrames = Math.max(1, Math.round(((scene.endMs - scene.startMs) / 1000) * fps));
    const durationInFrames = isLast ? Math.max(1, totalFrames - fromFrame) : rawDurationFrames;

    const seq = { fromFrame, durationInFrames, scene };
    fromFrame += durationInFrames;
    return seq;
  });
}

/** Render a single visual scene */
const SceneBackground: React.FC<{ scene: VisualScene }> = ({ scene }) => (
  <AbsoluteFill>
    {scene.url === null ? (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: scene.backgroundColor ?? '#000000',
        }}
      />
    ) : (
      <Video src={scene.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    )}
  </AbsoluteFill>
);

/** Render legacy clip */
const LegacyClip: React.FC<{ clip: VideoClip; fps: number }> = ({ clip, fps }) => {
  const clipStartFrame = Math.floor(clip.startTime * fps);
  const clipDurationFrames = Math.max(1, Math.floor((clip.endTime - clip.startTime) * fps));

  return (
    <Sequence from={clipStartFrame} durationInFrames={clipDurationFrames}>
      <AbsoluteFill>
        <Video src={clip.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
    </Sequence>
  );
};

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
