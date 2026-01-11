/**
 * Audio layers for voice + optional mix plan.
 */
import React from 'react';
import {
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { AudioMixLayer, AudioMixOutput } from '../../audio/mix/schema';

function isRemoteSource(path: string): boolean {
  return /^https?:\/\//i.test(path) || path.startsWith('data:');
}

function resolveAudioSrc(path: string): string {
  return isRemoteSource(path) ? path : staticFile(path);
}

function dbToGain(db: number | undefined): number {
  if (db === undefined) return 1;
  return Math.pow(10, db / 20);
}

function msToFrames(ms: number | undefined, fps: number): number {
  if (!ms || ms <= 0) return 0;
  return Math.max(0, Math.round((ms / 1000) * fps));
}

function getLayerDurationSeconds(layer: AudioMixLayer, totalDuration: number): number {
  if (layer.type === 'sfx') return layer.duration;
  const end = layer.end ?? totalDuration;
  return Math.max(0, end - layer.start);
}

const AudioLayer: React.FC<{
  layer: AudioMixLayer;
  durationInFrames: number;
}> = ({ layer, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame;

  const fadeInFrames = msToFrames(layer.type === 'sfx' ? undefined : layer.fadeInMs, fps);
  const fadeOutFrames = msToFrames(layer.type === 'sfx' ? undefined : layer.fadeOutMs, fps);

  const baseDb = layer.volumeDb ?? 0;
  const duckDb = layer.type === 'music' ? (layer.duckDb ?? 0) : 0;
  const baseGain = dbToGain(baseDb + duckDb);

  const fadeIn =
    fadeInFrames > 0
      ? interpolate(localFrame, [0, fadeInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const fadeOutStart = Math.max(0, durationInFrames - fadeOutFrames);
  const fadeOut =
    fadeOutFrames > 0
      ? interpolate(localFrame, [fadeOutStart, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  const volume = Math.max(0, baseGain * fadeIn * fadeOut);
  const shouldLoop = layer.type !== 'sfx' && Boolean(layer.loop);

  return <Audio src={resolveAudioSrc(layer.path)} volume={volume} loop={shouldLoop} />;
};

export const AudioLayers: React.FC<{
  audioPath: string;
  mix?: AudioMixOutput;
}> = ({ audioPath, mix }) => {
  const { fps } = useVideoConfig();
  const totalDuration = mix?.totalDuration ?? 0;

  return (
    <>
      <Audio src={staticFile(audioPath)} />
      {mix?.layers.map((layer, index) => {
        const durationSeconds = getLayerDurationSeconds(layer, totalDuration);
        if (durationSeconds <= 0) return null;
        const startFrame = Math.max(0, Math.round(layer.start * fps));
        const durationInFrames = Math.max(1, Math.round(durationSeconds * fps));
        return (
          <Sequence
            key={`${layer.type}-${index}`}
            from={startFrame}
            durationInFrames={durationInFrames}
            layout="none"
          >
            <AudioLayer layer={layer} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </>
  );
};
