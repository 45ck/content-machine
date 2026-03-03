/**
 * Split-Screen Gameplay Composition
 *
 * Renders main content on top and gameplay footage on bottom.
 */
import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Composition,
  Loop,
  Sequence,
  Video,
  staticFile,
  useVideoConfig,
} from 'remotion';
import type { RenderProps } from '../../domain';
import { Caption } from '../captions';
import {
  buildSequences,
  buildVisualTimeline,
  HookClipLayer,
  LegacyClip,
  SceneBackground,
} from './visuals';
import { FontLoader } from './FontLoader';
import { computeSplitScreenLayout } from './split-screen-layout';
import { AudioLayers } from './AudioLayers';
import { Overlays } from './Overlays';

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
  overlays,
  words,
  audioPath,
  audioMix,
  duration: totalDuration,
  captionConfig,
  gameplayClip,
  splitScreenRatio,
  gameplayPosition,
  contentPosition,
  hook,
  fonts,
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
  const hookDuration = hook?.duration ?? 0;
  const contentDuration = Math.max(0, totalDuration - hookDuration);
  const durationMs = Math.max(0, Math.round(contentDuration * 1000));
  const totalFrames = Math.max(1, Math.ceil(contentDuration * fps));
  const hookFrames = Math.max(0, Math.ceil(hookDuration * fps));
  const contentFrames = Math.max(1, Math.ceil(contentDuration * fps));

  const visualTimeline = useMemo(
    () => buildVisualTimeline(scenes ?? [], durationMs),
    [scenes, durationMs]
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
        {!isGameplayFull &&
          visualSequences.map(({ fromFrame, durationInFrames, scene }, index) => (
            <Sequence key={`scene-${index}`} from={fromFrame} durationInFrames={durationInFrames}>
              <SceneBackground
                scene={scene}
                startFrame={hookFrames + fromFrame}
                durationInFrames={durationInFrames}
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
                background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
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

        <Overlays overlays={overlays} layer="below-captions" />

        <AbsoluteFill style={{ top: layout.captions.top, height: layout.captions.height }}>
          <Caption words={words} config={captionConfig} />
        </AbsoluteFill>

        <Overlays overlays={overlays} layer="above-captions" />
        <AudioLayers audioPath={audioPath} mix={audioMix} />
      </Sequence>
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
        audioMix: undefined,
        duration: 60,
        width: 1080,
        height: 1920,
        fps: 30,
        splitScreenRatio: 0.55,
      }}
    />
  );
};
