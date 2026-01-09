/**
 * Remotion root component.
 */
import React from 'react';
import { ShortVideoComposition } from './ShortVideo';
import { SplitScreenGameplayComposition } from './SplitScreenGameplay';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <ShortVideoComposition />
      <SplitScreenGameplayComposition />
    </>
  );
};
