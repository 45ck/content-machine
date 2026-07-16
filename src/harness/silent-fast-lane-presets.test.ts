import { describe, expect, it } from 'vitest';
import {
  getSilentFastLanePreset,
  listSilentFastLanePresets,
  SilentFastLanePresetSchema,
} from './silent-fast-lane-presets';

describe('silent fast-lane packaging presets', () => {
  it('defines exactly the three approved thesis-neutral treatments', () => {
    const presets = listSilentFastLanePresets();
    expect(presets.map((preset) => preset.id)).toEqual([
      'product-screen-demo',
      'ui-native-thread-reveal',
      'motion-card-lesson',
    ]);
    expect(presets.every((preset) => SilentFastLanePresetSchema.safeParse(preset).success)).toBe(
      true
    );
  });

  it('keeps every treatment silent, owned, provider-free, and thesis-neutral', () => {
    for (const preset of listSilentFastLanePresets()) {
      expect(preset.silentPolicy).toEqual({
        meaningSurvivesWithoutAudio: true,
        voiceAllowed: false,
        sfxAllowed: false,
        musicAllowed: false,
      });
      expect(preset.providerPolicy).toEqual({
        stockAllowed: false,
        thirdPartyAssetsAllowed: false,
        generatedProviderAssetsAllowed: false,
        providerCallsAllowed: false,
      });
      expect(preset.assetPolicy.ownedOrCodeNativeOnly).toBe(true);
      expect(preset.thesisOwnership).toBe('editorial_only');
      expect(preset.framePolicy).toEqual({
        focalRegionCount: 1,
        captions: 'large',
        mobileLegibilityRequired: true,
      });
    }
  });

  it('preserves adjacent phase continuity with semantic transitions only', () => {
    for (const preset of listSilentFastLanePresets()) {
      expect(preset.phases).toHaveLength(4);
      expect(preset.transitionGrammar).toHaveLength(3);
      for (const [index, transition] of preset.transitionGrammar.entries()) {
        expect(transition.fromPhaseId).toBe(preset.phases[index]?.id);
        expect(transition.toPhaseId).toBe(preset.phases[index + 1]?.id);
        expect(transition.decorativeOnly).toBe(false);
        expect(transition.providerCallRequired).toBe(false);
      }
    }

    expect(getSilentFastLanePreset('product-screen-demo').phases[0]).toMatchObject({
      startSeconds: 0,
      endSeconds: 2,
    });
    expect(getSilentFastLanePreset('ui-native-thread-reveal').phases[0]).toMatchObject({
      startSeconds: 0,
      endSeconds: 3,
    });
    expect(getSilentFastLanePreset('motion-card-lesson').phases[2]).toMatchObject({
      startSeconds: 9,
      endSeconds: 15,
    });
  });
});
