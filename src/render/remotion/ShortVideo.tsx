/**
 * Short Video Composition
 * 
 * Main Remotion composition for short-form videos.
 */
import React from 'react';
import { Composition, AbsoluteFill, Audio, Video, Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { RenderProps } from '../schema';
import { Caption } from './Caption';

/**
 * Main video component
 */
export const ShortVideo: React.FC<RenderProps> = ({
  clips,
  words,
  audioPath,
  duration,
  captionStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  // Find current clip
  const currentClipIndex = clips.findIndex(
    clip => currentTime >= clip.startTime && currentTime < clip.endTime
  );
  
  const currentClip = clips[currentClipIndex] ?? clips[clips.length - 1];
  
  // Find current word for highlighting
  const currentWordIndex = words.findIndex(
    word => currentTime >= word.start && currentTime < word.end
  );
  
  // Get nearby words for caption display (show phrase context)
  const captionWords = getVisibleWords(words, currentTime, 5);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background video clips */}
      {clips.map((clip, index) => {
        const clipStartFrame = Math.floor(clip.startTime * fps);
        const clipDurationFrames = Math.floor((clip.endTime - clip.startTime) * fps);
        
        return (
          <Sequence
            key={clip.id}
            from={clipStartFrame}
            durationInFrames={clipDurationFrames}
          >
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
        <Caption
          words={captionWords}
          currentTime={currentTime}
          style={captionStyle}
        />
      </AbsoluteFill>
      
      {/* Audio track */}
      <Audio src={staticFile(audioPath)} />
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
    word => currentTime >= word.start && currentTime < word.end
  );
  
  if (currentIndex === -1) {
    // Between words, find the previous word
    const prevIndex = words.findIndex(word => word.end > currentTime) - 1;
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
        }}
      />
    </>
  );
};
