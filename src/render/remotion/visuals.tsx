/**
 * Shared visual timeline helpers for Remotion compositions.
 */
import React from 'react';
import { AbsoluteFill, Sequence, Video, staticFile } from 'remotion';
import type { VisualAsset, VideoClip } from '../../visuals/schema';
import type { HookClip } from '../schema';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';

function resolveMediaSrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
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
    return { startMs, endMs, url: asset.assetPath, durationMs: assetDurationMs };
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
  hook: HookClip;
  containerStyle?: React.CSSProperties;
}

export const HookClip: React.FC<HookClipProps> = ({ hook, containerStyle }) => (
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
