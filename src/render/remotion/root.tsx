/**
 * Remotion root component.
 */
import React from 'react';
import { ShortVideoComposition } from './ShortVideo';
import { SplitScreenGameplayComposition } from './SplitScreenGameplay';
import { CaptionSpacingTestComposition, CaptionOcrTestComposition } from './CaptionSpacingTest';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <ShortVideoComposition />
      <SplitScreenGameplayComposition />
      <CaptionSpacingTestComposition />
      <CaptionOcrTestComposition />
    </>
  );
};
