import React from 'react';
import { Composition } from 'remotion';
// This example is intended to run from this repo without publishing/installing the package.
// Use a relative type-only import so webpack can bundle without resolving an npm package.
import type { RenderProps } from '../../../../src/domain';
import { Main } from './Main';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SplitScreenGameplay"
        component={Main as unknown as React.FC}
        durationInFrames={30 * 60}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={
          {
            clips: [],
            words: [],
            audioPath: '',
            audioMix: undefined,
            duration: 60,
            width: 1080,
            height: 1920,
            fps: 30,
            splitScreenRatio: 0.55,
            gameplayPosition: 'bottom',
            contentPosition: 'top',
          } satisfies Partial<RenderProps>
        }
      />
    </>
  );
};
