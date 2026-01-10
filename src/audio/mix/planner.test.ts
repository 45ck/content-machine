/**
 * Audio Mix Planner Tests
 */
import { describe, it, expect } from 'vitest';
import type { ScriptOutput } from '../../script/schema';
import type { TimestampsOutput } from '../schema';
import { buildAudioMixPlan } from './planner';

describe('buildAudioMixPlan', () => {
  const script: ScriptOutput = {
    schemaVersion: '1.0.0',
    scenes: [
      {
        id: 'scene-1',
        text: 'First point goes here',
        visualDirection: 'Stock footage of a chart',
      },
      {
        id: 'scene-2',
        text: 'Second point goes here',
        visualDirection: 'Stock footage of a team',
      },
    ],
    reasoning: 'Test script',
    hook: 'Listen up',
    cta: 'Follow for more',
    meta: {
      archetype: 'listicle',
      topic: 'Audio mix test',
      generatedAt: new Date().toISOString(),
    },
  };

  const timestamps: TimestampsOutput = {
    schemaVersion: '1.0.0',
    scenes: [
      {
        sceneId: 'hook',
        audioStart: 0,
        audioEnd: 0.8,
        words: [
          { word: 'Listen', start: 0, end: 0.4 },
          { word: 'up', start: 0.4, end: 0.8 },
        ],
      },
      {
        sceneId: 'scene-1',
        audioStart: 0.8,
        audioEnd: 2.0,
        words: [
          { word: 'First', start: 0.8, end: 1.2 },
          { word: 'point', start: 1.2, end: 1.6 },
        ],
      },
      {
        sceneId: 'scene-2',
        audioStart: 2.0,
        audioEnd: 3.4,
        words: [
          { word: 'Second', start: 2.0, end: 2.6 },
          { word: 'point', start: 2.6, end: 3.0 },
        ],
      },
      {
        sceneId: 'cta',
        audioStart: 3.4,
        audioEnd: 4.0,
        words: [{ word: 'Follow', start: 3.4, end: 4.0 }],
      },
    ],
    allWords: [
      { word: 'Listen', start: 0, end: 0.4 },
      { word: 'up', start: 0.4, end: 0.8 },
      { word: 'First', start: 0.8, end: 1.2 },
      { word: 'point', start: 1.2, end: 1.6 },
      { word: 'Second', start: 2.0, end: 2.6 },
      { word: 'point', start: 2.6, end: 3.0 },
      { word: 'Follow', start: 3.4, end: 4.0 },
    ],
    totalDuration: 4.0,
    ttsEngine: 'kokoro',
    asrEngine: 'whisper-cpp',
  };

  it('should build a mix plan with music and hook sfx', () => {
    const plan = buildAudioMixPlan({
      script,
      timestamps,
      voicePath: 'audio.wav',
      options: {
        music: 'lofi-01',
        sfx: ['sfx-01.wav'],
        sfxAt: 'hook',
        mixPreset: 'clean',
      },
    });

    expect(plan.totalDuration).toBe(4.0);
    const music = plan.layers.find((layer) => layer.type === 'music');
    const sfx = plan.layers.find((layer) => layer.type === 'sfx');
    expect(music).toBeDefined();
    expect(music?.start).toBe(0);
    expect(music?.end).toBe(4.0);
    expect(sfx).toBeDefined();
    expect(sfx?.start).toBe(0);
  });
});
