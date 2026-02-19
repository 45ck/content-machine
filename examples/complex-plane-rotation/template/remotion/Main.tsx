import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Loop,
  Sequence,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
// This example is intended to run from this repo without publishing/installing the package.
import type { RenderProps } from '../../../../src/domain';
import * as TemplateSDK from '../../../../src/render/template-sdk';
import { ComplexPlane, type ComplexPlaneParams } from './ComplexPlane';
import { RunnerGameplay } from './RunnerGameplay';

const {
  Caption,
  AudioLayers,
  FontLoader,
  HookClipLayer,
  SceneBackground,
  buildSequences,
  buildVisualTimeline,
  computeSplitScreenLayout,
} = TemplateSDK as any;

function resolveGameplaySrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return staticFile(path);
}

function coerceDiagramParams(raw: unknown): ComplexPlaneParams {
  const fallback: ComplexPlaneParams = {
    x: 2,
    y: 3,
    rotationStartSec: 13,
    rotationEndSec: 20,
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const x = typeof obj.x === 'number' ? obj.x : fallback.x;
  const y = typeof obj.y === 'number' ? obj.y : fallback.y;
  const rotationStartSec =
    typeof obj.rotationStartSec === 'number' ? obj.rotationStartSec : fallback.rotationStartSec;
  const rotationEndSec =
    typeof obj.rotationEndSec === 'number' ? obj.rotationEndSec : fallback.rotationEndSec;
  return {
    x,
    y,
    rotationStartSec,
    rotationEndSec: Math.max(rotationStartSec + 0.25, rotationEndSec),
  };
}

export const Main: React.FC<RenderProps> = (props) => {
  const { fps, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const gameplayMode = ((props.templateParams as any)?.gameplayMode as string | undefined) ?? 'auto';
  const directorMode = ((props.templateParams as any)?.directorMode as string | undefined) ?? 'mixed';

  const layout = useMemo(
    () =>
      computeSplitScreenLayout({
        height,
        ratio: props.splitScreenRatio ?? 0.55,
        contentPosition: props.contentPosition,
        gameplayPosition: props.gameplayPosition,
      }),
    [height, props.splitScreenRatio, props.contentPosition, props.gameplayPosition]
  );

  const isGameplayFull = layout.isGameplayFull;
  const isContentFull = layout.isContentFull;
  const contentHeight = layout.content.height;
  const contentTop = layout.content.top;
  const gameplayHeight = layout.gameplay.height;
  const gameplayTop = layout.gameplay.top;

  // Match built-in SplitScreenGameplay behavior: hooks are prepended, but the main
  // content timeline (scenes/captions) should align to audio-first timestamps.
  const hookDuration = (props as any).hook?.duration ?? 0;
  const totalDuration = props.duration;
  const contentDuration = Math.max(0, totalDuration - hookDuration);
  const hookFrames = Math.max(0, Math.ceil(hookDuration * fps));
  const contentFrames = Math.max(1, Math.ceil(contentDuration * fps));
  const totalFrames = Math.max(1, Math.ceil(contentDuration * fps));
  const durationMs = Math.max(0, Math.round(contentDuration * 1000));

  const diagramParams = useMemo(
    () => coerceDiagramParams((props.templateParams as any)?.diagram),
    [props.templateParams]
  );
  const visualTimeline = useMemo(
    () => buildVisualTimeline(props.scenes ?? [], durationMs),
    [props.scenes, durationMs]
  );
  const visualSequences = useMemo(
    () => buildSequences(visualTimeline, contentDuration, fps),
    [visualTimeline, contentDuration, fps]
  );
  const contentFrame = Math.max(0, frame - hookFrames);
  const fastCutFrames = Math.max(1, Math.floor(fps * 2.2));
  const steadyCutFrames = Math.max(1, Math.floor(fps * 3.4));
  const directorCycleFrames = contentFrame < fps * 10 ? fastCutFrames : steadyCutFrames;
  const directorPhase = Math.floor(contentFrame / directorCycleFrames) % 3;
  const showDiagram =
    directorMode === 'math-only' || directorMode === 'diagram-only'
      ? true
      : directorMode === 'clips-only'
        ? false
        : directorPhase !== 1;
  const showSceneClips = directorMode === 'clips-only' ? true : (props.scenes?.length ?? 0) > 0;
  const sceneOpacity = directorMode === 'clips-only' ? 1 : directorPhase === 0 ? 0.38 : 1;
  const diagramOpacity = showDiagram ? (directorPhase === 1 ? 0.3 : 1) : 0;
  const useGameplayClip =
    gameplayMode === 'clip' || (gameplayMode !== 'procedural' && Boolean(props.gameplayClip?.path));

  // IMPORTANT: `layout.captions` is intentionally full-frame in our layout helper so
  // captions don't "jump". However, a full-frame caption plate looks like weird UI.
  // Keep the Caption component full-frame, but restrict the contrast plate to a bottom band.
  const captionBandTop = Math.round(height * 0.62);
  const captionBandHeight = Math.max(0, height - captionBandTop);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <FontLoader fonts={props.fonts} />

      {(props as any).hook && hookFrames > 0 ? (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookClipLayer hook={(props as any).hook} />
        </Sequence>
      ) : null}

      <Sequence from={hookFrames} durationInFrames={contentFrames}>
        {/* Content slot (top by default): fully drawn diagram (no stock background, to reduce distraction) */}
        {!isGameplayFull ? (
          <AbsoluteFill style={{ top: contentTop, height: contentHeight, overflow: 'hidden' }}>
            {showSceneClips
              ? visualSequences.map(({ fromFrame, durationInFrames, scene }: any, index: number) => (
                  <Sequence key={`scene-${index}`} from={fromFrame} durationInFrames={durationInFrames}>
                    <SceneBackground
                      scene={scene}
                      startFrame={hookFrames + fromFrame}
                      durationInFrames={durationInFrames}
                      containerStyle={{ top: 0, height: '100%', overflow: 'hidden', opacity: sceneOpacity }}
                    />
                  </Sequence>
                ))
              : null}
            <AbsoluteFill style={{ opacity: diagramOpacity }}>
              <ComplexPlane params={diagramParams} />
            </AbsoluteFill>
          </AbsoluteFill>
        ) : null}

        {/* Gameplay slot (bottom by default): procedural by default to keep the example deterministic. */}
        <AbsoluteFill style={{ top: gameplayTop, height: gameplayHeight, overflow: 'hidden' }}>
          {useGameplayClip && props.gameplayClip?.path ? (
            <Loop durationInFrames={totalFrames}>
              <Video
                src={resolveGameplaySrc(props.gameplayClip.path)}
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Loop>
          ) : (
            <RunnerGameplay />
          )}
        </AbsoluteFill>

        {/* Soft separators/gradients to avoid hard edge and help caption contrast */}
        {!isContentFull && !isGameplayFull ? (
          <>
            <AbsoluteFill
              style={{
                top: contentTop + contentHeight - 28,
                height: 28,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
              }}
            />
            <AbsoluteFill
              style={{
                top: captionBandTop,
                height: captionBandHeight,
                // Keep OCR stable while preserving gameplay visibility.
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.34) 22%, rgba(0,0,0,0.48) 100%)',
              }}
            />
          </>
        ) : null}

        {/* Captions */}
        <AbsoluteFill style={{ top: layout.captions.top, height: layout.captions.height }}>
          <Caption words={props.words} config={props.captionConfig} />
        </AbsoluteFill>

        <AudioLayers audioPath={props.audioPath} mix={props.audioMix} />
      </Sequence>
    </AbsoluteFill>
  );
};
