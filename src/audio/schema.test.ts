/**
 * Audio Schema Tests
 * Updated for SYSTEM-DESIGN §6.4 TimestampsSchema
 */
import { describe, it, expect } from 'vitest';
import {
  WordTimestampSchema,
  SceneTimestampSchema,
  TranscriptSegmentSchema,
  TimestampsOutputSchema,
  AudioOutputSchema,
  AUDIO_SCHEMA_VERSION,
  type WordTimestamp,
  type SceneTimestamp,
  type TimestampsOutput,
  type AudioOutput,
} from './schema';

describe('WordTimestampSchema', () => {
  it('should validate correct word timestamp', () => {
    const word: WordTimestamp = {
      word: 'Hello',
      start: 0,
      end: 0.5,
      confidence: 0.95,
    };

    const result = WordTimestampSchema.safeParse(word);
    expect(result.success).toBe(true);
  });

  it('should allow optional confidence', () => {
    const word = {
      word: 'Test',
      start: 1.0,
      end: 1.5,
    };

    const result = WordTimestampSchema.safeParse(word);
    expect(result.success).toBe(true);
  });

  it('should reject negative start time', () => {
    const word = {
      word: 'Test',
      start: -1,
      end: 0.5,
    };

    const result = WordTimestampSchema.safeParse(word);
    expect(result.success).toBe(false);
  });

  it('should reject empty word', () => {
    const word = {
      word: '',
      start: 0,
      end: 0.5,
    };

    const result = WordTimestampSchema.safeParse(word);
    expect(result.success).toBe(false);
  });
});

describe('SceneTimestampSchema', () => {
  it('should validate correct scene timestamp', () => {
    const scene: SceneTimestamp = {
      sceneId: 'scene-001',
      audioStart: 0,
      audioEnd: 2.0,
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.2 },
      ],
    };

    const result = SceneTimestampSchema.safeParse(scene);
    expect(result.success).toBe(true);
  });
});

describe('TranscriptSegmentSchema (legacy)', () => {
  it('should validate correct segment', () => {
    const segment = {
      id: 'seg-1',
      text: 'Hello world',
      start: 0,
      end: 2.0,
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.2 },
      ],
    };

    const result = TranscriptSegmentSchema.safeParse(segment);
    expect(result.success).toBe(true);
  });
});

describe('TimestampsOutputSchema', () => {
  it('should validate correct timestamps output (new schema)', () => {
    const output: TimestampsOutput = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: 'scene-001',
          audioStart: 0,
          audioEnd: 2.0,
          words: [
            { word: 'Hello', start: 0, end: 0.5 },
            { word: 'world', start: 0.6, end: 1.2 },
          ],
        },
      ],
      allWords: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.2 },
      ],
      totalDuration: 2.0,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper-cpp',
    };

    const result = TimestampsOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should reject zero duration', () => {
    const output = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      allWords: [],
      totalDuration: 0,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper-cpp',
    };

    const result = TimestampsOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});

describe('AudioOutputSchema', () => {
  it('should validate correct audio output (new schema)', () => {
    const output: AudioOutput = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      audioPath: '/path/to/audio.wav',
      timestampsPath: '/path/to/timestamps.json',
      timestamps: {
        schemaVersion: AUDIO_SCHEMA_VERSION,
        scenes: [
          {
            sceneId: 'scene-001',
            audioStart: 0,
            audioEnd: 1.0,
            words: [{ word: 'Test', start: 0, end: 0.5 }],
          },
        ],
        allWords: [{ word: 'Test', start: 0, end: 0.5 }],
        totalDuration: 1.0,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper-cpp',
      },
      duration: 1.0,
      wordCount: 1,
      voice: 'af_heart',
      sampleRate: 24000,
    };

    const result = AudioOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should allow optional ttsCost', () => {
    const output: AudioOutput = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      audioPath: '/path/to/audio.wav',
      timestampsPath: '/path/to/timestamps.json',
      timestamps: {
        schemaVersion: AUDIO_SCHEMA_VERSION,
        scenes: [
          {
            sceneId: 'scene-001',
            audioStart: 0,
            audioEnd: 1.0,
            words: [{ word: 'Test', start: 0, end: 0.5 }],
          },
        ],
        allWords: [{ word: 'Test', start: 0, end: 0.5 }],
        totalDuration: 1.0,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper-cpp',
      },
      duration: 1.0,
      wordCount: 1,
      voice: 'af_heart',
      sampleRate: 24000,
      ttsCost: 0.001,
    };

    const result = AudioOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ttsCost).toBe(0.001);
    }
  });
});
