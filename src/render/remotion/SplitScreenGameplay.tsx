/**
 * Split-Screen Gameplay Composition
 *
 * Renders main content on top and gameplay footage on bottom.
 */
import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Loop,
  Sequence,
  Video,
  staticFile,
  useVideoConfig,
} from 'remotion';
import type { RenderProps } from '../schema';
import { Caption } from '../captions';
import { buildSequences, buildVisualTimeline, LegacyClip, SceneBackground } from './visuals';

function clampRatio(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveGameplaySrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return staticFile(path);
}

/**
 * Main split-screen component.
 */
export const SplitScreenGameplay: React.FC<RenderProps> = ({
  scenes,
  clips,
  words,
  audioPath,
  duration: totalDuration,
  captionConfig,
  gameplayClip,
  splitScreenRatio,
}) => {
  const { fps, height } = useVideoConfig();
  const ratio = clampRatio(splitScreenRatio ?? 0.55, 0.3, 0.7);
  const topHeight = Math.round(height * ratio);
  const bottomHeight = height - topHeight;
  const durationMs = Math.max(0, Math.round(totalDuration * 1000));
  const totalFrames = Math.ceil(totalDuration * fps);

  const visualTimeline = useMemo(
    () => buildVisualTimeline(scenes ?? [], durationMs),
    [scenes, durationMs]
  );

  const visualSequences = useMemo(
    () => buildSequences(visualTimeline, totalDuration, fps),
    [visualTimeline, totalDuration, fps]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {visualSequences.map(({ fromFrame, durationInFrames, scene }, index) => (
        <Sequence key={`scene-${index}`} from={fromFrame} durationInFrames={durationInFrames}>
          <SceneBackground
            scene={scene}
            containerStyle={{ height: topHeight, overflow: 'hidden' }}
          />
        </Sequence>
      ))}
      {clips?.length ? (
        <AbsoluteFill style={{ height: topHeight, overflow: 'hidden' }}>
          {clips.map((clip) => (
            <LegacyClip key={clip.id} clip={clip} fps={fps} />
          ))}
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ top: topHeight, height: bottomHeight }}>
        {gameplayClip?.path ? (
          <Loop durationInFrames={totalFrames}>
            <Video
              src={resolveGameplaySrc(gameplayClip.path)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Loop>
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0b0b0f' }} />
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          height: topHeight,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
      <AbsoluteFill
        style={{
          top: topHeight - 24,
          height: 24,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      <AbsoluteFill style={{ height: topHeight, overflow: 'hidden' }}>
        <Caption words={words} config={captionConfig} />
      </AbsoluteFill>

      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};

/**
 * Composition registration.
 */
export const SplitScreenGameplayComposition: React.FC = () => {
  return (
    <Composition
      id="SplitScreenGameplay"
      component={SplitScreenGameplay as React.FC}
      durationInFrames={30 * 60}
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
        splitScreenRatio: 0.55,
      }}
    />
  );
};
