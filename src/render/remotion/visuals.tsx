/**
 * Shared visual timeline helpers for Remotion compositions.
 */
import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  Video,
  staticFile,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import type { HookClip as HookClipSchema, VisualAsset, VideoClip } from '../../domain';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';

function resolveMediaSrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return staticFile(path);
}

function isProbablyImageUrl(path: string): boolean {
  const lowered = path.toLowerCase();
  return (
    lowered.endsWith('.png') ||
    lowered.endsWith('.jpg') ||
    lowered.endsWith('.jpeg') ||
    lowered.endsWith('.webp') ||
    lowered.startsWith('data:image/')
  );
}

function hash32(input: string): number {
  // Tiny deterministic hash for motion variety. Not cryptographic.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
      mediaType: asset.assetType ?? (isProbablyImageUrl(asset.assetPath) ? 'image' : 'video'),
      motionStrategy: asset.motionStrategy ?? 'none',
      durationMs: assetDurationMs,
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

export interface SceneBackgroundProps {
  scene: VisualScene;
  /** Global (composition) start frame of this scene. */
  startFrame: number;
  /** Duration of this scene sequence. */
  durationInFrames: number;
  containerStyle?: React.CSSProperties;
  videoStyle?: React.CSSProperties;
}

/** Render a single visual scene */
export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  scene,
  startFrame,
  durationInFrames,
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
      <SceneMedia
        scene={scene}
        startFrame={startFrame}
        durationInFrames={durationInFrames}
        videoStyle={videoStyle}
      />
    )}
  </AbsoluteFill>
);

const SceneMedia: React.FC<{
  scene: VisualScene;
  startFrame: number;
  durationInFrames: number;
  videoStyle?: React.CSSProperties;
}> = ({ scene, startFrame, durationInFrames, videoStyle }) => {
  const url = scene.url as string;
  const mediaType = scene.mediaType ?? (isProbablyImageUrl(url) ? 'image' : 'video');

  if (mediaType === 'video') {
    return (
      <Video
        src={resolveMediaSrc(url)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...videoStyle }}
      />
    );
  }

  // Ken Burns at render-time (no ffmpeg dependency).
  // Use global frame numbers to ensure correct motion even with nested Sequences (e.g. hook layers).
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  const t = interpolate(rel, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seed = hash32(url);
  const dirX = seed % 2 === 0 ? 1 : -1;
  const dirY = seed % 3 === 0 ? 1 : -1;
  const panX = ((seed % 17) / 17) * 3.5 * dirX; // percent
  const panY = (((seed >>> 5) % 19) / 19) * 3.5 * dirY; // percent

  const motion = scene.motionStrategy ?? 'kenburns';
  const isStatic = motion === 'none';

  const zoomStart = 1.06;
  const zoomEnd = motion === 'kenburns' ? 1.14 : zoomStart;
  const scale = isStatic ? 1 : interpolate(t, [0, 1], [zoomStart, zoomEnd]);
  const translateX = isStatic ? 0 : interpolate(t, [0, 1], [0, -panX]);
  const translateY = isStatic ? 0 : interpolate(t, [0, 1], [0, -panY]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Img
        src={resolveMediaSrc(url)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
          ...videoStyle,
        }}
      />
    </div>
  );
};

export interface HookClipProps {
  hook: HookClipSchema;
  containerStyle?: React.CSSProperties;
}

/** Renders a hook clip (e.g., an intro/pattern-interrupt) as a full-frame layer. */
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
