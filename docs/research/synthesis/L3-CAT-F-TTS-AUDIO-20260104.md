# Layer 3 Category F: TTS & Audio

**Date:** 2026-01-04  
**Synthesized From:** 4 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 2 - Video Production

---

## Category Summary

TTS (Text-to-Speech) converts scripts to voiceovers. Key requirements: **natural voice quality**, **multi-language support**, **voice cloning**, and **zero cost**.

---

## TTS Engine Comparison

| Engine | Cost | Languages | Quality | Clone? | Local? |
|--------|------|-----------|---------|--------|--------|
| **Kokoro** | Free | English | Excellent | No | Yes |
| **EdgeTTS** | Free | 30+ | Good | No | No |
| **F5-TTS** | Free | Multi | Excellent | Yes | Yes |
| **Coqui xTTS** | Free | Multi | Excellent | Yes | Yes |
| **ElevenLabs** | $$$ | Multi | Excellent | Yes | No |
| **OpenAI TTS** | $$ | Multi | Excellent | No | No |

---

## Primary Choice: Kokoro

### Why Kokoro Wins

1. **Apache 2.0 license** - Fully open
2. **Excellent quality** - Near-commercial
3. **Fast** - Real-time on CPU
4. **Local** - No API costs
5. **OpenAI-compatible API** via Kokoro-FastAPI

### Installation

```bash
# Via pip
pip install kokoro-onnx

# Or via Docker
docker run -p 8000:8000 ghcr.io/remsky/kokoro-fastapi:latest
```

### Basic Usage

```python
from kokoro_onnx import Kokoro

kokoro = Kokoro("kokoro-v0_19.onnx", "voices.bin")

# Generate speech
samples, sample_rate = kokoro.create(
    text="Hello world! This is Kokoro TTS.",
    voice="af_heart",  # Female voice
    speed=1.0,
    lang="en-us"
)

# Save to file
import soundfile as sf
sf.write("output.wav", samples, sample_rate)
```

### Kokoro-FastAPI (OpenAI-Compatible)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"
)

response = client.audio.speech.create(
    model="kokoro",
    voice="af_heart",
    input="Hello world!",
    response_format="mp3"
)

response.stream_to_file("output.mp3")
```

### Available Voices

| Voice ID | Description |
|----------|-------------|
| `af_heart` | American Female (warm) |
| `af_alloy` | American Female (neutral) |
| `af_bella` | American Female (expressive) |
| `af_jessica` | American Female (professional) |
| `af_nova` | American Female (energetic) |
| `af_sky` | American Female (youthful) |
| `am_adam` | American Male (deep) |
| `am_echo` | American Male (clear) |
| `am_eric` | American Male (friendly) |
| `am_liam` | American Male (casual) |
| `am_michael` | American Male (authoritative) |
| `am_onyx` | American Male (warm) |
| `bf_emma` | British Female |
| `bf_isabella` | British Female |
| `bm_george` | British Male |
| `bm_lewis` | British Male |

---

## Secondary Choice: EdgeTTS

### Multi-Language Support (30+ Languages)

```python
import edge_tts
import asyncio

async def generate_speech(text: str, voice: str, output: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

# English
asyncio.run(generate_speech(
    "Hello world!",
    "en-US-GuyNeural",
    "output_en.mp3"
))

# Spanish
asyncio.run(generate_speech(
    "¡Hola mundo!",
    "es-ES-AlvaroNeural",
    "output_es.mp3"
))

# Japanese
asyncio.run(generate_speech(
    "こんにちは世界！",
    "ja-JP-NanamiNeural",
    "output_ja.mp3"
))
```

### Voice List by Language

| Language | Voices |
|----------|--------|
| English (US) | `en-US-GuyNeural`, `en-US-JennyNeural`, `en-US-AriaNeural` |
| English (UK) | `en-GB-RyanNeural`, `en-GB-SoniaNeural` |
| Spanish | `es-ES-AlvaroNeural`, `es-MX-DaliaNeural` |
| French | `fr-FR-DeniseNeural`, `fr-FR-HenriNeural` |
| German | `de-DE-ConradNeural`, `de-DE-KatjaNeural` |
| Japanese | `ja-JP-NanamiNeural`, `ja-JP-KeitaNeural` |
| Chinese | `zh-CN-XiaoxiaoNeural`, `zh-CN-YunxiNeural` |
| Korean | `ko-KR-SunHiNeural`, `ko-KR-InJoonNeural` |
| Portuguese | `pt-BR-FranciscaNeural`, `pt-PT-DuarteNeural` |
| Italian | `it-IT-ElsaNeural`, `it-IT-DiegoNeural` |

---

## Voice Cloning: F5-TTS

### Clone Any Voice

```python
from f5_tts import F5TTS

# Initialize with reference audio
tts = F5TTS(
    model="F5-TTS",
    ref_audio="samples/my_voice.wav",  # 5-8 seconds
    ref_text="Transcription of reference audio"
)

# Generate speech in cloned voice
audio = tts.synthesize(
    "This will sound like the reference voice.",
    output="cloned_output.wav"
)
```

### Requirements
- 5-8 second reference audio
- Transcription of reference
- GPU recommended

---

## Voice Cloning: Coqui xTTSv2

### Alternative Cloning Engine

```python
from TTS.api import TTS

# Load xTTS model
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Clone voice
tts.tts_to_file(
    text="Hello world!",
    speaker_wav="reference.wav",
    language="en",
    file_path="output.wav"
)
```

### Pros
- Multi-language cloning
- Open source
- Good quality

### Cons
- GPU required
- Slower than Kokoro

---

## Audio Processing

### Normalization

```python
from pydub import AudioSegment
from pydub.effects import normalize

audio = AudioSegment.from_file("input.mp3")
normalized = normalize(audio)
normalized.export("output.mp3", format="mp3")
```

### Background Music Mixing

```python
from pydub import AudioSegment

# Load tracks
narration = AudioSegment.from_file("narration.mp3")
music = AudioSegment.from_file("background.mp3")

# Lower music volume
music = music - 15  # -15 dB

# Loop music to match narration length
music = music * (len(narration) // len(music) + 1)
music = music[:len(narration)]

# Mix
mixed = narration.overlay(music)
mixed.export("final.mp3", format="mp3")
```

### Fade Effects

```python
# Fade in/out
audio = AudioSegment.from_file("input.mp3")
audio = audio.fade_in(2000)   # 2 second fade in
audio = audio.fade_out(3000)  # 3 second fade out
audio.export("output.mp3", format="mp3")
```

---

## Multi-Speaker TTS

### AI-Content-Studio Pattern

```python
# Script with speaker labels
script = [
    {"speaker": "host", "text": "Welcome to the show!"},
    {"speaker": "guest", "text": "Thanks for having me."},
    {"speaker": "host", "text": "Let's dive in."}
]

# Voice mapping
voices = {
    "host": "af_heart",    # Female host
    "guest": "am_adam"     # Male guest
}

# Generate each segment
segments = []
for part in script:
    voice = voices[part["speaker"]]
    audio = kokoro.create(part["text"], voice)
    segments.append(audio)

# Concatenate with pauses
final_audio = concatenate_with_pauses(segments, pause_ms=500)
```

---

## SSML Support (EdgeTTS)

### Control Prosody

```python
import edge_tts

ssml = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">
    <voice name="en-US-JennyNeural">
        <prosody rate="1.2" pitch="+5%">
            This is faster and higher pitched.
        </prosody>
        <break time="500ms"/>
        <emphasis level="strong">This is emphasized!</emphasis>
    </voice>
</speak>
"""

communicate = edge_tts.Communicate(ssml, voice=None)
await communicate.save("output.mp3")
```

### SSML Elements

| Element | Purpose |
|---------|---------|
| `<break>` | Pause |
| `<prosody>` | Rate, pitch, volume |
| `<emphasis>` | Stress words |
| `<say-as>` | Interpret as date, number, etc. |

---

## Integration Pattern for content-machine

### TTS Service

```typescript
// tts-service.ts
interface TTSService {
  generate(text: string, voice: string): Promise<Buffer>;
  getVoices(): Voice[];
}

// Kokoro primary, EdgeTTS fallback
class HybridTTSService implements TTSService {
  private kokoro: KokoroClient;
  private edge: EdgeTTSClient;
  
  async generate(text: string, voice: string): Promise<Buffer> {
    // Kokoro for English
    if (voice.startsWith('af_') || voice.startsWith('am_')) {
      return this.kokoro.generate(text, voice);
    }
    
    // EdgeTTS for other languages
    return this.edge.generate(text, voice);
  }
}
```

### API Endpoint

```typescript
// POST /api/tts
app.post('/api/tts', async (req, res) => {
  const { text, voice, format } = req.body;
  
  const audio = await ttsService.generate(text, voice);
  
  res.set('Content-Type', `audio/${format || 'mp3'}`);
  res.send(audio);
});
```

### Scene-Based Generation

```typescript
async function generateAudioForScenes(scenes: Scene[]): Promise<string> {
  const segments: Buffer[] = [];
  
  for (const scene of scenes) {
    const audio = await ttsService.generate(scene.text, scene.voice);
    segments.push(audio);
  }
  
  // Concatenate with pauses
  const final = concatenateAudio(segments, { pauseMs: 300 });
  
  // Save and return path
  const outputPath = `audio/${Date.now()}.mp3`;
  await fs.writeFile(outputPath, final);
  return outputPath;
}
```

---

## Cost Comparison

| Option | Cost/1M chars | Quality | Languages |
|--------|---------------|---------|-----------|
| **Kokoro** | $0 | Excellent | English |
| **EdgeTTS** | $0 | Good | 30+ |
| **F5-TTS** | $0 (GPU) | Excellent | Multi |
| **Coqui** | $0 (GPU) | Excellent | Multi |
| **OpenAI** | $15 | Excellent | Multi |
| **ElevenLabs** | $30 | Excellent | Multi |

---

## Source Documents

- DD-55: Audio + TTS + captions + publishing
- DD-60: Storage + audio + publishing + observability
- DD-83: Schema validation + audio + TTS
- connectors-publishing-audio-generators-DEEP

---

## Key Takeaway

> **Kokoro is the best free TTS for English (Apache license, excellent quality). EdgeTTS provides free 30+ language support. Use F5-TTS or Coqui xTTS for voice cloning. Combine with pydub for audio processing.**
