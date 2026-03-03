/**
 * Shared visual timeline helpers for Remotion compositions.
 */
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';
import type { VisualAsset, VideoClip } from '../../visuals/schema';
import type { HookClip as HookClipSchema } from '../schema';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';

function resolveMediaSrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (/^data:/i.test(path)) return path;
  return staticFile(path);
}

export interface VisualSequenceInfo {
  fromFrame: number;
  durationInFrames: number;
  scene: VisualScene;
}

/**
 * Build visual timeline from video assets.
 */
export function buildVisualTimeline(videoAssets: VisualAsset[], durationMs: number): VisualScene[] {
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
    return {
      startMs,
      endMs,
      url: asset.assetPath,
      durationMs: assetDurationMs,
      assetType: asset.assetType,
      motionStrategy: asset.motionStrategy,
    };
  });

  return ensureVisualCoverage(rawScenes, durationMs, { fallbackColor: '#000000' });
}

/**
 * Convert visual timeline to frame-based sequences.
 */
export function buildSequences(
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

/**
 * Ken Burns effect: slow zoom-in with subtle pan.
 * Scales 1.0 → 1.12 and translates slightly over the scene duration.
 */
const KenBurnsImage: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
  const scale = interpolate(progress, [0, 1], [1.0, 1.12]);
  const translateX = interpolate(progress, [0, 1], [0, -20]);
  const translateY = interpolate(progress, [0, 1], [0, -10]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
        }}
        alt=""
      />
    </div>
  );
};

export interface SceneBackgroundProps {
  scene: VisualScene;
  containerStyle?: React.CSSProperties;
  videoStyle?: React.CSSProperties;
}

/** Render a single visual scene */
export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  scene,
  containerStyle,
  videoStyle,
}) => (
  <AbsoluteFill style={containerStyle}>
    {scene.url === null ? (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: scene.backgroundColor ?? '#000000',
        }}
      />
    ) : scene.assetType === 'image' ? (
      scene.motionStrategy === 'kenburns' ? (
        <KenBurnsImage src={resolveMediaSrc(scene.url)} />
      ) : (
        <img
          src={resolveMediaSrc(scene.url)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
      )
    ) : (
      <Video
        src={resolveMediaSrc(scene.url)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...videoStyle }}
      />
    )}
  </AbsoluteFill>
);

export interface HookClipProps {
  hook: HookClipSchema;
  containerStyle?: React.CSSProperties;
}

export const HookClipLayer: React.FC<HookClipProps> = ({ hook, containerStyle }) => (
  <AbsoluteFill style={containerStyle}>
    <Video
      src={resolveMediaSrc(hook.path)}
      muted={hook.mute ?? false}
      style={{ width: '100%', height: '100%', objectFit: hook.fit ?? 'cover' }}
    />
  </AbsoluteFill>
);

/** Render legacy clip */
export const LegacyClip: React.FC<{ clip: VideoClip; fps: number }> = ({ clip, fps }) => {
  const clipStartFrame = Math.floor(clip.startTime * fps);
  const clipDurationFrames = Math.max(1, Math.floor((clip.endTime - clip.startTime) * fps));

  return (
    <Sequence from={clipStartFrame} durationInFrames={clipDurationFrames}>
      <AbsoluteFill>
        <Video
          src={resolveMediaSrc(clip.url)}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    </Sequence>
  );
};
