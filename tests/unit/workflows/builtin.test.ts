import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetBuiltinWorkflows,
  getBuiltinWorkflow,
  listBuiltinWorkflows,
} from '../../../src/workflows/resolve';

describe('workflow builtins', () => {
  beforeEach(() => {
    __resetBuiltinWorkflows();
  });

  it('loads built-in workflows from repo assets', () => {
    const ids = listBuiltinWorkflows().map((workflow) => workflow.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'brainrot-gameplay',
        'gemini-meme-explainer',
        'absurdist-edutainment',
        'clean-educational-control',
      ])
    );
  });

  it('ships brainrot gameplay defaults for split-screen gameplay', () => {
    const workflow = getBuiltinWorkflow('brainrot-gameplay');

    expect(workflow).toBeTruthy();
    expect(workflow?.defaults).toMatchObject({
      template: 'brainrot-split-gameplay-top',
      splitLayout: 'gameplay-top',
      gameplayStyle: 'subway-surfers',
      visualsProvider: 'nanobanana,pexels',
      visualsMotionStrategy: 'kenburns',
    });
  });
});
