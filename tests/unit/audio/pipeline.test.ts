import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ScriptOutput } from '../../../src/script/schema';

const synthesizeSpeechMock = vi.fn();
const transcribeAudioMock = vi.fn();
const reconcileMock = vi.fn();
const isGeminiAsrAvailableMock = vi.fn();

vi.mock('../../../src/audio/tts', () => ({
  synthesizeSpeech: synthesizeSpeechMock,
}));

vi.mock('../../../src/audio/asr', () => ({
  transcribeAudio: transcribeAudioMock,
}));

vi.mock('../../../src/audio/asr/reconcile', () => ({
  reconcileToScript: reconcileMock,
}));

vi.mock('../../../src/audio/asr/gemini-asr', () => ({
  isGeminiAsrAvailable: isGeminiAsrAvailableMock,
}));

function makeScript(): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    reasoning: 'test',
    hook: 'Hook line',
    cta: 'Call to action',
    scenes: [{ id: 'scene-1', text: 'First scene text', visualDirection: 'visual' }],
  };
}

function makeTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-audio-'));
  return {
    audioPath: path.join(dir, 'audio.wav'),
    timestampsPath: path.join(dir, 'timestamps.json'),
    mixPath: path.join(dir, 'audio.mix.json'),
  };
}

describe('generateAudio', () => {
  beforeEach(() => {
    synthesizeSpeechMock.mockReset();
    transcribeAudioMock.mockReset();
    reconcileMock.mockReset();
    isGeminiAsrAvailableMock.mockReset();
    // Default: Gemini not available (per-unit fallback)
    isGeminiAsrAvailableMock.mockReturnValue(false);
  });

  it('generates mock audio and writes timestamps', async () => {
    const { generateAudio } = await import('../../../src/audio/pipeline');
    const paths = makeTempPaths();

    const output = await generateAudio({
      script: makeScript(),
      voice: 'mock-voice',
      outputPath: paths.audioPath,
      timestampsPath: paths.timestampsPath,
      mock: true,
      audioMix: {
        outputPath: paths.mixPath,
        options: { music: 'track.mp3' },
      },
    });

    expect(output.audioPath).toBe(paths.audioPath);
    expect(fs.existsSync(paths.timestampsPath)).toBe(true);
    expect(fs.existsSync(paths.audioPath)).toBe(true);
    expect(fs.existsSync(paths.mixPath)).toBe(true);
  });

  it('runs TTS/ASR and reconciles when requested', async () => {
    const { generateAudio } = await import('../../../src/audio/pipeline');
    const paths = makeTempPaths();

    synthesizeSpeechMock.mockResolvedValue({
      audioPath: paths.audioPath,
      duration: 2,
      sampleRate: 22050,
      cost: 0,
    });

    const words = [
      { word: 'Hook', start: 0, end: 0.3, confidence: 0.9 },
      { word: 'line', start: 0.3, end: 0.6, confidence: 0.9 },
    ];

    transcribeAudioMock.mockResolvedValue({
      engine: 'whisper-cpp',
      duration: 2,
      text: 'Hook line',
      words,
    });

    reconcileMock.mockReturnValue(words);

    const output = await generateAudio({
      script: makeScript(),
      voice: 'kokoro',
      outputPath: paths.audioPath,
      timestampsPath: paths.timestampsPath,
      reconcile: true,
    });

    expect(synthesizeSpeechMock).toHaveBeenCalled();
    expect(transcribeAudioMock).toHaveBeenCalled();
    expect(reconcileMock).toHaveBeenCalled();
    expect(output.timestamps.scenes.length).toBeGreaterThan(0);
  });

  it('kokoro + Gemini available → synthesizeSpeech called without units (single-pass)', async () => {
    isGeminiAsrAvailableMock.mockReturnValue(true);

    const { generateAudio } = await import('../../../src/audio/pipeline');
    const paths = makeTempPaths();

    synthesizeSpeechMock.mockResolvedValue({
      audioPath: paths.audioPath,
      duration: 2,
      sampleRate: 22050,
      cost: 0,
      // No unitTimings → pipeline falls through to ASR
    });

    const words = [{ word: 'Hook', start: 0, end: 0.3, confidence: 0.9 }];
    transcribeAudioMock.mockResolvedValue({
      engine: 'gemini',
      duration: 2,
      text: 'Hook line',
      words,
    });

    await generateAudio({
      script: makeScript(),
      voice: 'kokoro',
      ttsEngine: 'kokoro',
      outputPath: paths.audioPath,
      timestampsPath: paths.timestampsPath,
    });

    expect(synthesizeSpeechMock).toHaveBeenCalledWith(
      expect.objectContaining({ units: undefined })
    );
    expect(transcribeAudioMock).toHaveBeenCalled();
  });

  it('kokoro + no Gemini → synthesizeSpeech called with units (per-unit fallback)', async () => {
    isGeminiAsrAvailableMock.mockReturnValue(false);

    const { generateAudio } = await import('../../../src/audio/pipeline');
    const paths = makeTempPaths();

    const unitTimings = [{ id: 'hook', start: 0, end: 1 }];
    synthesizeSpeechMock.mockResolvedValue({
      audioPath: paths.audioPath,
      duration: 2,
      sampleRate: 22050,
      cost: 0,
      unitTimings,
    });

    await generateAudio({
      script: makeScript(),
      voice: 'kokoro',
      ttsEngine: 'kokoro',
      outputPath: paths.audioPath,
      timestampsPath: paths.timestampsPath,
    });

    // units array should be passed (non-undefined)
    expect(synthesizeSpeechMock).toHaveBeenCalledWith(
      expect.objectContaining({ units: expect.arrayContaining([expect.any(Object)]) })
    );
    // ASR should NOT be called — unit timings handle it
    expect(transcribeAudioMock).not.toHaveBeenCalled();
  });
});
