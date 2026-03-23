/**
 * Audio pipeline integration test
 *
 * Exercises real pipeline logic (alignment, scene distribution, schema validation)
 * with mocked external services (TTS, ASR). Covers both Kokoro per-unit and
 * Gemini ASR code paths end-to-end.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ScriptOutput } from '../../../src/script/schema';
import type { WordTimestamp } from '../../../src/audio/schema';

// ---------------------------------------------------------------------------
// Mocks — same pattern as tests/unit/audio/pipeline.test.ts
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMultiSceneScript(): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    reasoning: 'integration test',
    hook: 'Did you know this one simple trick changes everything?',
    cta: 'Subscribe for more tips!',
    scenes: [
      {
        id: 'scene-1',
        text: 'Scientists recently discovered a groundbreaking new method.',
        visualDirection: 'laboratory',
      },
      {
        id: 'scene-2',
        text: 'This method is ten times faster than anything before.',
        visualDirection: 'speed chart',
      },
      {
        id: 'scene-3',
        text: 'Experts predict it will transform the entire industry by next year.',
        visualDirection: 'futuristic',
      },
    ],
  };
}

function makeHookDuplicateScript(): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    reasoning: 'hook dedup test',
    hook: 'Did you know this one simple trick',
    cta: 'Follow for more!',
    scenes: [
      {
        id: 'scene-1',
        text: 'Did you know this one simple trick changes everything in science?',
        visualDirection: 'science lab',
      },
      {
        id: 'scene-2',
        text: 'Researchers are calling it revolutionary.',
        visualDirection: 'researchers',
      },
    ],
  };
}

function makeSingleSceneScript(): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    reasoning: 'single scene test',
    hook: 'Quick tip for you.',
    cta: 'Like and subscribe!',
    scenes: [
      {
        id: 'scene-1',
        text: 'Here is the one thing you need to know about productivity.',
        visualDirection: 'desk setup',
      },
    ],
  };
}

const _tempDirs: string[] = [];
function makeTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-audio-integ-'));
  _tempDirs.push(dir);
  const audioPath = path.join(dir, 'audio.wav');
  // Create a dummy audio file (pipeline may check existence)
  fs.writeFileSync(audioPath, 'dummy-wav');
  return {
    dir,
    audioPath,
    timestampsPath: path.join(dir, 'timestamps.json'),
  };
}

/** Generate evenly spaced word timestamps for a text string. */
function generateWordTimestamps(text: string, totalDuration: number): WordTimestamp[] {
  const words = text.split(/\s+/).filter(Boolean);
  const perWord = totalDuration / words.length;
  return words.map((word, i) => ({
    word,
    start: parseFloat((i * perWord).toFixed(3)),
    end: parseFloat(((i + 1) * perWord).toFixed(3)),
    confidence: 0.92,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertNoGaps(scenes: Array<{ audioStart: number; audioEnd: number }>) {
  for (let i = 1; i < scenes.length; i++) {
    expect(scenes[i].audioStart).toBeCloseTo(scenes[i - 1].audioEnd, 2);
  }
}

function assertMonotonicWords(words: WordTimestamp[]) {
  for (let i = 1; i < words.length; i++) {
    expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].start);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('audio pipeline integration', () => {
  beforeEach(() => {
    synthesizeSpeechMock.mockReset();
    transcribeAudioMock.mockReset();
    reconcileMock.mockReset();
    isGeminiAsrAvailableMock.mockReset();
    isGeminiAsrAvailableMock.mockReturnValue(false);
  });

  afterAll(() => {
    for (const d of _tempDirs) fs.rmSync(d, { recursive: true, force: true });
  });

  // =========================================================================
  // Path B: Kokoro per-unit synthesis (no Gemini)
  // =========================================================================

  describe('Path B: Kokoro per-unit synthesis', () => {
    it('builds timestamps from unitTimings for multi-scene script', async () => {
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();
      const totalDuration = 15.0;

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: totalDuration,
        sampleRate: 24000,
        cost: 0,
        unitTimings: [
          { id: 'hook', start: 0.0, end: 3.2 },
          { id: 'scene-1', start: 3.2, end: 5.8 },
          { id: 'scene-2', start: 5.8, end: 9.1 },
          { id: 'scene-3', start: 9.1, end: 12.5 },
          { id: 'cta', start: 12.5, end: 15.0 },
        ],
      });

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      // ASR should NOT be called — unitTimings handle everything
      expect(transcribeAudioMock).not.toHaveBeenCalled();

      // 5 scenes matching the 5 alignment units
      const scenes = output.timestamps.scenes!;
      expect(scenes).toHaveLength(5);
      expect(scenes.map((s) => s.sceneId)).toEqual([
        'hook',
        'scene-1',
        'scene-2',
        'scene-3',
        'cta',
      ]);

      // Scene boundaries match unitTimings
      expect(scenes[0].audioStart).toBe(0.0);
      expect(scenes[0].audioEnd).toBe(3.2);
      expect(scenes[1].audioStart).toBe(3.2);
      expect(scenes[4].audioEnd).toBe(totalDuration);

      // Engine correctly identified
      expect(output.timestamps.asrEngine).toBe('kokoro-timed');
      expect(output.timestamps.totalDuration).toBe(totalDuration);

      // Words distributed — hook has 10 words, scene-1 has 7, etc.
      expect(scenes[0].words.length).toBe(9); // hook
      expect(scenes[1].words.length).toBe(7); // scene-1
      expect(scenes[2].words.length).toBe(9); // scene-2
      expect(scenes[3].words.length).toBe(11); // scene-3
      expect(scenes[4].words.length).toBe(4); // cta

      // All words present
      expect(output.timestamps.allWords.length).toBe(40);
      expect(output.wordCount).toBe(40);

      // Every word has valid timing
      for (const w of output.timestamps.allWords) {
        expect(w.start).toBeGreaterThanOrEqual(0);
        expect(w.end).toBeGreaterThan(w.start);
      }

      // Schema validation (pipeline does this internally — verify file was written)
      expect(fs.existsSync(paths.timestampsPath)).toBe(true);
    });

    it('covers full duration with no scene gaps', async () => {
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();
      const totalDuration = 12.0;

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: totalDuration,
        sampleRate: 24000,
        cost: 0,
        unitTimings: [
          { id: 'hook', start: 0.0, end: 3.0 },
          { id: 'scene-1', start: 3.0, end: 5.5 },
          { id: 'scene-2', start: 5.5, end: 8.5 },
          { id: 'scene-3', start: 8.5, end: 10.5 },
          { id: 'cta', start: 10.5, end: 12.0 },
        ],
      });

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      const scenes = output.timestamps.scenes!;

      // First scene starts at 0
      expect(scenes[0].audioStart).toBe(0);

      // Last scene ends at totalDuration
      expect(scenes[scenes.length - 1].audioEnd).toBe(totalDuration);

      // No gaps between scenes
      assertNoGaps(scenes);

      // Words are monotonically ordered
      assertMonotonicWords(output.timestamps.allWords);
    });

    it('deduplicates hook when it matches scene-1 prefix', async () => {
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: 10.0,
        sampleRate: 24000,
        cost: 0,
        unitTimings: [
          { id: 'scene-1', start: 0.0, end: 4.5 },
          { id: 'scene-2', start: 4.5, end: 7.5 },
          { id: 'cta', start: 7.5, end: 10.0 },
        ],
      });

      const output = await generateAudio({
        script: makeHookDuplicateScript(),
        voice: 'af_heart',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      // Hook was deduplicated — only 3 scenes
      const scenes = output.timestamps.scenes!;
      expect(scenes).toHaveLength(3);
      expect(scenes.map((s) => s.sceneId)).toEqual(['scene-1', 'scene-2', 'cta']);

      // TTS was called with 3 units (no hook)
      const ttsCall = synthesizeSpeechMock.mock.calls[0][0];
      expect(ttsCall.units).toHaveLength(3);
    });

    it('handles single-scene script', async () => {
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: 6.0,
        sampleRate: 24000,
        cost: 0,
        unitTimings: [
          { id: 'hook', start: 0.0, end: 1.5 },
          { id: 'scene-1', start: 1.5, end: 4.5 },
          { id: 'cta', start: 4.5, end: 6.0 },
        ],
      });

      const output = await generateAudio({
        script: makeSingleSceneScript(),
        voice: 'af_heart',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      expect(output.timestamps.scenes).toHaveLength(3);
      expect(output.timestamps.totalDuration).toBe(6.0);
      expect(output.wordCount).toBeGreaterThan(0);
      assertNoGaps(output.timestamps.scenes!);
    });
  });

  // =========================================================================
  // Path C: Kokoro + ASR (Gemini available)
  // =========================================================================

  describe('Path C: Kokoro + ASR', () => {
    it('calls ASR when Gemini is available and builds timestamps from words', async () => {
      isGeminiAsrAvailableMock.mockReturnValue(true);
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();
      const totalDuration = 15.0;

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: totalDuration,
        sampleRate: 24000,
        cost: 0,
        // No unitTimings — forces ASR path
      });

      // Build ASR words matching the full spoken text
      const spokenText =
        'Did you know this one simple trick changes everything ' +
        'Scientists recently discovered a groundbreaking new method ' +
        'This method is ten times faster than anything before ' +
        'Experts predict it will transform the entire industry by next year ' +
        'Subscribe for more tips';
      const asrWords = generateWordTimestamps(spokenText, totalDuration);

      transcribeAudioMock.mockResolvedValue({
        engine: 'gemini',
        duration: totalDuration,
        text: spokenText,
        words: asrWords,
      });

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        ttsEngine: 'kokoro',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      // ASR WAS called
      expect(transcribeAudioMock).toHaveBeenCalled();

      // TTS was called without units (single-pass synthesis)
      expect(synthesizeSpeechMock).toHaveBeenCalledWith(
        expect.objectContaining({ units: undefined })
      );

      // 5 scenes with proportional word distribution
      const scenes = output.timestamps.scenes!;
      expect(scenes).toHaveLength(5);
      expect(scenes.map((s) => s.sceneId)).toEqual([
        'hook',
        'scene-1',
        'scene-2',
        'scene-3',
        'cta',
      ]);

      // Word counts match script text word counts per unit
      expect(scenes[0].words.length).toBe(9); // hook
      expect(scenes[1].words.length).toBe(7); // scene-1
      expect(scenes[2].words.length).toBe(9); // scene-2
      expect(scenes[3].words.length).toBe(11); // scene-3
      expect(scenes[4].words.length).toBe(4); // cta

      expect(output.timestamps.asrEngine).toBe('gemini');
      expect(output.timestamps.totalDuration).toBe(totalDuration);

      // Total words
      const totalWords = scenes.reduce((sum, s) => sum + s.words.length, 0);
      expect(totalWords).toBe(output.timestamps.allWords.length);
      expect(totalWords).toBe(output.wordCount);

      // Last scene covers end of audio
      expect(scenes[scenes.length - 1].audioEnd).toBeGreaterThanOrEqual(totalDuration);
    });

    it('reconciles words when reconcile=true', async () => {
      isGeminiAsrAvailableMock.mockReturnValue(true);
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();
      const totalDuration = 10.0;

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: totalDuration,
        sampleRate: 24000,
        cost: 0,
      });

      const spokenText =
        'Did you know this one simple trick changes everything ' +
        'Scientists recently discovered a groundbreaking new method ' +
        'This method is ten times faster than anything before ' +
        'Experts predict it will transform the entire industry by next year ' +
        'Subscribe for more tips';
      const asrWords = generateWordTimestamps(spokenText, totalDuration);

      transcribeAudioMock.mockResolvedValue({
        engine: 'gemini',
        duration: totalDuration,
        text: spokenText,
        words: asrWords,
      });

      // Reconcile mock: pass through words unchanged
      reconcileMock.mockImplementation((words: WordTimestamp[]) => words);

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        ttsEngine: 'kokoro',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
        reconcile: true,
      });

      // Reconcile WAS called
      expect(reconcileMock).toHaveBeenCalled();

      // Analysis reflects reconciliation
      expect(output.timestamps.analysis?.reconciled).toBe(true);
    });
  });

  // =========================================================================
  // Data integrity invariants
  // =========================================================================

  describe('data integrity invariants', () => {
    it('word timestamps are monotonically non-decreasing', async () => {
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: 15.0,
        sampleRate: 24000,
        cost: 0,
        unitTimings: [
          { id: 'hook', start: 0.0, end: 3.2 },
          { id: 'scene-1', start: 3.2, end: 5.8 },
          { id: 'scene-2', start: 5.8, end: 9.1 },
          { id: 'scene-3', start: 9.1, end: 12.5 },
          { id: 'cta', start: 12.5, end: 15.0 },
        ],
      });

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      assertMonotonicWords(output.timestamps.allWords);

      // Scene boundaries are also monotonic
      const scenes = output.timestamps.scenes!;
      for (let i = 1; i < scenes.length; i++) {
        expect(scenes[i].audioStart).toBeGreaterThanOrEqual(scenes[i - 1].audioStart);
        expect(scenes[i].audioEnd).toBeGreaterThanOrEqual(scenes[i - 1].audioEnd);
      }
    });

    it('total words in scenes equals allWords count equals output.wordCount', async () => {
      isGeminiAsrAvailableMock.mockReturnValue(true);
      const { generateAudio } = await import('../../../src/audio/pipeline');
      const paths = makeTempPaths();
      const totalDuration = 12.0;

      synthesizeSpeechMock.mockResolvedValue({
        audioPath: paths.audioPath,
        duration: totalDuration,
        sampleRate: 24000,
        cost: 0,
      });

      const spokenText =
        'Did you know this one simple trick changes everything ' +
        'Scientists recently discovered a groundbreaking new method ' +
        'This method is ten times faster than anything before ' +
        'Experts predict it will transform the entire industry by next year ' +
        'Subscribe for more tips';
      const asrWords = generateWordTimestamps(spokenText, totalDuration);

      transcribeAudioMock.mockResolvedValue({
        engine: 'gemini',
        duration: totalDuration,
        text: spokenText,
        words: asrWords,
      });

      const output = await generateAudio({
        script: makeMultiSceneScript(),
        voice: 'af_heart',
        ttsEngine: 'kokoro',
        outputPath: paths.audioPath,
        timestampsPath: paths.timestampsPath,
      });

      const scenes = output.timestamps.scenes!;
      const wordsInScenes = scenes.reduce((sum, s) => sum + s.words.length, 0);

      expect(wordsInScenes).toBe(output.timestamps.allWords.length);
      expect(output.wordCount).toBe(output.timestamps.allWords.length);
    });
  });
});
