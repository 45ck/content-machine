# Section Research: Audio Pipeline (TTS/ASR)

**Research Date:** 2026-01-04  
**Section:** System Design Section 6.2 - `cm audio` Command  
**Status:** Complete

---

## 1. Research Questions

This document investigates TTS (Text-to-Speech) and ASR (Automatic Speech Recognition) patterns across vendored repositories to inform content-machine's `cm audio` command design.

**Key Questions:**
1. Which TTS engines are used and how?
2. How is word-level timestamp alignment achieved?
3. How does Whisper integrate for transcription?
4. How is background music mixed with voiceover?
5. What audio formats and processing are required?

---

## 2. Vendor Evidence Summary

### TTS Engines

| Engine | Repo | Cost | Word Timestamps | Quality |
|--------|------|------|-----------------|---------|
| **Edge TTS** | MoneyPrinterTurbo, ShortGPT | Free | ✅ Built-in via SubMaker | Good |
| **Kokoro** | short-video-maker-gyori | Free (local) | ❌ Requires Whisper | Excellent |
| **OpenAI TTS** | MoneyPrinterTurbo | Paid | ❌ Requires Whisper | Excellent |
| **ElevenLabs** | ShortGPT | Paid | ❌ Requires Whisper | Excellent |
| **Azure TTS v2** | MoneyPrinterTurbo | Paid | ✅ Word boundary events | Excellent |

### ASR Engines

| Engine | Repo | Implementation | Word Timestamps |
|--------|------|----------------|-----------------|
| **Whisper.cpp** | short-video-maker-gyori | @remotion/install-whisper-cpp | ✅ tokenLevelTimestamps |
| **faster-whisper** | MoneyPrinterTurbo | Python library | ✅ word_timestamps=True |
| **whisper-timestamped** | ShortGPT | Python library | ✅ Native |

---

## 3. Evidence: Edge TTS with Built-in Timestamps

**Source:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L1175-L1200)

### 3.1 Edge TTS Stream with WordBoundary Events

```python
from edge_tts import SubMaker, submaker
import edge_tts

async def _do() -> SubMaker:
    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
    sub_maker = edge_tts.SubMaker()
    
    with open(voice_file, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                sub_maker.create_sub(
                    (chunk["offset"], chunk["duration"]), 
                    chunk["text"]
                )
    return sub_maker
```

**Pattern:**
- Stream chunks from Edge TTS
- `audio` chunks → write to file
- `WordBoundary` chunks → create subtitle entries with precise timing
- SubMaker collects word-level timestamps automatically
- **No Whisper needed** when using Edge TTS

### 3.2 Voice Rate Conversion

```python
def convert_rate_to_percent(voice_rate: float) -> str:
    """Convert voice rate float to Edge TTS percent string.
    
    Edge TTS expects rate as percentage: "-50%", "+0%", "+100%"
    """
    if voice_rate == 1.0:
        return "+0%"
    elif voice_rate < 1.0:
        return f"-{int((1 - voice_rate) * 100)}%"
    else:
        return f"+{int((voice_rate - 1) * 100)}%"
```

**Pattern:** Edge TTS uses percentage strings for rate adjustment.

---

## 4. Evidence: ShortGPT Edge TTS Module

**Source:** [vendor/ShortGPT/shortGPT/audio/edge_voice_module.py](../../../vendor/ShortGPT/shortGPT/audio/edge_voice_module.py)

### 4.1 VoiceModule Abstract Pattern

```python
from shortGPT.audio.voice_module import VoiceModule

class EdgeTTSVoiceModule(VoiceModule):
    def __init__(self, voiceName):
        self.voiceName = voiceName
        super().__init__()

    def update_usage(self):
        return None  # Edge TTS is free, no usage tracking

    def get_remaining_characters(self):
        return 999999999999  # Unlimited for free services

    def generate_voice(self, text, outputfile):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            with ThreadPoolExecutor() as executor:
                loop.run_in_executor(
                    executor, 
                    run_async_func, 
                    loop, 
                    self.async_generate_voice(text, outputfile)
                )
        finally:
            loop.close()
        return outputfile

    async def async_generate_voice(self, text, outputfile):
        communicate = edge_tts.Communicate(text, self.voiceName)
        with open(outputfile, "wb") as file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    file.write(chunk["data"])
        return outputfile
```

**Pattern:**
- Abstract `VoiceModule` base class for all TTS engines
- `generate_voice(text, outputfile)` as standard interface
- Async wrapper for Edge TTS streaming
- Usage tracking methods for paid services

---

## 5. Evidence: Kokoro Local TTS

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts)

### 5.1 Kokoro TypeScript Integration

```typescript
import { KokoroTTS, TextSplitterStream } from "kokoro-js";

export class Kokoro {
  constructor(private tts: KokoroTTS) {}

  async generate(
    text: string,
    voice: Voices,
  ): Promise<{
    audio: ArrayBuffer;
    audioLength: number;
  }> {
    const splitter = new TextSplitterStream();
    const stream = this.tts.stream(splitter, { voice });
    splitter.push(text);
    splitter.close();

    const output = [];
    for await (const audio of stream) {
      output.push(audio);
    }

    const audioBuffers: ArrayBuffer[] = [];
    let audioLength = 0;
    for (const audio of output) {
      audioBuffers.push(audio.audio.toWav());
      audioLength += audio.audio.audio.length / audio.audio.sampling_rate;
    }

    const mergedAudioBuffer = Kokoro.concatWavBuffers(audioBuffers);
    return { audio: mergedAudioBuffer, audioLength };
  }

  static async init(dtype: kokoroModelPrecision): Promise<Kokoro> {
    const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype,
      device: "cpu", // only "cpu" is supported in node
    });
    return new Kokoro(tts);
  }
}
```

**Pattern:**
- Local inference via ONNX model
- Text splitting for long inputs
- Streaming output concatenation
- WAV buffer merging for final output
- Returns audio duration for timeline calculation

### 5.2 WAV Buffer Concatenation

```typescript
static concatWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const header = Buffer.from(buffers[0].slice(0, 44));  // WAV header is 44 bytes
  let totalDataLength = 0;

  const dataParts = buffers.map((buf) => {
    const b = Buffer.from(buf);
    const data = b.slice(44);  // Skip header
    totalDataLength += data.length;
    return data;
  });

  // Update header with new total length
  header.writeUInt32LE(36 + totalDataLength, 4);   // ChunkSize
  header.writeUInt32LE(totalDataLength, 40);       // Subchunk2Size

  return Buffer.concat([header, ...dataParts]);
}
```

**Pattern:** Concatenate WAV files by reusing first header and updating length fields.

---

## 6. Evidence: Whisper Integration

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

### 6.1 @remotion/install-whisper-cpp Integration

```typescript
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
} from "@remotion/install-whisper-cpp";

export class Whisper {
  constructor(private config: Config) {}

  static async init(config: Config): Promise<Whisper> {
    if (!config.runningInDocker) {
      await installWhisperCpp({
        to: config.whisperInstallPath,
        version: config.whisperVersion,
        printOutput: true,
      });
      
      await downloadWhisperModel({
        model: config.whisperModel,
        folder: path.join(config.whisperInstallPath, "models"),
        printOutput: config.whisperVerbose,
      });
    }
    return new Whisper(config);
  }

  async CreateCaption(audioPath: string): Promise<Caption[]> {
    const { transcription } = await transcribe({
      model: this.config.whisperModel,
      whisperPath: this.config.whisperInstallPath,
      modelFolder: path.join(this.config.whisperInstallPath, "models"),
      whisperCppVersion: this.config.whisperVersion,
      inputPath: audioPath,
      tokenLevelTimestamps: true,  // Key: word-level timestamps
      printOutput: this.config.whisperVerbose,
    });

    // Convert transcription tokens to captions
    const captions: Caption[] = [];
    transcription.forEach((record) => {
      record.tokens.forEach((token) => {
        if (token.text.startsWith("[_TT")) return;  // Skip special tokens
        
        captions.push({
          text: token.text,
          startMs: record.offsets.from,
          endMs: record.offsets.to,
        });
      });
    });
    
    return captions;
  }
}
```

**Pattern:**
- Auto-install Whisper.cpp binary at runtime
- Auto-download model on first use
- `tokenLevelTimestamps: true` for word-level timing
- Filter special tokens like `[_TT_...]`
- Return array of `Caption` objects with `startMs`/`endMs`

### 6.2 Whisper Model Options

```typescript
export type whisperModels =
  | "tiny"
  | "tiny.en"
  | "base"
  | "base.en"
  | "small"
  | "small.en"
  | "medium"
  | "medium.en"
  | "large-v1"
  | "large-v2"
  | "large-v3"
  | "large-v3-turbo";
```

**Pattern:** TypeScript enum for model selection. Default is `medium.en` for English content.

---

## 7. Evidence: Audio Processing

### 7.1 Music Volume Levels

**Source:** short-video-maker-gyori

```typescript
export enum MusicVolumeEnum {
  muted = "muted",    // 0
  low = "low",        // ~0.2
  medium = "medium",  // ~0.45
  high = "high",      // ~0.7
}
```

### 7.2 Remotion Audio Mixing

**Source:** short-video-maker-gyori Remotion composition

```tsx
<Audio
  src={staticFile(musicSrc)}
  volume={(frame) => {
    const fadeInFrames = fps * 0.5;  // 0.5 second fade in
    const fadeOutFrames = fps * 2;   // 2 second fade out
    
    if (frame < fadeInFrames) {
      return (frame / fadeInFrames) * musicVolume;
    }
    if (frame > durationInFrames - fadeOutFrames) {
      const remaining = durationInFrames - frame;
      return (remaining / fadeOutFrames) * musicVolume;
    }
    return musicVolume;
  }}
/>
```

**Pattern:** Frame-based volume function with fade in/out. Remotion handles mixing automatically.

---

## 8. Synthesis: Recommended Patterns for content-machine

### 8.1 TTS Engine Selection Strategy

**Primary:** Edge TTS (free, built-in timestamps)  
**Fallback:** Kokoro (local, better quality, requires Whisper)  
**Optional:** OpenAI TTS, ElevenLabs (paid, premium quality)

```typescript
// src/audio/tts.ts
import { z } from 'zod';

export const TTSEngineSchema = z.enum([
  'edge-tts',
  'kokoro',
  'openai',
  'elevenlabs',
]);

export type TTSEngine = z.infer<typeof TTSEngineSchema>;

export interface TTSResult {
  audioPath: string;
  durationMs: number;
  timestamps?: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
}
```

### 8.2 Audio Generation Flow

```
Script Text
    │
    ▼
┌──────────────────────────────────────────────┐
│              TTS Engine                       │
│  ┌─────────────────┐  ┌─────────────────┐    │
│  │   Edge TTS      │  │    Kokoro       │    │
│  │  + SubMaker     │  │  + Whisper.cpp  │    │
│  │  (timestamps)   │  │  (timestamps)   │    │
│  └─────────────────┘  └─────────────────┘    │
└──────────────────────────────────────────────┘
    │
    ▼
audio.wav + timestamps.json
```

### 8.3 TypeScript Interface

```typescript
// src/audio/index.ts
export interface AudioOutput {
  audioPath: string;
  durationMs: number;
  words: {
    text: string;
    startMs: number;
    endMs: number;
  }[];
}

export async function generateAudio(
  script: string,
  config: {
    engine: TTSEngine;
    voice: string;
    rate?: number;
    outputPath: string;
  }
): Promise<AudioOutput> {
  switch (config.engine) {
    case 'edge-tts':
      return generateWithEdgeTTS(script, config);
    case 'kokoro':
      return generateWithKokoro(script, config);
    // ... other engines
  }
}
```

### 8.4 Edge TTS Implementation

```typescript
// src/audio/engines/edge-tts.ts
import { spawn } from 'child_process';

export async function generateWithEdgeTTS(
  text: string,
  config: { voice: string; rate?: number; outputPath: string }
): Promise<AudioOutput> {
  // Use edge-tts CLI or edge-tts npm package
  // Extract SubMaker data for word timestamps
  
  const words = await extractTimestampsFromSubMaker(subMaker);
  
  return {
    audioPath: config.outputPath,
    durationMs: calculateDuration(words),
    words,
  };
}
```

### 8.5 Whisper Integration for Non-Edge TTS

```typescript
// src/audio/whisper.ts
import { transcribe, installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp';

export async function transcribeForTimestamps(
  audioPath: string,
  model: WhisperModel = 'medium.en'
): Promise<WordTimestamp[]> {
  const { transcription } = await transcribe({
    model,
    inputPath: audioPath,
    tokenLevelTimestamps: true,
  });

  return transcription.flatMap(record =>
    record.tokens
      .filter(t => !t.text.startsWith('[_TT'))
      .map(token => ({
        text: token.text.trim(),
        startMs: record.offsets.from,
        endMs: record.offsets.to,
      }))
  );
}
```

### 8.6 Output Schema

```typescript
// src/audio/schema.ts
import { z } from 'zod';

export const WordTimestampSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
});

export const AudioOutputSchema = z.object({
  audioPath: z.string().describe("Path to generated audio file"),
  durationMs: z.number().positive().describe("Total audio duration in milliseconds"),
  words: z.array(WordTimestampSchema).describe("Word-level timestamps for captions"),
});

export type AudioOutput = z.infer<typeof AudioOutputSchema>;
```

---

## 9. Key Takeaways

| Pattern | Source | Adoption Priority |
|---------|--------|-------------------|
| Edge TTS with SubMaker timestamps | MoneyPrinterTurbo | **Must have** |
| @remotion/install-whisper-cpp | short-video-maker-gyori | **Must have** |
| VoiceModule abstraction class | ShortGPT | **Should have** |
| Kokoro local TTS | short-video-maker-gyori | **Should have** |
| WAV buffer concatenation | short-video-maker-gyori | Nice to have |
| Frame-based volume functions | Remotion patterns | Nice to have |

---

## 10. Critical Insight: Edge TTS vs Whisper

**Edge TTS provides built-in word timestamps via SubMaker.** This eliminates the need for Whisper transcription when using Edge TTS, making it:
- Faster (no transcription step)
- More accurate (ground truth from TTS engine)
- Simpler (fewer dependencies)

**Use Whisper only when:**
- Using TTS engines without native timestamps (Kokoro, OpenAI, ElevenLabs)
- Processing pre-existing audio files
- Custom audio sources

---

## 11. References to Existing Research

- [00-SUMMARY-20260102.md](../00-SUMMARY-20260102.md) - Architecture overview
- [08-shortgpt-20260102.md](../08-shortgpt-20260102.md) - Edge TTS usage, 30+ languages
- [10-short-video-maker-gyori-20260102.md](../10-short-video-maker-gyori-20260102.md) - Kokoro + Whisper integration
- [01-moneyprinter-turbo-20260102.md](../01-moneyprinter-turbo-20260102.md) - Multi-TTS support

---

## 12. Next Steps

1. Create Edge TTS wrapper with SubMaker integration
2. Create Kokoro wrapper with Whisper fallback
3. Define `AudioOutputSchema` with word timestamps
4. Implement `cm audio` CLI command
5. Add voice selection support (from config)
6. Add rate/pitch adjustment parameters
