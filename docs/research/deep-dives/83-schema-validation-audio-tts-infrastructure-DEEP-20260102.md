# Deep Dive #83: Schema Validation & Audio/TTS Infrastructure

**Date:** 2026-01-02
**Category:** Schema Validation & Audio Processing
**Complexity:** Medium
**Dependencies:** DD-082 (Agent Frameworks)

---

## Executive Summary

This deep dive covers **schema validation tools** (Instructor, Zod, Pydantic) for structured LLM outputs and **audio/TTS infrastructure** (Kokoro, Kokoro-FastAPI) for voice generation. These are foundational components for content-machine's script-to-audio pipeline.

**Key Findings:**

- **Instructor:** LLM structured extraction with auto-retries, 3M+ downloads/month
- **Zod:** TypeScript-first validation, 2kb gzipped, type inference
- **Pydantic:** Python validation standard, used by OpenAI SDK, FastAPI
- **Kokoro:** Open-weight 82M TTS, Apache-licensed, multi-language
- **Kokoro-FastAPI:** Dockerized OpenAI-compatible TTS API, GPU accelerated

---

## 1. Instructor

**Repository:** vendor/schema/instructor
**Stars:** 10k+ | **Language:** Python/TypeScript | **License:** MIT

Instructor gets reliable JSON from any LLM—built on Pydantic for validation, type safety, and IDE support.

### 1.1 Core Value

| Without Instructor          | With Instructor        |
| --------------------------- | ---------------------- |
| Write JSON schemas manually | Define Pydantic models |
| Parse tool call responses   | Get validated objects  |
| Handle validation errors    | Auto-retry on failure  |
| Multi-provider code         | Single unified API     |

### 1.2 Basic Usage

```python
import instructor
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int

# Create instructor client
client = instructor.from_provider("openai/gpt-4o-mini")

# Extract structured data
user = client.chat.completions.create(
    response_model=User,
    messages=[{"role": "user", "content": "John is 25 years old"}],
)

print(user)  # User(name='John', age=25) - validated!
```

### 1.3 Multi-Provider Support

```python
# OpenAI
client = instructor.from_provider("openai/gpt-4o")

# Anthropic
client = instructor.from_provider("anthropic/claude-3-5-sonnet")

# Google
client = instructor.from_provider("google/gemini-pro")

# Ollama (local)
client = instructor.from_provider("ollama/llama3.2")

# With API keys directly
client = instructor.from_provider("openai/gpt-4o", api_key="sk-...")
```

### 1.4 Production Features

#### Automatic Retries

```python
from pydantic import BaseModel, field_validator

class VideoScript(BaseModel):
    hook: str
    body: str
    cta: str
    duration_seconds: int

    @field_validator('duration_seconds')
    def validate_duration(cls, v):
        if v < 15 or v > 60:
            raise ValueError('Duration must be 15-60 seconds')
        return v

# Auto-retries when validation fails
script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[{"role": "user", "content": "Write a TikTok script about AI"}],
    max_retries=3,  # Will retry up to 3 times
)
```

#### Streaming Partial Objects

```python
from instructor import Partial

for partial_script in client.chat.completions.create(
    response_model=Partial[VideoScript],
    messages=[{"role": "user", "content": "Write a script"}],
    stream=True,
):
    print(partial_script)
    # VideoScript(hook=None, body=None, ...)
    # VideoScript(hook="Did you know...", body=None, ...)
    # VideoScript(hook="Did you know...", body="AI is...", ...)
```

#### Nested Objects

```python
from typing import List

class Scene(BaseModel):
    description: str
    duration_seconds: float
    caption_text: str

class VideoScript(BaseModel):
    title: str
    scenes: List[Scene]
    total_duration: float

# Instructor handles nested objects automatically
script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[{"role": "user", "content": "Create a 30s video script"}],
)
```

### 1.5 content-machine Integration

| Use Case          | Implementation                    |
| ----------------- | --------------------------------- |
| Script Generation | VideoScript model with validation |
| Scene Extraction  | List[Scene] with timing           |
| Trend Analysis    | TrendResult with scoring          |
| Caption Timing    | List[CaptionSegment]              |

---

## 2. Zod

**Repository:** vendor/schema/zod
**Stars:** 35k+ | **Language:** TypeScript | **License:** MIT

Zod is TypeScript-first schema validation with static type inference—the go-to choice for TypeScript projects.

### 2.1 Key Features

| Feature               | Description                  |
| --------------------- | ---------------------------- |
| **Zero Dependencies** | No external packages         |
| **Tiny Bundle**       | 2kb gzipped core             |
| **Type Inference**    | `z.infer<>` extracts types   |
| **Immutable API**     | Methods return new instances |
| **JSON Schema**       | Built-in conversion          |

### 2.2 Basic Usage

```typescript
import * as z from 'zod';

// Define schema
const VideoScript = z.object({
  title: z.string(),
  hook: z.string().min(10).max(100),
  body: z.string(),
  cta: z.string(),
  duration: z.number().min(15).max(60),
  scenes: z.array(
    z.object({
      text: z.string(),
      duration: z.number(),
    })
  ),
});

// Infer TypeScript type
type VideoScript = z.infer<typeof VideoScript>;

// Parse and validate
const script = VideoScript.parse(inputData);
// script is now typed and validated!
```

### 2.3 Safe Parsing

```typescript
const result = VideoScript.safeParse(inputData);

if (!result.success) {
  console.error(result.error.issues);
  // [{ code: 'too_small', path: ['hook'], message: 'String must contain at least 10 character(s)' }]
} else {
  console.log(result.data);
  // Validated VideoScript
}
```

### 2.4 Transforms

```typescript
const DurationSchema = z.string().transform((val) => parseFloat(val));

type Duration = z.infer<typeof DurationSchema>;
// number (output type differs from input)
```

### 2.5 content-machine Integration

```typescript
// Video config schema (vidosy pattern)
const VideoConfig = z.object({
  title: z.string(),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']),
  fps: z.number().default(30),
  scenes: z.array(
    z.object({
      type: z.enum(['text', 'image', 'video']),
      content: z.string(),
      duration: z.number(),
      position: z
        .object({
          x: z.number(),
          y: z.number(),
        })
        .optional(),
    })
  ),
  audio: z
    .object({
      voiceover: z.string().optional(),
      music: z.string().optional(),
      volume: z.number().min(0).max(1).default(0.5),
    })
    .optional(),
});

type VideoConfig = z.infer<typeof VideoConfig>;
```

---

## 3. Pydantic

**Repository:** vendor/schema/pydantic
**Stars:** 20k+ | **Language:** Python | **License:** MIT

Pydantic is the data validation standard for Python—used by OpenAI SDK, FastAPI, LangChain, and virtually every AI framework.

### 3.1 Basic Usage

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class VideoScript(BaseModel):
    id: int
    title: str
    created_at: Optional[datetime] = None
    scenes: List[str] = []

# Automatic type coercion
data = {'id': '123', 'title': 'AI Video', 'created_at': '2024-01-01 12:00'}
script = VideoScript(**data)

print(script.id)  # 123 (int, not string)
print(script.created_at)  # datetime object
```

### 3.2 Validation

```python
from pydantic import BaseModel, Field, field_validator

class VideoScript(BaseModel):
    hook: str = Field(min_length=10, max_length=100)
    duration: int = Field(ge=15, le=60)

    @field_validator('hook')
    def hook_must_be_engaging(cls, v):
        if not any(word in v.lower() for word in ['you', 'your', 'how', 'why']):
            raise ValueError('Hook must address the viewer')
        return v
```

### 3.3 JSON Schema Generation

```python
# Generate JSON schema for LLM function calling
print(VideoScript.model_json_schema())
# {
#   "properties": {
#     "hook": {"type": "string", "minLength": 10, "maxLength": 100},
#     "duration": {"type": "integer", "minimum": 15, "maximum": 60}
#   },
#   "required": ["hook", "duration"]
# }
```

---

## 4. Kokoro TTS

**Repository:** vendor/audio/kokoro
**Stars:** 5k+ | **Language:** Python | **License:** Apache-2.0

Kokoro is an open-weight TTS model with 82 million parameters—comparable quality to larger models while being faster and cheaper.

### 4.1 Key Features

| Feature            | Description                        |
| ------------------ | ---------------------------------- |
| **82M Parameters** | Lightweight yet high-quality       |
| **Apache License** | Deploy anywhere                    |
| **Multi-Language** | EN, JP, CN, ES, FR, IT, PT, HI     |
| **GPU/CPU**        | CUDA or MPS acceleration           |
| **IPA Phonemes**   | Fine-grained pronunciation control |

### 4.2 Basic Usage

```python
!pip install kokoro soundfile
!apt-get install espeak-ng  # For phoneme fallback

from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline
pipeline = KPipeline(lang_code='a')  # 'a' = American English

# Generate audio
text = "Hello, this is Kokoro speaking."
generator = pipeline(text, voice='af_heart')

for i, (graphemes, phonemes, audio) in enumerate(generator):
    print(f"Text: {graphemes}")
    print(f"Phonemes: {phonemes}")
    sf.write(f'output_{i}.wav', audio, 24000)
```

### 4.3 Language Codes

| Code | Language            |
| ---- | ------------------- |
| `a`  | American English 🇺🇸 |
| `b`  | British English 🇬🇧  |
| `e`  | Spanish 🇪🇸          |
| `f`  | French 🇫🇷           |
| `h`  | Hindi 🇮🇳            |
| `i`  | Italian 🇮🇹          |
| `j`  | Japanese 🇯🇵         |
| `p`  | Portuguese 🇧🇷       |
| `z`  | Mandarin 🇨🇳         |

### 4.4 Voice Customization

```python
import torch

# Use custom voice tensor
voice_tensor = torch.load('custom_voice.pt', weights_only=True)
generator = pipeline(
    text,
    voice=voice_tensor,
    speed=1.2,  # Speed adjustment
    split_pattern=r'\n+'  # Split on newlines
)
```

---

## 5. Kokoro-FastAPI

**Repository:** vendor/audio/kokoro-fastapi
**Stars:** 2k+ | **Language:** Python | **License:** Apache-2.0

Dockerized FastAPI wrapper for Kokoro—OpenAI-compatible TTS endpoint with GPU acceleration.

### 5.1 Key Features

| Feature               | Description                        |
| --------------------- | ---------------------------------- |
| **OpenAI Compatible** | Drop-in replacement for OpenAI TTS |
| **GPU Accelerated**   | NVIDIA CUDA support                |
| **Voice Mixing**      | Combine voices with weights        |
| **Streaming**         | Real-time audio generation         |
| **Timestamps**        | Word-level caption timing          |
| **Multi-Format**      | MP3, WAV, OPUS, FLAC, M4A, PCM     |

### 5.2 Quick Start

```bash
# GPU deployment
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU deployment
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

### 5.3 OpenAI-Compatible API

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech (same as OpenAI API!)
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice combination!
    input="Hello world!"
) as response:
    response.stream_to_file("output.mp3")
```

### 5.4 Voice Combination

```python
import requests

# Equal mix (50/50)
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella+af_sky",
        "response_format": "mp3"
    }
)

# Weighted mix (67/33)
response = requests.post(
    "http://localhost:8880/v1/audio/speech",
    json={
        "input": "Hello world!",
        "voice": "af_bella(2)+af_sky(1)",  # 2:1 ratio
        "response_format": "mp3"
    }
)
```

### 5.5 Word-Level Timestamps

```python
import requests

response = requests.post(
    "http://localhost:8880/dev/captioned_speech",
    json={
        "model": "kokoro",
        "input": "Hello world!",
        "voice": "af_bella",
        "stream": False,
    }
)

result = response.json()
# {
#   "audio": "<base64>",
#   "timestamps": [
#     {"word": "Hello", "start": 0.0, "end": 0.5},
#     {"word": "world!", "start": 0.5, "end": 1.0}
#   ]
# }
```

### 5.6 Performance

| Metric          | GPU (4060Ti) | CPU (M3 Pro) |
| --------------- | ------------ | ------------ |
| Realtime Factor | 35x-100x     | ~5x          |
| First Token     | ~300ms       | ~1000ms      |
| Tokens/sec      | 137.67       | ~30          |

---

## 6. Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CONTENT-MACHINE PIPELINE                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  INSTRUCTOR   │     │   PYDANTIC    │     │     ZOD       │
│  (LLM Output) │     │  (Validation) │     │  (TypeScript) │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ VideoScript   │ ──▶ │ Schema        │ ◀── │ VideoConfig   │
│ TrendResult   │     │ Validation    │     │ SceneSchema   │
│ CaptionTiming │     │               │     │               │
└───────────────┘     └───────┬───────┘     └───────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  KOKORO-FASTAPI   │
                    │  (TTS Generation) │
                    ├───────────────────┤
                    │ OpenAI-compatible │
                    │ Voice mixing      │
                    │ Timestamps        │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  AUDIO OUTPUT     │
                    │  (MP3/WAV/OPUS)   │
                    │  + Timestamps     │
                    └───────────────────┘
```

---

## 7. Comparison Matrix

### 7.1 Schema Validation

| Feature             | Instructor | Pydantic   | Zod        |
| ------------------- | ---------- | ---------- | ---------- |
| **Language**        | Python     | Python     | TypeScript |
| **LLM Integration** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐     |
| **Validation**      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Type Inference**  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Auto-Retry**      | ⭐⭐⭐⭐⭐ | ❌         | ❌         |
| **Streaming**       | ⭐⭐⭐⭐⭐ | ❌         | ❌         |

### 7.2 TTS Options

| Feature          | Kokoro     | EdgeTTS  | OpenAI TTS   |
| ---------------- | ---------- | -------- | ------------ |
| **Cost**         | Free       | Free     | $15/1M chars |
| **Languages**    | 9          | 30+      | 6            |
| **Quality**      | ⭐⭐⭐⭐   | ⭐⭐⭐   | ⭐⭐⭐⭐⭐   |
| **Speed**        | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐       |
| **Voice Mixing** | ✅ Yes     | ❌ No    | ❌ No        |
| **Self-Hosted**  | ✅ Yes     | ❌ No    | ❌ No        |
| **Timestamps**   | ✅ Yes     | ❌ No    | ❌ No        |

---

## 8. Implementation Priority

### Phase 1: Schema Setup (Week 1)

1. Define Pydantic models for all pipeline data
2. Instructor integration for script generation
3. Zod schemas for Remotion configs

### Phase 2: TTS Integration (Week 2)

1. Deploy Kokoro-FastAPI (Docker)
2. Integrate with script pipeline
3. Timestamp extraction for captions

### Phase 3: Production (Week 3)

1. Voice selection UI
2. Voice mixing presets
3. Caching layer for repeated TTS

---

## 9. Key Takeaways

1. **Instructor for LLM outputs** - Auto-retry, streaming, validation
2. **Pydantic for Python validation** - Industry standard, JSON schema
3. **Zod for TypeScript** - Type inference, tiny bundle
4. **Kokoro for TTS** - Free, fast, voice mixing
5. **Kokoro-FastAPI** - OpenAI-compatible, Docker-ready
6. **Timestamps for captions** - Word-level timing from TTS
7. **Combine Instructor + Kokoro** - Structured scripts → audio

---

## Related Documents

- [DD-082: Agent Frameworks](./82-python-agent-frameworks-research-systems-DEEP-20260102.md) - PydanticAI uses Pydantic
- [DD-077: Rendering](./77-rendering-captions-composition-ecosystem-DEEP-20260102.md) - Remotion + captions
- [DD-081: MCP Ecosystem](./81-mcp-ecosystem-server-infrastructure-DEEP-20260102.md) - FastMCP for tools

---

**Document Statistics:**

- **Tools Covered:** 5 (Instructor, Zod, Pydantic, Kokoro, Kokoro-FastAPI)
- **Code Examples:** 20+
- **Architecture Diagrams:** 1
- **Comparison Tables:** 2
- **Estimated Reading Time:** 12 minutes
