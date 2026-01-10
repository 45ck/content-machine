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
import { computeSplitScreenLayout } from './split-screen-layout';

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
  gameplayPosition,
  contentPosition,
}) => {
  const { fps, height } = useVideoConfig();

  const layout = useMemo(
    () =>
      computeSplitScreenLayout({
        height,
        ratio: splitScreenRatio ?? 0.55,
        contentPosition,
        gameplayPosition,
      }),
    [height, splitScreenRatio, contentPosition, gameplayPosition]
  );

  const isGameplayFull = layout.isGameplayFull;
  const isContentFull = layout.isContentFull;
  const contentHeight = layout.content.height;
  const contentTop = layout.content.top;
  const gameplayHeight = layout.gameplay.height;
  const gameplayTop = layout.gameplay.top;
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
      {!isGameplayFull &&
        visualSequences.map(({ fromFrame, durationInFrames, scene }, index) => (
          <Sequence key={`scene-${index}`} from={fromFrame} durationInFrames={durationInFrames}>
            <SceneBackground
              scene={scene}
              containerStyle={{ top: contentTop, height: contentHeight, overflow: 'hidden' }}
            />
          </Sequence>
        ))}
      {!isGameplayFull && clips?.length ? (
        <AbsoluteFill style={{ top: contentTop, height: contentHeight, overflow: 'hidden' }}>
          {clips.map((clip) => (
            <LegacyClip key={clip.id} clip={clip} fps={fps} />
          ))}
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ top: gameplayTop, height: gameplayHeight }}>
        {gameplayClip?.path ? (
          <Loop durationInFrames={totalFrames}>
            <Video
              src={resolveGameplaySrc(gameplayClip.path)}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Loop>
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0b0b0f' }} />
        )}
      </AbsoluteFill>

      {!isContentFull && !isGameplayFull ? (
        <>
          <AbsoluteFill
            style={{
              top: contentTop,
              height: contentHeight,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
            }}
          />
          <AbsoluteFill
            style={{
              top: contentTop + contentHeight - 24,
              height: 24,
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
            }}
          />
        </>
      ) : null}

      <AbsoluteFill style={{ top: layout.captions.top, height: layout.captions.height }}>
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
