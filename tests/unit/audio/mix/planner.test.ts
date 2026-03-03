import { describe, expect, it } from 'vitest';

import { buildAudioMixPlan, hasAudioMixSources } from '../../../../src/audio/mix/planner';

describe('audio mix planner', () => {
  it('detects whether a mix has any sources', () => {
    expect(hasAudioMixSources({ music: 'track.mp3' })).toBe(true);
    expect(hasAudioMixSources({ music: 'track.mp3', noMusic: true })).toBe(false);
    expect(hasAudioMixSources({ ambience: 'rain', noAmbience: true })).toBe(false);
    expect(hasAudioMixSources({ sfx: ['pop'], noSfx: true })).toBe(false);
    expect(hasAudioMixSources({ sfxPack: 'pops' })).toBe(true);
    expect(hasAudioMixSources({})).toBe(false);
  });

  it('warns on unknown preset and missing SFX sources', () => {
    const script = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'hello', start: 0.5, end: 0.8 }],
      totalDuration: 3,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
      scenes: [{ sceneId: 'hook', audioStart: 0.5, audioEnd: 1.5, words: [] }],
    };

    const output = buildAudioMixPlan({
      script: script as never,
      timestamps: timestamps as never,
      voicePath: 'voice.wav',
      options: { mixPreset: 'unknown', sfxAt: 'hook' },
    });

    expect(output.mixPreset).toBe('clean');
    expect(output.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Unknown mix preset: unknown'),
        expect.stringContaining('SFX requested but no SFX sources provided'),
      ])
    );
  });

  it('resolves preset paths and placement events', () => {
    const script = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [
        { word: 'hello', start: 0.1, end: 0.2 },
        { word: 'world', start: 2.0, end: 2.2 },
      ],
      totalDuration: 3,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
      scenes: [
        { sceneId: 'scene-1', audioStart: 0.1, audioEnd: 2.0, words: [] },
        { sceneId: 'cta', audioStart: 2.0, audioEnd: 3.0, words: [] },
      ],
    };

    const output = buildAudioMixPlan({
      script: script as never,
      timestamps: timestamps as never,
      voicePath: 'voice.wav',
      options: {
        mixPreset: 'punchy',
        music: 'lofi',
        ambience: 'rain',
        sfx: ['ping'],
        sfxPack: 'pops',
        sfxAt: 'cta',
        sfxDurationSeconds: 0.5,
      },
    });

    expect(
      output.layers.some((layer) => layer.type === 'music' && layer.path.endsWith('lofi.mp3'))
    ).toBe(true);
    expect(
      output.layers.some((layer) => layer.type === 'ambience' && layer.path.endsWith('rain.wav'))
    ).toBe(true);
    expect(output.layers.some((layer) => layer.type === 'sfx' && layer.event === 'cta')).toBe(true);
  });

  it('applies minimum SFX gap and drops zero-duration events', () => {
    const script = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [
        { word: 'hello', start: 0.1, end: 0.2 },
        { word: 'world', start: 0.2, end: 0.3 },
      ],
      totalDuration: 0.2,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
      scenes: [
        { sceneId: 'scene-1', audioStart: 0.1, audioEnd: 0.15, words: [] },
        { sceneId: 'scene-2', audioStart: 0.11, audioEnd: 0.2, words: [] },
      ],
    };

    const output = buildAudioMixPlan({
      script: script as never,
      timestamps: timestamps as never,
      voicePath: 'voice.wav',
      options: {
        sfx: ['pop'],
        sfxAt: 'scene',
        sfxMinGapMs: 5000,
        sfxDurationSeconds: 1,
      },
    });

    const sfxLayers = output.layers.filter((layer) => layer.type === 'sfx');
    expect(sfxLayers.length).toBeLessThanOrEqual(1);
  });
});
