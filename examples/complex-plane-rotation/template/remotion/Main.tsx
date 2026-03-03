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

// eslint-disable-next-line sonarjs/cognitive-complexity, complexity
export const Main: React.FC<RenderProps> = (props) => {
  const { fps, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const gameplayMode =
    ((props.templateParams as any)?.gameplayMode as string | undefined) ?? 'auto';
  const directorMode =
    ((props.templateParams as any)?.directorMode as string | undefined) ?? 'math-only';

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
  const showSceneClips =
    directorMode === 'clips-only'
      ? true
      : directorMode === 'math-only' || directorMode === 'diagram-only'
        ? false
        : (props.scenes?.length ?? 0) > 0;
  const sceneOpacity = directorMode === 'clips-only' ? 1 : directorPhase === 0 ? 0.3 : 0.96;
  const diagramOpacity = showDiagram
    ? directorMode === 'mixed' && directorPhase === 1
      ? 0.3
      : 1
    : 0;
  const useGameplayClip =
    gameplayMode === 'clip' || (gameplayMode !== 'procedural' && Boolean(props.gameplayClip?.path));
  const forceGameplay = gameplayMode === 'clip' || gameplayMode === 'procedural';
  const autoGameplay = gameplayMode === 'auto' && directorMode === 'mixed';
  const showGameplay = forceGameplay || autoGameplay;
  const effectiveContentTop = showGameplay ? contentTop : 0;
  const effectiveContentHeight = showGameplay ? contentHeight : height;
  const shouldRenderContent = !showGameplay || !isGameplayFull;
  const ambientShiftX = Math.sin(frame / (fps * 1.6)) * 18;
  const ambientShiftY = Math.cos(frame / (fps * 2.2)) * 14;
  const ambientPulse = 0.45 + 0.55 * Math.sin(frame / (fps * 2.6));
  const textureShiftX = (frame * 1.7) % 220;
  const textureShiftY = (frame * 0.95) % 160;

  // IMPORTANT: `layout.captions` is intentionally full-frame in our layout helper so
  // captions don't "jump". However, a full-frame caption plate looks like weird UI.
  // Keep the Caption component full-frame, but restrict the contrast plate to a bottom band.
  const captionBandTop = Math.round(height * (showGameplay ? 0.62 : 0.72));
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
        {shouldRenderContent ? (
          <AbsoluteFill
            style={{ top: effectiveContentTop, height: effectiveContentHeight, overflow: 'hidden' }}
          >
            {showSceneClips
              ? visualSequences.map(
                  ({ fromFrame, durationInFrames, scene }: any, index: number) => (
                    <Sequence
                      key={`scene-${index}`}
                      from={fromFrame}
                      durationInFrames={durationInFrames}
                    >
                      <SceneBackground
                        scene={scene}
                        startFrame={hookFrames + fromFrame}
                        durationInFrames={durationInFrames}
                        containerStyle={{
                          top: 0,
                          height: '100%',
                          overflow: 'hidden',
                          opacity: sceneOpacity,
                        }}
                      />
                    </Sequence>
                  )
                )
              : null}
            <AbsoluteFill style={{ opacity: diagramOpacity }}>
              <ComplexPlane params={diagramParams} />
            </AbsoluteFill>
          </AbsoluteFill>
        ) : null}

        {/* Gameplay slot (bottom by default): procedural by default to keep the example deterministic. */}
        {showGameplay ? (
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
        ) : null}

        {/* Soft separators/gradients to avoid hard edge and help caption contrast */}
        {showGameplay && !isContentFull && !isGameplayFull ? (
          <>
            <AbsoluteFill
              style={{
                top: contentTop + contentHeight - 28,
                height: 28,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
              }}
            />
          </>
        ) : null}
        <AbsoluteFill
          style={{
            top: captionBandTop,
            height: captionBandHeight,
            background: showGameplay
              ? 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.68) 26%, rgba(0,0,0,0.86) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.56) 26%, rgba(0,0,0,0.82) 100%)',
          }}
        />

        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: 0.14 + ambientPulse * 0.08,
            mixBlendMode: 'screen',
            background: `radial-gradient(1280px 820px at ${50 + ambientShiftX}% ${18 + ambientShiftY}%, rgba(56,189,248,0.48), transparent 64%), radial-gradient(1040px 700px at ${30 - ambientShiftX * 0.9}% ${80 - ambientShiftY * 0.72}%, rgba(59,130,246,0.38), transparent 68%), radial-gradient(880px 560px at ${66 + ambientShiftY * 0.65}% ${54 - ambientShiftX * 0.42}%, rgba(52,211,153,0.24), transparent 72%)`,
          }}
        />
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: 0.028,
            mixBlendMode: 'soft-light',
            backgroundImage:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
            transform: `translate(${-textureShiftX}px, ${-textureShiftY}px) scale(1.18)`,
            transformOrigin: 'center',
          }}
        />

        {/* Captions */}
        <AbsoluteFill style={{ top: layout.captions.top, height: layout.captions.height }}>
          <Caption words={props.words} config={props.captionConfig} />
        </AbsoluteFill>

        <AudioLayers audioPath={props.audioPath} mix={props.audioMix} />
      </Sequence>
    </AbsoluteFill>
  );
};
