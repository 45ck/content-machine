/**
 * Short Video Composition
 *
 * Main Remotion composition for short-form videos.
 * Based on SYSTEM-DESIGN §7.4 render composition layers.
 */
import React from 'react';
import {
  Composition,
  AbsoluteFill,
  Audio,
  Video,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { RenderProps } from '../schema';
import { Caption } from './Caption';

/**
 * Main video component
 */
export const ShortVideo: React.FC<RenderProps> = ({
  scenes,
  clips,
  words,
  audioPath,
  duration: _duration, // May be used for duration validation in future
  captionStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Use scenes (new) or clips (legacy)
  const videoAssets = scenes ?? [];

  // Get nearby words for caption display (show phrase context)
  const captionWords = getVisibleWords(words, currentTime, 5);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background video/color for each scene */}
      {videoAssets.map((asset, index) => {
        // Calculate timing from scene
        const sceneStartTime =
          index === 0 ? 0 : videoAssets.slice(0, index).reduce((acc, s) => acc + s.duration, 0);
        const clipStartFrame = Math.floor(sceneStartTime * fps);
        // Ensure minimum 1 frame duration to prevent Remotion errors
        const clipDurationFrames = Math.max(1, Math.floor(asset.duration * fps));

        return (
          <Sequence key={asset.sceneId} from={clipStartFrame} durationInFrames={clipDurationFrames}>
            <AbsoluteFill>
              {asset.source === 'fallback-color' ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: asset.assetPath,
                  }}
                />
              ) : (
                <Video
                  src={asset.assetPath}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Legacy clips support */}
      {clips?.map((clip, _index) => {
        const clipStartFrame = Math.floor(clip.startTime * fps);
        // Ensure minimum 1 frame duration to prevent Remotion errors
        const clipDurationFrames = Math.max(1, Math.floor((clip.endTime - clip.startTime) * fps));

        return (
          <Sequence key={clip.id} from={clipStartFrame} durationInFrames={clipDurationFrames}>
            <AbsoluteFill>
              <Video
                src={clip.url}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Captions overlay */}
      <AbsoluteFill>
        <Caption words={captionWords} currentTime={currentTime} style={captionStyle} />
      </AbsoluteFill>

      {/* Audio track - use absolute path or file:// URL */}
      <Audio src={audioPath.startsWith('file://') ? audioPath : `file://${audioPath.replace(/\\/g, '/')}`} />
    </AbsoluteFill>
  );
};

/**
 * Get words visible at current time (for phrase display)
 */
function getVisibleWords(
  words: RenderProps['words'],
  currentTime: number,
  windowSize: number
): RenderProps['words'] {
  // Find current word index
  const currentIndex = words.findIndex(
    (word) => currentTime >= word.start && currentTime < word.end
  );

  if (currentIndex === -1) {
    // Between words, find the previous word
    const prevIndex = words.findIndex((word) => word.end > currentTime) - 1;
    if (prevIndex < 0) return words.slice(0, windowSize);

    const start = Math.max(0, prevIndex - Math.floor(windowSize / 2));
    const end = Math.min(words.length, start + windowSize);
    return words.slice(start, end);
  }

  // Show words around current
  const start = Math.max(0, currentIndex - Math.floor(windowSize / 2));
  const end = Math.min(words.length, start + windowSize);
  return words.slice(start, end);
}

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
       