# Implementation Phase 2: cm audio — Audio Pipeline

**Phase:** 2  
**Duration:** Weeks 3-4  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-2-AUDIO-20260105  
**Prerequisites:** Phase 1 complete (script.json available)

---

## 1. Overview

Phase 2 implements the `cm audio` command, which converts script.json to audio files with word-level timestamps. This is the second pipeline stage and connects script generation to video rendering.

### 1.1 Goals

- ✅ `cm audio --input script.json` generates audio.wav + timestamps.json
- ✅ Local TTS with kokoro-js (no API costs)
- ✅ Word-level timestamps via whisper.cpp ASR
- ✅ Multiple voice support

### 1.2 Non-Goals

- ❌ Cloud TTS (ElevenLabs, Azure) — Post-MVP
- ❌ Background music mixing — Post-MVP
- ❌ Audio normalization — Post-MVP

---

## 2. Deliverables

### 2.1 File Structure

```
src/audio/
├── pipeline.ts           # Main pipeline orchestration
├── schema.ts             # AudioOutput Zod schema
├── tts/
│   ├── provider.ts       # TTSProvider interface
│   ├── kokoro.ts         # kokoro-js implementation
│   └── factory.ts        # Provider factory
├── asr/
│   ├── provider.ts       # ASRProvider interface
│   ├── whisper.ts        # whisper.cpp implementation
│   └── factory.ts        # Provider factory
└── __tests__/
    ├── pipeline.test.ts
    ├── tts.test.ts
    ├── asr.test.ts
    └── schema.test.ts
```

### 2.2 Component Matrix

| Component    | File                        | Interface                      | Test Coverage |
| ------------ | --------------------------- | ------------------------------ | ------------- |
| Schema       | `src/audio/schema.ts`       | `AudioOutput`, `WordTimestamp` | 100%          |
| TTS Provider | `src/audio/tts/provider.ts` | `TTSProvider`                  | 90%           |
| Kokoro TTS   | `src/audio/tts/kokoro.ts`   | `KokoroTTSProvider`            | 85%           |
| ASR Provider | `src/audio/asr/provider.ts` | `ASRProvider`                  | 90%           |
| Whisper ASR  | `src/audio/asr/whisper.ts`  | `WhisperASRProvider`           | 85%           |
| Pipeline     | `src/audio/pipeline.ts`     | `AudioPipeline`                | 90%           |
| CLI          | `src/cli/commands/audio.ts` | `cm audio` command             | 80%           |

---

## 3. Implementation Details

### 3.1 Schema Definition

**Pattern from:** [SECTION-AUDIO-PIPELINE-20260104.md](../research/sections/SECTION-AUDIO-PIPELINE-20260104.md)

```typescript
// src/audio/schema.ts
import { z } from 'zod';

export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(), // seconds
  end: z.number().nonnegative(), // seconds
  confidence: z.number().min(0).max(1).optional(),
});

export const SceneAudioSchema = z.object({
  sceneId: z.number().int().positive(),
  text: z.string(),
  audioStart: z.number().nonnegative(),
  audioEnd: z.number().nonnegative(),
  words: z.array(WordTimestampSchema),
});

export const AudioOutputSchema = z.object({
  audioFile: z.string(), // Path to audio file
  format: z.enum(['wav', 'mp3']),
  sampleRate: z.number().int().positive(),
  duration: z.number().positive(), // Total duration in seconds
  scenes: z.array(SceneAudioSchema),
  metadata: z.object({
    voice: z.string(),
    ttsEngine: z.string(),
    asrEngine: z.string(),
    generatedAt: z.string().datetime(),
  }),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type SceneAudio = z.infer<typeof SceneAudioSchema>;
export type AudioOutput = z.infer<typeof AudioOutputSchema>;

// Validation helpers
export function validateAudioOutput(data: unknown): AudioOutput {
  return AudioOutputSchema.parse(data);
}
```

### 3.2 TTS Provider Interface

**Pattern from:** [RQ-07-TEXT-TO-SPEECH-20260104.md](../research/investigations/RQ-07-TEXT-TO-SPEECH-20260104.md)

```typescript
// src/audio/tts/provider.ts
export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0
  sampleRate?: number; // 22050, 44100, etc.
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: 'wav' | 'mp3';
  sampleRate: number;
  duration: number;
}

export interface TTSProvider {
  readonly name: string;
  readonly supportedVoices: string[];

  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
  synthesizeToFile(text: string, outputPath: string, options?: TTSOptions): Promise<TTSResult>;
}

// Factory function type
export type TTSProviderFactory = (config: TTSConfig) => TTSProvider;
```

### 3.3 Kokoro TTS Implementation

**Pattern from:** [RQ-08-KOKORO-TTS-20260104.md](../research/investigations/RQ-08-KOKORO-TTS-20260104.md)

```typescript
// src/audio/tts/kokoro.ts
import { Kokoro, KokoroVoice } from 'kokoro-js';
import { writeFileSync } from 'fs';
import { TTSProvider, TTSOptions, TTSResult } from './provider.js';
import { logger } from '../../core/logger.js';

export interface KokoroConfig {
  modelPath?: string; // Optional custom model path
}

export class KokoroTTSProvider implements TTSProvider {
  readonly name = 'kokoro';

  readonly supportedVoices = [
    'af_heart', // American female (default)
    'af_bella', // American female alternative
    'am_adam', // American male
    'am_michael', // American male alternative
    'bf_emma', // British female
    'bm_george', // British male
  ];

  private kokoro: Kokoro | null = null;
  private readonly config: KokoroConfig;

  constructor(config: KokoroConfig = {}) {
    this.config = config;
  }

  private async getKokoro(): Promise<Kokoro> {
    if (!this.kokoro) {
      logger.info('Initializing Kokoro TTS engine...');
      this.kokoro = await Kokoro.from_pretrained(
        this.config.modelPath ?? 'onnx-community/Kokoro-82M-v1.0-ONNX'
      );
      logger.info('Kokoro TTS initialized');
    }
    return this.kokoro;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const voice = options.voice ?? 'af_heart';
    const speed = options.speed ?? 1.0;

    if (!this.supportedVoices.includes(voice)) {
      throw new Error(`Unknown voice: ${voice}. Supported: ${this.supportedVoices.join(', ')}`);
    }

    const kokoro = await this.getKokoro();

    logger.debug({ text: text.substring(0, 50), voice, speed }, 'Synthesizing speech');

    const result = await kokoro.synthesize(text, {
      voice: voice as KokoroVoice,
      speed,
    });

    // Convert Float32Array to WAV buffer
    const wavBuffer = this.floatToWav(result.audio, result.sampleRate);

    return {
      audioBuffer: wavBuffer,
      format: 'wav',
      sampleRate: result.sampleRate,
      duration: result.audio.length / result.sampleRate,
    };
  }

  async synthesizeToFile(
    text: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<TTSResult> {
    const result = await this.synthesize(text, options);
    writeFileSync(outputPath, result.audioBuffer);
    logger.info({ path: outputPath, duration: result.duration }, 'Audio saved');
    return result;
  }

  private floatToWav(float32: Float32Array, sampleRate: number): Buffer {
    // WAV header + PCM data
    const buffer = Buffer.alloc(44 + float32.length * 2);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + float32.length * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // PCM format chunk size
    buffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
    buffer.writeUInt16LE(1, 22); // Channels (mono)
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32); // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(float32.length * 2, 40);

    // Convert float to 16-bit PCM
    for (let i = 0; i < float32.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32[i]));
      buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
    }

    return buffer;
  }
}
```

### 3.4 ASR Provider Interface

```typescript
// src/audio/asr/provider.ts
import { WordTimestamp } from '../schema.js';

export interface ASROptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
}

export interface ASRResult {
  text: string;
  words: WordTimestamp[];
  duration: number;
}

export interface ASRProvider {
  readonly name: string;

  transcribe(audioPath: string, options?: ASROptions): Promise<ASRResult>;
}
```

### 3.5 Whisper ASR Implementation

**Pattern from:** [RQ-09-WHISPER-ASR-20260104.md](../research/investigations/RQ-09-WHISPER-ASR-20260104.md)

```typescript
// src/audio/asr/whisper.ts
import { transcribe, installWhisperCpp } from '@remotion/install-whisper-cpp';
import { ASRProvider, ASROptions, ASRResult } from './provider.js';
import { WordTimestamp } from '../schema.js';
import { logger } from '../../core/logger.js';

export interface WhisperConfig {
  modelPath?: string;
  autoInstall?: boolean;
}

export class WhisperASRProvider implements ASRProvider {
  readonly name = 'whisper.cpp';
  private readonly config: WhisperConfig;
  private initialized = false;

  constructor(config: WhisperConfig = {}) {
    this.config = { autoInstall: true, ...config };
  }

  private async ensureInstalled(model: string): Promise<void> {
    if (this.initialized) return;

    if (this.config.autoInstall) {
      logger.info({ model }, 'Installing whisper.cpp model if needed...');
      await installWhisperCpp({ version: '1.5.5' });
    }

    this.initialized = true;
  }

  async transcribe(audioPath: string, options: ASROptions = {}): Promise<ASRResult> {
    const model = options.model ?? 'base';
    const language = options.language ?? 'en';

    await this.ensureInstalled(model);

    logger.info({ audioPath, model }, 'Transcribing audio');

    const result = await transcribe({
      inputPath: audioPath,
      model,
      tokenLevelTimestamps: true, // Get word-level timestamps
    });

    // Convert whisper output to our format
    const words: WordTimestamp[] = result.transcription.map((segment) => ({
      word: segment.text.trim(),
      start: segment.offsets.from / 1000, // ms to seconds
      end: segment.offsets.to / 1000,
      confidence: segment.confidence,
    }));

    const fullText = result.transcription
      .map((s) => s.text)
      .join(' ')
      .trim();
    const duration = words.length > 0 ? words[words.length - 1].end : 0;

    logger.info(
      {
        wordCount: words.length,
        duration,
      },
      'Transcription complete'
    );

    return { text: fullText, words, duration };
  }
}
```

### 3.6 Audio Pipeline

```typescript
// src/audio/pipeline.ts
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { TTSProvider } from './tts/provider.js';
import { ASRProvider } from './asr/provider.js';
import { ScriptOutput } from '../script/schema.js';
import { AudioOutput, SceneAudio, WordTimestamp } from './schema.js';
import { logger } from '../core/logger.js';
import { writeFileSync } from 'fs';

export interface AudioPipelineOptions {
  voice?: string;
  speed?: number;
  outputDir?: string;
}

export interface AudioPipelineResult {
  audio: AudioOutput;
  audioPath: string;
  timestampsPath: string;
}

export class AudioPipeline {
  constructor(
    private readonly tts: TTSProvider,
    private readonly asr: ASRProvider
  ) {}

  static create(config: AudioConfig): AudioPipeline {
    const tts = createTTSProvider(config.tts);
    const asr = createASRProvider(config.asr);
    return new AudioPipeline(tts, asr);
  }

  static createForTest(tts: TTSProvider, asr: ASRProvider): AudioPipeline {
    return new AudioPipeline(tts, asr);
  }

  async process(
    script: ScriptOutput,
    options: AudioPipelineOptions = {}
  ): Promise<AudioPipelineResult> {
    const outputDir = options.outputDir ?? '.';
    const voice = options.voice ?? 'af_heart';

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    logger.info({ scenes: script.scenes.length, voice }, 'Starting audio pipeline');

    // Combine all narration
    const fullText = script.scenes.map((s) => s.narration).join(' ');

    // Generate TTS audio
    const tempAudioPath = join(outputDir, 'audio.wav');
    const ttsResult = await this.tts.synthesizeToFile(fullText, tempAudioPath, {
      voice,
      speed: options.speed,
    });

    // Run ASR to get word timestamps
    const asrResult = await this.asr.transcribe(tempAudioPath);

    // Map words back to scenes
    const scenes = this.mapWordsToScenes(script.scenes, asrResult.words);

    // Build output
    const output: AudioOutput = {
      audioFile: tempAudioPath,
      format: ttsResult.format,
      sampleRate: ttsResult.sampleRate,
      duration: ttsResult.duration,
      scenes,
      metadata: {
        voice,
        ttsEngine: this.tts.name,
        asrEngine: this.asr.name,
        generatedAt: new Date().toISOString(),
      },
    };

    // Save timestamps
    const timestampsPath = join(outputDir, 'timestamps.json');
    writeFileSync(timestampsPath, JSON.stringify(output, null, 2));

    logger.info({ duration: output.duration, scenes: scenes.length }, 'Audio pipeline complete');

    return {
      audio: output,
      audioPath: tempAudioPath,
      timestampsPath,
    };
  }

  private mapWordsToScenes(scenes: ScriptOutput['scenes'], words: WordTimestamp[]): SceneAudio[] {
    const result: SceneAudio[] = [];
    let wordIndex = 0;

    for (const scene of scenes) {
      const sceneWords: WordTimestamp[] = [];
      const narrationWords = scene.narration.toLowerCase().split(/\s+/);

      // Match words from ASR to scene narration
      for (const targetWord of narrationWords) {
        if (wordIndex >= words.length) break;

        const asrWord = words[wordIndex];
        // Fuzzy match (handles punctuation differences)
        if (asrWord.word.toLowerCase().replace(/[^\w]/g, '') === targetWord.replace(/[^\w]/g, '')) {
          sceneWords.push(asrWord);
          wordIndex++;
        }
      }

      if (sceneWords.length > 0) {
        result.push({
          sceneId: scene.id,
          text: scene.narration,
          audioStart: sceneWords[0].start,
          audioEnd: sceneWords[sceneWords.length - 1].end,
          words: sceneWords,
        });
      }
    }

    return result;
  }
}
```

### 3.7 CLI Command

```typescript
// src/cli/commands/audio.ts
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { AudioPipeline } from '../../audio/pipeline.js';
import { loadConfig } from '../../core/config.js';
import { validateScript } from '../../script/schema.js';
import { logger } from '../../core/logger.js';
import ora from 'ora';

export function createAudioCommand(): Command {
  return new Command('audio')
    .description('Generate voiceover audio from a script')
    .option('-i, --input <path>', 'Input script.json path', 'script.json')
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--voice <name>', 'TTS voice to use', 'af_heart')
    .option('--speed <number>', 'Speech speed (0.5-2.0)', parseFloat, 1.0)
    .option('--list-voices', 'List available voices')
    .action(async (options) => {
      const config = loadConfig();
      const pipeline = AudioPipeline.create(config.audio);

      // Handle list voices
      if (options.listVoices) {
        console.log('Available voices:');
        // Would get from provider
        console.log('  - af_heart (American female)');
        console.log('  - am_adam (American male)');
        return;
      }

      // Validate input
      if (!existsSync(options.input)) {
        console.error(`Script file not found: ${options.input}`);
        process.exit(1);
      }

      const spinner = ora('Processing audio...').start();

      try {
        // Load and validate script
        const scriptJson = readFileSync(options.input, 'utf-8');
        const script = validateScript(JSON.parse(scriptJson));

        // Run pipeline
        const result = await pipeline.process(script, {
          voice: options.voice,
          speed: options.speed,
          outputDir: resolve(options.output),
        });

        spinner.succeed(`Audio generated (${result.audio.duration.toFixed(1)}s)`);
        console.log(`Audio: ${result.audioPath}`);
        console.log(`Timestamps: ${result.timestampsPath}`);
      } catch (error) {
        spinner.fail('Audio generation failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

---

## 4. Tests to Write First (TDD)

### 4.1 Schema Tests

```typescript
// src/audio/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { AudioOutputSchema, validateAudioOutput } from '../schema';

describe('AudioOutputSchema', () => {
  const validOutput = {
    audioFile: '/path/to/audio.wav',
    format: 'wav',
    sampleRate: 22050,
    duration: 45.5,
    scenes: [
      {
        sceneId: 1,
        text: 'First scene narration',
        audioStart: 0,
        audioEnd: 5.5,
        words: [
          { word: 'First', start: 0, end: 0.3 },
          { word: 'scene', start: 0.35, end: 0.6 },
        ],
      },
    ],
    metadata: {
      voice: 'af_heart',
      ttsEngine: 'kokoro',
      asrEngine: 'whisper.cpp',
      generatedAt: '2026-01-05T12:00:00Z',
    },
  };

  it('should validate correct output', () => {
    expect(() => validateAudioOutput(validOutput)).not.toThrow();
  });

  it('should reject negative timestamps', () => {
    const invalid = {
      ...validOutput,
      scenes: [
        {
          ...validOutput.scenes[0],
          audioStart: -1,
        },
      ],
    };
    expect(() => validateAudioOutput(invalid)).toThrow();
  });
});
```

### 4.2 TTS Provider Tests

```typescript
// src/audio/__tests__/tts.test.ts
import { describe, it, expect } from 'vitest';
import { FakeTTSProvider } from '../../test/stubs/fake-tts';

describe('TTSProvider', () => {
  it('should synthesize text to audio', async () => {
    const tts = new FakeTTSProvider();
    tts.queueResult({
      audioBuffer: Buffer.from('fake-audio'),
      format: 'wav',
      sampleRate: 22050,
      duration: 3.5,
    });

    const result = await tts.synthesize('Hello world');

    expect(result.duration).toBe(3.5);
    expect(result.format).toBe('wav');
  });

  it('should reject unknown voices', async () => {
    const tts = new FakeTTSProvider();

    await expect(tts.synthesize('Hello', { voice: 'unknown' })).rejects.toThrow('Unknown voice');
  });
});
```

### 4.3 ASR Provider Tests

```typescript
// src/audio/__tests__/asr.test.ts
import { describe, it, expect } from 'vitest';
import { FakeASRProvider } from '../../test/stubs/fake-asr';

describe('ASRProvider', () => {
  it('should transcribe audio with word timestamps', async () => {
    const asr = new FakeASRProvider();
    asr.queueResult({
      text: 'Hello world',
      words: [
        { word: 'Hello', start: 0, end: 0.3 },
        { word: 'world', start: 0.35, end: 0.7 },
      ],
      duration: 0.7,
    });

    const result = await asr.transcribe('/path/to/audio.wav');

    expect(result.words).toHaveLength(2);
    expect(result.words[0].word).toBe('Hello');
  });
});
```

### 4.4 Pipeline Tests

```typescript
// src/audio/__tests__/pipeline.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AudioPipeline } from '../pipeline';
import { FakeTTSProvider } from '../../test/stubs/fake-tts';
import { FakeASRProvider } from '../../test/stubs/fake-asr';
import { ScriptOutput } from '../../script/schema';

describe('AudioPipeline', () => {
  let tts: FakeTTSProvider;
  let asr: FakeASRProvider;
  let pipeline: AudioPipeline;

  const mockScript: ScriptOutput = {
    title: 'Test',
    hook: 'Hook',
    scenes: [
      { id: 1, narration: 'First scene', visualDirection: 'Show' },
      { id: 2, narration: 'Second scene', visualDirection: 'Show' },
      { id: 3, narration: 'Third scene', visualDirection: 'Show' },
    ],
    metadata: { archetype: 'listicle', estimatedDuration: 30 },
  };

  beforeEach(() => {
    tts = new FakeTTSProvider();
    asr = new FakeASRProvider();
    pipeline = AudioPipeline.createForTest(tts, asr);
  });

  it('should process script to audio output', async () => {
    tts.queueResult({
      audioBuffer: Buffer.from('audio'),
      format: 'wav',
      sampleRate: 22050,
      duration: 10,
    });

    asr.queueResult({
      text: 'First scene Second scene Third scene',
      words: [
        { word: 'First', start: 0, end: 0.3 },
        { word: 'scene', start: 0.35, end: 0.6 },
        { word: 'Second', start: 1, end: 1.3 },
        { word: 'scene', start: 1.35, end: 1.6 },
        { word: 'Third', start: 2, end: 2.3 },
        { word: 'scene', start: 2.35, end: 2.6 },
      ],
      duration: 2.6,
    });

    const result = await pipeline.process(mockScript);

    expect(result.audio.scenes).toHaveLength(3);
    expect(result.audio.duration).toBe(10);
  });
});
```

---

## 5. Test Stubs Required

```typescript
// src/test/stubs/fake-tts.ts
import { TTSProvider, TTSOptions, TTSResult } from '../../audio/tts/provider';

export class FakeTTSProvider implements TTSProvider {
  readonly name = 'fake';
  readonly supportedVoices = ['af_heart', 'am_adam'];

  private results: TTSResult[] = [];
  private calls: Array<{ text: string; options?: TTSOptions }> = [];

  queueResult(result: TTSResult): void {
    this.results.push(result);
  }

  getCalls() {
    return this.calls;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (options?.voice && !this.supportedVoices.includes(options.voice)) {
      throw new Error(`Unknown voice: ${options.voice}`);
    }

    this.calls.push({ text, options });

    const result = this.results.shift();
    if (!result) {
      return {
        audioBuffer: Buffer.from('fake'),
        format: 'wav',
        sampleRate: 22050,
        duration: text.split(' ').length * 0.3,
      };
    }
    return result;
  }

  async synthesizeToFile(text: string, path: string, options?: TTSOptions): Promise<TTSResult> {
    return this.synthesize(text, options);
  }
}
```

```typescript
// src/test/stubs/fake-asr.ts
import { ASRProvider, ASROptions, ASRResult } from '../../audio/asr/provider';

export class FakeASRProvider implements ASRProvider {
  readonly name = 'fake';

  private results: ASRResult[] = [];

  queueResult(result: ASRResult): void {
    this.results.push(result);
  }

  async transcribe(audioPath: string, options?: ASROptions): Promise<ASRResult> {
    const result = this.results.shift();
    if (!result) {
      throw new Error('No ASR result queued');
    }
    return result;
  }
}
```

---

## 6. Validation Checklist

### 6.1 Layer 1: Schema Validation

- [ ] `AudioOutputSchema` validates all fields
- [ ] Word timestamps have valid ranges
- [ ] Scene audio times are non-negative
- [ ] Metadata fields present

### 6.2 Layer 2: Programmatic Checks

- [ ] TTS generates valid WAV files
- [ ] ASR produces word-level timestamps
- [ ] Words correctly mapped to scenes
- [ ] Duration calculation accurate (±0.5s)

### 6.3 Layer 3: Audio Quality

- [ ] Listen to 5 sample outputs
- [ ] Speech is clear and natural
- [ ] Pacing appropriate (not rushed)
- [ ] No audio artifacts

### 6.4 Layer 4: Integration

- [ ] `cm audio` runs end-to-end
- [ ] Output files created correctly
- [ ] timestamps.json parseable by cm render

---

## 7. Research References

| Topic                       | Document                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Audio pipeline architecture | [SECTION-AUDIO-PIPELINE-20260104.md](../research/sections/SECTION-AUDIO-PIPELINE-20260104.md)   |
| TTS engine selection        | [RQ-07-TEXT-TO-SPEECH-20260104.md](../research/investigations/RQ-07-TEXT-TO-SPEECH-20260104.md) |
| Kokoro TTS integration      | [RQ-08-KOKORO-TTS-20260104.md](../research/investigations/RQ-08-KOKORO-TTS-20260104.md)         |
| Whisper ASR timestamps      | [RQ-09-WHISPER-ASR-20260104.md](../research/investigations/RQ-09-WHISPER-ASR-20260104.md)       |
| short-video-maker patterns  | [10-short-video-maker-gyori-20260102.md](../research/10-short-video-maker-gyori-20260102.md)    |

---

## 8. Definition of Done

Phase 2 is complete when:

- [ ] `cm audio --input script.json` generates audio.wav + timestamps.json
- [ ] Word-level timestamps are accurate (within 50ms)
- [ ] Multiple voices work
- [ ] Unit tests pass with >85% coverage
- [ ] Audio quality review passed

---

**Previous Phase:** [IMPL-PHASE-1-SCRIPT-20260105.md](IMPL-PHASE-1-SCRIPT-20260105.md)  
**Next Phase:** [IMPL-PHASE-3-VISUALS-20260105.md](IMPL-PHASE-3-VISUALS-20260105.md)
