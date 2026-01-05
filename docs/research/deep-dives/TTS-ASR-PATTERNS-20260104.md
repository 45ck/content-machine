# TTS (Text-to-Speech) and ASR (Automatic Speech Recognition) Patterns

**Date:** 2026-01-04  
**Status:** Research Complete  
**Repos Analyzed:**

- `vendor/audio/kokoro-fastapi`
- `vendor/short-video-maker-gyori`
- `vendor/ShortGPT`
- `vendor/MoneyPrinterTurbo`
- `vendor/captions/whisperx`

---

## Table of Contents

1. [TTS Engines Overview](#1-tts-engines-overview)
2. [Edge TTS (Microsoft)](#2-edge-tts-microsoft)
3. [Kokoro (Local TTS)](#3-kokoro-local-tts)
4. [Other TTS Engines](#4-other-tts-engines)
5. [ASR/Transcription with Whisper](#5-asrtranscription-with-whisper)
6. [WhisperX Word-Level Alignment](#6-whisperx-word-level-alignment)
7. [Audio Processing Patterns](#7-audio-processing-patterns)
8. [Recommendations for content-machine](#8-recommendations-for-content-machine)

---

## 1. TTS Engines Overview

| Engine           | Cost | Quality   | Languages    | Speed  | Word Timestamps  | Best For                 |
| ---------------- | ---- | --------- | ------------ | ------ | ---------------- | ------------------------ |
| **Edge TTS**     | Free | High      | 300+ voices  | Fast   | ✅ Built-in      | Production, multilingual |
| **Kokoro**       | Free | High      | English only | Medium | ❌ Needs Whisper | Local/offline            |
| **OpenAI TTS**   | Paid | Very High | Multi        | Fast   | ❌ Needs Whisper | Premium quality          |
| **Azure TTS v2** | Paid | Very High | Multi        | Fast   | ✅ Built-in      | Enterprise               |
| **ElevenLabs**   | Paid | Excellent | Multi        | Medium | ❌ Needs Whisper | Voice cloning            |
| **Gemini TTS**   | Paid | High      | Multi        | Fast   | ❌ Needs Whisper | Google ecosystem         |

---

## 2. Edge TTS (Microsoft)

### 2.1 Basic Usage Pattern

**File:** [vendor/ShortGPT/shortGPT/audio/edge_voice_module.py](../../../vendor/ShortGPT/shortGPT/audio/edge_voice_module.py)

```python
import edge_tts
import asyncio

class EdgeTTSVoiceModule(VoiceModule):
    def __init__(self, voiceName):
        self.voiceName = voiceName

    async def async_generate_voice(self, text, outputfile):
        communicate = edge_tts.Communicate(text, self.voiceName)
        with open(outputfile, "wb") as file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    file.write(chunk["data"])
        return outputfile
```

### 2.2 Edge TTS with Word Timestamps (SubMaker)

**File:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L296-L330)

This is the **most valuable pattern** - Edge TTS provides word-level timestamps natively!

```python
from edge_tts import SubMaker

async def azure_tts_v1(text: str, voice_name: str, voice_rate: float, voice_file: str) -> SubMaker:
    """Generate TTS with word timestamps using Edge TTS."""
    rate_str = convert_rate_to_percent(voice_rate)  # e.g., "+10%" or "-5%"

    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
    sub_maker = edge_tts.SubMaker()

    with open(voice_file, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Capture word-level timestamps!
                sub_maker.create_sub(
                    (chunk["offset"], chunk["duration"]),  # timing tuple
                    chunk["text"]                           # word text
                )

    return sub_maker

def convert_rate_to_percent(rate: float) -> str:
    """Convert speed multiplier to Edge TTS rate string."""
    if rate == 1.0:
        return "+0%"
    percent = round((rate - 1.0) * 100)
    return f"+{percent}%" if percent > 0 else f"{percent}%"
```

### 2.3 Available Edge TTS Voices

Edge TTS provides 300+ voices. Key voice format: `{locale}-{Name}Neural`

```python
# Popular English voices
"en-US-AriaNeural"       # Female, natural
"en-US-JennyNeural"      # Female, conversational
"en-US-GuyNeural"        # Male
"en-US-BrianNeural"      # Male
"en-GB-SoniaNeural"      # British female
"en-AU-NatashaNeural"    # Australian female

# Multilingual voices (can switch languages)
"en-US-AvaMultilingualNeural"
"en-US-AndrewMultilingualNeural"

# Other languages
"zh-CN-XiaoxiaoNeural"   # Chinese female
"ja-JP-NanamiNeural"     # Japanese female
"de-DE-KatjaNeural"      # German female
"fr-FR-DeniseNeural"     # French female
"es-ES-ElviraNeural"     # Spanish female
```

---

## 3. Kokoro (Local TTS)

### 3.1 TypeScript Integration (kokoro-js)

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts)

```typescript
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

export class Kokoro {
  constructor(private tts: KokoroTTS) {}

  async generate(
    text: string,
    voice: Voices
  ): Promise<{
    audio: ArrayBuffer;
    audioLength: number;
  }> {
    const splitter = new TextSplitterStream();
    const stream = this.tts.stream(splitter, { voice });

    splitter.push(text);
    splitter.close();

    const audioBuffers: ArrayBuffer[] = [];
    let audioLength = 0;

    for await (const audio of stream) {
      audioBuffers.push(audio.audio.toWav());
      audioLength += audio.audio.audio.length / audio.audio.sampling_rate;
    }

    return {
      audio: Kokoro.concatWavBuffers(audioBuffers),
      audioLength,
    };
  }

  static async init(dtype: 'fp32' | 'fp16' | 'q8' | 'q4'): Promise<Kokoro> {
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype,
      device: 'cpu', // Only CPU supported in Node.js
    });
    return new Kokoro(tts);
  }
}
```

### 3.2 Python FastAPI Integration (kokoro-fastapi)

**File:** [vendor/audio/kokoro-fastapi/api/src/inference/kokoro_v1.py](../../../vendor/audio/kokoro-fastapi/api/src/inference/kokoro_v1.py)

```python
from kokoro import KModel, KPipeline

class KokoroV1(BaseModelBackend):
    def __init__(self):
        self._device = settings.get_device()  # "cpu", "cuda", or "mps"
        self._model: Optional[KModel] = None
        self._pipelines: Dict[str, KPipeline] = {}

    async def load_model(self, path: str) -> None:
        model_path = await paths.get_model_path(path)
        config_path = os.path.join(os.path.dirname(model_path), "config.json")

        self._model = KModel(config=config_path, model=model_path).eval()

        if self._device == "cuda":
            self._model = self._model.cuda()
        elif self._device == "mps":
            self._model = self._model.to(torch.device("mps"))

    async def generate(
        self,
        text: str,
        voice: Tuple[str, str],  # (voice_name, voice_path)
        speed: float = 1.0,
        lang_code: Optional[str] = None,
        return_timestamps: bool = False,
    ) -> AsyncGenerator[AudioChunk, None]:
        voice_name, voice_path = voice
        pipeline_lang_code = lang_code or voice_name[0].lower()
        pipeline = self._get_pipeline(pipeline_lang_code)

        for result in pipeline(text, voice=voice_path, speed=speed, model=self._model):
            if result.audio is not None:
                word_timestamps = None
                if return_timestamps and hasattr(result, "tokens"):
                    word_timestamps = [
                        WordTimestamp(
                            word=token.text.strip(),
                            start_time=float(token.start_ts),
                            end_time=float(token.end_ts),
                        )
                        for token in result.tokens
                        if token.text and token.text.strip()
                    ]
                yield AudioChunk(result.audio.numpy(), word_timestamps=word_timestamps)
```

### 3.3 Kokoro Voice Combination (Advanced)

**File:** [vendor/audio/kokoro-fastapi/api/src/services/tts_service.py](../../../vendor/audio/kokoro-fastapi/api/src/services/tts_service.py#L115-L180)

```python
async def _get_voices_path(self, voice: str) -> Tuple[str, str]:
    """Handle voice combination like 'af_jadzia+af_jessica' or 'voice(0.7)+voice2(0.3)'."""

    # Parse combined voices: "voice1+voice2-voice3" or "voice1(0.6)+voice2(0.4)"
    split_voice = re.split(r"([-+])", voice)

    if len(split_voice) == 1:
        path = await self._voice_manager.get_voice_path(voice)
        return voice, path

    # Calculate total weight for normalization
    total_weight = 0
    for voice_index in range(0, len(split_voice), 2):
        voice_object = split_voice[voice_index]
        if "(" in voice_object and ")" in voice_object:
            voice_weight = float(voice_object.split("(")[1].split(")")[0])
        else:
            voice_weight = 1
        total_weight += voice_weight
        split_voice[voice_index] = (voice_object.split("(")[0], voice_weight)

    # Combine voice tensors
    path = await self._voice_manager.get_voice_path(split_voice[0][0])
    combined_tensor = await self._load_voice_from_path(path, split_voice[0][1] / total_weight)

    for op_index in range(1, len(split_voice) - 1, 2):
        path = await self._voice_manager.get_voice_path(split_voice[op_index + 1][0])
        voice_tensor = await self._load_voice_from_path(path, split_voice[op_index + 1][1] / total_weight)

        if split_voice[op_index] == "+":
            combined_tensor += voice_tensor
        else:
            combined_tensor -= voice_tensor

    # Save combined voice
    combined_path = os.path.join(tempfile.gettempdir(), f"{voice}.pt")
    torch.save(combined_tensor, combined_path)
    return voice, combined_path
```

---

## 4. Other TTS Engines

### 4.1 ElevenLabs

**File:** [vendor/ShortGPT/shortGPT/audio/eleven_voice_module.py](../../../vendor/ShortGPT/shortGPT/audio/eleven_voice_module.py)

```python
class ElevenLabsVoiceModule(VoiceModule):
    def __init__(self, api_key, voiceName, checkElevenCredits=False):
        self.eleven_labs_api = ElevenLabsAPI(api_key)
        self.voiceName = voiceName
        self.remaining_credits = self.eleven_labs_api.get_remaining_characters()

    def generate_voice(self, text, outputfile):
        if self.get_remaining_characters() >= len(text):
            return self.eleven_labs_api.generate_voice(
                text=text,
                character=self.voiceName,
                filename=outputfile
            )
        raise Exception(f"Insufficient credits: {self.remaining_credits} chars remaining")
```

### 4.2 Azure TTS v2 (with Word Boundaries)

**File:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L380-L445)

```python
import azure.cognitiveservices.speech as speechsdk

def azure_tts_v2(text: str, voice_name: str, voice_file: str) -> SubMaker:
    """Azure Cognitive Services TTS with word-level timestamps."""
    sub_maker = SubMaker()

    def speech_synthesizer_word_boundary_cb(evt: speechsdk.SessionEventArgs):
        """Callback for word boundary events."""
        duration = _format_duration_to_offset(str(evt.duration))
        offset = _format_duration_to_offset(evt.audio_offset)
        sub_maker.subs.append(evt.text)
        sub_maker.offset.append((offset, offset + duration))

    speech_config = speechsdk.SpeechConfig(
        subscription=config.azure.speech_key,
        region=config.azure.speech_region
    )
    speech_config.speech_synthesis_voice_name = voice_name
    speech_config.set_property(
        property_id=speechsdk.PropertyId.SpeechServiceResponse_RequestWordBoundary,
        value="true"
    )
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3
    )

    audio_config = speechsdk.audio.AudioOutputConfig(filename=voice_file)
    synthesizer = speechsdk.SpeechSynthesizer(audio_config=audio_config, speech_config=speech_config)
    synthesizer.synthesis_word_boundary.connect(speech_synthesizer_word_boundary_cb)

    result = synthesizer.speak_text_async(text).get()
    return sub_maker
```

### 4.3 Gemini TTS

**File:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L448-L530)

```python
import google.generativeai as genai
from pydub import AudioSegment

def gemini_tts(text: str, voice_name: str, voice_rate: float, voice_file: str) -> SubMaker:
    """Google Gemini TTS (requires API key)."""
    genai.configure(api_key=config.app.gemini_api_key)

    model = genai.GenerativeModel("gemini-2.5-flash-preview-tts")

    generation_config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {"voice_name": voice_name}
            }
        }
    }

    response = model.generate_content(contents=text, generation_config=generation_config)

    # Extract audio from response
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            audio_bytes = part.inline_data.data
            break

    # Gemini returns Linear PCM, convert to MP3
    audio_segment = AudioSegment.from_file(
        io.BytesIO(audio_bytes),
        format="raw",
        frame_rate=24000,  # Gemini TTS default
        channels=1,
        sample_width=2     # 16-bit
    )
    audio_segment.export(voice_file, format="mp3")

    return sub_maker  # Note: No word timestamps from Gemini
```

---

## 5. ASR/Transcription with Whisper

### 5.1 Remotion Whisper Integration (TypeScript)

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

```typescript
import { downloadWhisperModel, installWhisperCpp, transcribe } from '@remotion/install-whisper-cpp';

export class Whisper {
  constructor(private config: Config) {}

  static async init(config: Config): Promise<Whisper> {
    await installWhisperCpp({
      to: config.whisperInstallPath,
      version: config.whisperVersion,
      printOutput: true,
    });

    await downloadWhisperModel({
      model: config.whisperModel, // "base", "small", "medium", "large-v3"
      folder: path.join(config.whisperInstallPath, 'models'),
    });

    return new Whisper(config);
  }

  async CreateCaption(audioPath: string): Promise<Caption[]> {
    const { transcription } = await transcribe({
      model: this.config.whisperModel,
      whisperPath: this.config.whisperInstallPath,
      modelFolder: path.join(this.config.whisperInstallPath, 'models'),
      whisperCppVersion: this.config.whisperVersion,
      inputPath: audioPath,
      tokenLevelTimestamps: true, // KEY: Get word-level timing!
    });

    const captions: Caption[] = [];
    transcription.forEach((record) => {
      record.tokens.forEach((token) => {
        if (token.text.startsWith('[_TT')) return; // Skip timing tokens

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

### 5.2 Faster-Whisper Integration (Python)

**File:** [vendor/MoneyPrinterTurbo/app/services/subtitle.py](../../../vendor/MoneyPrinterTurbo/app/services/subtitle.py)

```python
from faster_whisper import WhisperModel

model_size = "large-v3"
device = "cpu"  # or "cuda"
compute_type = "int8"  # "float16" for GPU

model = WhisperModel(
    model_size_or_path=model_size,
    device=device,
    compute_type=compute_type
)

def create(audio_file, subtitle_file: str = ""):
    segments, info = model.transcribe(
        audio_file,
        beam_size=5,
        word_timestamps=True,       # KEY: Get word-level timing!
        vad_filter=True,            # Voice Activity Detection
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    logger.info(f"Detected language: '{info.language}', probability: {info.language_probability:.2f}")

    subtitles = []
    for segment in segments:
        if segment.words:
            for word in segment.words:
                # word.start, word.end = timestamps in seconds
                # word.word = the transcribed word
                subtitles.append({
                    "msg": word.word,
                    "start_time": word.start,
                    "end_time": word.end
                })

    return subtitles
```

### 5.3 Whisper-Timestamped (ShortGPT)

**File:** [vendor/ShortGPT/shortGPT/audio/audio_utils.py](../../../vendor/ShortGPT/shortGPT/audio/audio_utils.py#L38-L48)

```python
from whisper_timestamped import load_model, transcribe_timestamped

WHISPER_MODEL = None

def audioToText(filename, model_size="base"):
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        WHISPER_MODEL = load_model(model_size)

    gen = transcribe_timestamped(
        WHISPER_MODEL,
        filename,
        verbose=False,
        fp16=False  # Use fp32 for CPU
    )
    return gen
```

---

## 6. WhisperX Word-Level Alignment

WhisperX provides **superior word-level alignment** using wav2vec2 forced alignment after Whisper transcription.

### 6.1 Full Transcription + Alignment Pipeline

**File:** [vendor/captions/whisperx/whisperx/transcribe.py](../../../vendor/captions/whisperx/whisperx/transcribe.py)

```python
from whisperx.alignment import align, load_align_model
from whisperx.asr import load_model
from whisperx.audio import load_audio

# Step 1: Load ASR model
model = load_model(
    model_name,               # "large-v3"
    device="cuda",
    compute_type="float16",
    vad_method="pyannote",    # or "silero"
    vad_options={
        "chunk_size": 30,
        "vad_onset": 0.500,
        "vad_offset": 0.363,
    },
)

# Step 2: Transcribe
audio = load_audio(audio_path)
result = model.transcribe(audio, batch_size=16)

# Step 3: Load alignment model (wav2vec2)
align_model, align_metadata = load_align_model(
    language_code="en",
    device="cuda",
)

# Step 4: Align words to audio
result = align(
    result["segments"],
    align_model,
    align_metadata,
    audio,
    device="cuda",
    return_char_alignments=False,  # Word-level only
)

# Result structure:
# {
#   "segments": [{
#     "start": 0.0,
#     "end": 2.5,
#     "text": "Hello world",
#     "words": [
#       {"word": "Hello", "start": 0.0, "end": 0.8, "score": 0.95},
#       {"word": "world", "start": 1.0, "end": 2.5, "score": 0.92}
#     ]
#   }],
#   "word_segments": [...]
# }
```

### 6.2 WhisperX ASR Options

**File:** [vendor/captions/whisperx/whisperx/asr.py](../../../vendor/captions/whisperx/whisperx/asr.py#L260-L295)

```python
default_asr_options = {
    "beam_size": 5,
    "best_of": 5,
    "patience": 1,
    "length_penalty": 1,
    "temperatures": [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "condition_on_previous_text": False,
    "initial_prompt": None,
    "suppress_tokens": [-1],
    "suppress_numerals": False,
    "without_timestamps": True,  # Handled by alignment
    "word_timestamps": False,    # Handled by alignment
}

default_vad_options = {
    "chunk_size": 30,
    "vad_onset": 0.500,
    "vad_offset": 0.363,
}
```

### 6.3 Forced Alignment Algorithm

**File:** [vendor/captions/whisperx/whisperx/alignment.py](../../../vendor/captions/whisperx/whisperx/alignment.py)

The alignment uses CTC (Connectionist Temporal Classification) forced alignment:

```python
def align(transcript, model, align_metadata, audio, device, ...):
    """Align phoneme recognition predictions to known transcription."""

    for segment in transcript:
        # 1. Extract audio segment
        t1, t2 = segment["start"], segment["end"]
        waveform_segment = audio[:, int(t1 * SAMPLE_RATE):int(t2 * SAMPLE_RATE)]

        # 2. Get emission probabilities from wav2vec2
        with torch.inference_mode():
            emissions = model(waveform_segment.to(device)).logits
            emissions = torch.log_softmax(emissions, dim=-1)

        # 3. Build CTC trellis
        tokens = [model_dictionary.get(c, -1) for c in text_clean]
        trellis = get_trellis(emissions[0], tokens, blank_id=0)

        # 4. Backtrack to find optimal path
        path = backtrack_beam(trellis, emissions[0], tokens, blank_id=0, beam_width=2)

        # 5. Merge repeated characters into segments
        char_segments = merge_repeats(path, text_clean)

        # 6. Convert to word-level timestamps
        # ...
```

---

## 7. Audio Processing Patterns

### 7.1 Audio Normalization for Whisper

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts)

```typescript
import ffmpeg from "fluent-ffmpeg";

async saveNormalizedAudio(audio: ArrayBuffer, outputPath: string): Promise<string> {
  const inputStream = new Readable();
  inputStream.push(Buffer.from(audio));
  inputStream.push(null);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputStream)
      .audioCodec("pcm_s16le")   // 16-bit signed PCM
      .audioChannels(1)          // Mono
      .audioFrequency(16000)     // 16kHz (Whisper requirement)
      .toFormat("wav")
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}
```

### 7.2 Background Music Mixing (Remotion)

**File:** [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx)

```tsx
import { Audio, OffthreadVideo, Sequence } from 'remotion';

// Music volume levels
function calculateVolume(level: MusicVolumeEnum): [number, boolean] {
  switch (level) {
    case 'muted':
      return [0, true];
    case 'low':
      return [0.2, false];
    case 'medium':
      return [0.45, false];
    case 'high':
      return [0.7, false];
  }
}

// In component
const [musicVolume, musicMuted] = calculateVolume(config.musicVolume);

return (
  <AbsoluteFill>
    {/* Background music - loops for entire video */}
    <Audio
      loop
      src={music.url}
      startFrom={music.start * fps}
      endAt={music.end * fps}
      volume={() => musicVolume}
      muted={musicMuted}
    />

    {scenes.map((scene, i) => (
      <Sequence from={startFrame} durationInFrames={duration}>
        <OffthreadVideo src={video} muted />
        {/* Voiceover - full volume */}
        <Audio src={audio.url} />
        {/* Captions overlay... */}
      </Sequence>
    ))}
  </AbsoluteFill>
);
```

### 7.3 MoviePy Audio Mixing (Python)

**File:** [vendor/MoneyPrinterTurbo/app/services/video.py](../../../vendor/MoneyPrinterTurbo/app/services/video.py#L300-L330)

```python
from moviepy import (
    AudioFileClip,
    CompositeAudioClip,
    afx,
)

def generate_video(video_path, audio_path, subtitle_path, output_file, params):
    video_clip = VideoFileClip(video_path).without_audio()

    # Voice audio with volume control
    audio_clip = AudioFileClip(audio_path).with_effects([
        afx.MultiplyVolume(params.voice_volume)
    ])

    # Background music
    bgm_file = get_bgm_file(bgm_type=params.bgm_type, bgm_file=params.bgm_file)
    if bgm_file:
        bgm_clip = AudioFileClip(bgm_file).with_effects([
            afx.MultiplyVolume(params.bgm_volume),  # Volume control
            afx.AudioFadeOut(3),                    # Fade out at end
            afx.AudioLoop(duration=video_clip.duration),  # Loop to match video
        ])
        # Composite voice + music
        audio_clip = CompositeAudioClip([audio_clip, bgm_clip])

    video_clip = video_clip.with_audio(audio_clip)
    video_clip.write_videofile(output_file, audio_codec="aac", fps=30)
```

### 7.4 Audio Speed Adjustment

**File:** [vendor/ShortGPT/shortGPT/audio/audio_utils.py](../../../vendor/ShortGPT/shortGPT/audio/audio_utils.py#L33-L44)

```python
import subprocess

def speedUpAudio(tempAudioPath, outputFile, expected_duration=None):
    """Speed up audio to fit within time limit (e.g., 60s for Shorts)."""
    _, duration = get_asset_duration(tempAudioPath, False)

    if expected_duration:
        tempo = duration / expected_duration
    elif duration > 57:  # Max 57s for safety margin
        tempo = duration / 57
    else:
        tempo = 1.0

    subprocess.run([
        'ffmpeg', '-loglevel', 'error',
        '-i', tempAudioPath,
        '-af', f'atempo={tempo:.5f}',
        outputFile
    ])
```

### 7.5 Audio Silence Trimming

**File:** [vendor/audio/kokoro-fastapi/api/src/services/audio.py](../../../vendor/audio/kokoro-fastapi/api/src/services/audio.py#L30-L75)

```python
class AudioNormalizer:
    def __init__(self):
        self.sample_rate = 24000
        self.chunk_trim_ms = settings.gap_trim_ms
        self.samples_to_trim = int(self.chunk_trim_ms * self.sample_rate / 1000)

    def find_first_last_non_silent(
        self,
        audio_data: np.ndarray,
        silence_threshold_db: int = -45,
    ) -> tuple[int, int]:
        """Find indices of first and last non-silent samples."""
        # Convert dBFS threshold to amplitude
        amplitude_threshold = np.iinfo(audio_data.dtype).max * (10 ** (silence_threshold_db / 20))

        # Find first non-silent sample
        non_silent_start = None
        for i in range(len(audio_data)):
            if abs(audio_data[i]) > amplitude_threshold:
                non_silent_start = i
                break

        # Find last non-silent sample
        non_silent_end = None
        for i in range(len(audio_data) - 1, -1, -1):
            if abs(audio_data[i]) > amplitude_threshold:
                non_silent_end = i
                break

        return (
            max(non_silent_start - self.samples_to_pad_start, 0),
            min(non_silent_end + samples_to_pad_end, len(audio_data))
        )
```

---

## 8. Recommendations for content-machine

### 8.1 Primary TTS Strategy

1. **Edge TTS (Default)** - Free, high quality, 300+ voices, built-in word timestamps
2. **Kokoro (Fallback)** - Local/offline, no API costs, but requires Whisper for timestamps

### 8.2 Primary ASR Strategy

1. **Edge TTS SubMaker** - When using Edge TTS, word timestamps come free
2. **Faster-Whisper** - For Kokoro or any TTS without timestamps
3. **WhisperX** - For highest accuracy word alignment (production captions)

### 8.3 Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TTS Pipeline                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  Script  │───▶│   Edge TTS      │───▶│  Audio + Subs    │   │
│  │  Text    │    │   (SubMaker)    │    │  (with timing)   │   │
│  └──────────┘    └─────────────────┘    └──────────────────┘   │
│                           │                                      │
│                           ▼ (fallback)                          │
│                  ┌─────────────────┐    ┌──────────────────┐   │
│                  │     Kokoro      │───▶│  Audio Only      │   │
│                  │    (Local)      │    │                  │   │
│                  └─────────────────┘    └──────────────────┘   │
│                           │                      │              │
│                           ▼                      ▼              │
│                  ┌─────────────────┐    ┌──────────────────┐   │
│                  │  Faster-Whisper │───▶│  Word Timestamps │   │
│                  │   (ASR)         │    │                  │   │
│                  └─────────────────┘    └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Audio Mixing                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Voice Audio ──────────────────┐                                │
│      (volume: 1.0)              │                                │
│                                 ▼                                │
│                         ┌──────────────┐                        │
│  Background Music ─────▶│ CompositeAudio │───▶ Final Audio     │
│   (volume: 0.2-0.7)     │    (Merge)     │                      │
│   (loop + fade)         └──────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Key Code Patterns to Adopt

1. **Edge TTS with SubMaker** - From MoneyPrinterTurbo
2. **@remotion/install-whisper-cpp** - From short-video-maker-gyori
3. **Audio normalization (16kHz mono)** - From FFmpeg.ts
4. **Music volume levels** - From utils.ts calculateVolume()
5. **MoviePy afx effects** - From MoneyPrinterTurbo video.py

### 8.5 Voice Selection Guidelines

| Content Type  | Recommended Voices                                         |
| ------------- | ---------------------------------------------------------- |
| Tech demos    | `en-US-BrianNeural`, `en-US-GuyNeural` (professional male) |
| Tutorials     | `en-US-JennyNeural`, `en-US-AriaNeural` (friendly female)  |
| Dramatic      | `en-US-AndrewMultilingualNeural` (dynamic range)           |
| International | Use locale-specific voices (`ja-JP`, `de-DE`, etc.)        |

---

## Appendix: Full Voice List

See [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py#L60-L290) for complete Edge TTS voice list (300+ voices).

---

**Next Steps:**

1. Create `src/audio/tts.ts` with Edge TTS + Kokoro integration
2. Create `src/audio/transcribe.ts` with Whisper integration
3. Create `src/audio/mixer.ts` for voice + music composition
4. Add to rendering pipeline in `src/render/`
