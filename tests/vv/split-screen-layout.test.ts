/**
 * V&V tests for split-screen layout options.
 */
import { describe, expect, it } from 'vitest';
import { RenderPropsSchema } from '../../src/render/schema';
import { getTemplateParams } from '../../src/render/templates/slots';
import { SchemaError } from '../../src/core/errors';

describe('V&V: split-screen layout options', () => {
  it('accepts valid layout positions in render props', () => {
    const props = {
      schemaVersion: '1.0.0',
      scenes: [],
      words: [],
      audioPath: '/tmp/audio.wav',
      duration: 12,
      width: 1080,
      height: 1920,
      fps: 30,
      gameplayPosition: 'top',
      contentPosition: 'bottom',
    };

    const result = RenderPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('accepts template params for layout positions', () => {
    const templateParams = getTemplateParams({
      id: 'vv-layout',
      name: 'VV Layout',
      compositionId: 'SplitScreenGameplay',
      schemaVersion: '1.0.0',
      params: {
        splitScreenRatio: 0.55,
        gameplayPosition: 'top',
        contentPosition: 'bottom',
      },
    });

    expect(templateParams).toEqual({
      splitScreenRatio: 0.55,
      gameplayPosition: 'top',
      contentPosition: 'bottom',
    });
  });

  it('rejects invalid layout params', () => {
    expect(() =>
      getTemplateParams({
        id: 'vv-layout-bad',
        name: 'VV Layout Bad',
        compositionId: 'SplitScreenGameplay',
        schemaVersion: '1.0.0',
        params: {
          gameplayPosition: 'left',
        },
      })
    ).toThrow(SchemaError);
  });
});
