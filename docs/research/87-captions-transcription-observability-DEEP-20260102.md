# Deep Dive #87: Caption Transcription & Observability Infrastructure

**Date:** 2025-01-02
**Category:** ASR/Captions + LLM Observability
**Repos Analyzed:** whisper, whisperx, auto-subtitle-generator, video-subtitles-generator, langfuse, promptfoo, opentelemetry-js, sentry
**Strategic Value:** 🔴 Critical - Foundation for caption accuracy and LLM pipeline debugging

---

## Executive Summary

This deep dive covers two critical infrastructure layers for content-machine:

1. **Caption/Transcription Systems** - Word-level ASR for accurate subtitle timing
2. **LLM Observability & Evaluation** - Debugging, tracing, and testing LLM workflows

The combination of WhisperX for transcription and Langfuse for observability provides a complete solution for both caption accuracy and pipeline debugging.

---

## Part 1: Caption & Transcription Systems

### 1.1 OpenAI Whisper (Foundation)

**Repository:** `vendor/captions/whisper`
**Type:** Foundation ASR Model
**License:** MIT

**Overview:**
OpenAI Whisper is the foundational ASR (Automatic Speech Recognition) model used by virtually all caption tools in our ecosystem. It's a general-purpose speech recognition model trained on 680,000 hours of multilingual and multitask supervised data.

**Model Architecture:**

```
Audio Input → Log-Mel Spectrogram → Transformer Encoder → Transformer Decoder → Text Output
```

**Available Models:**

| Size      | Parameters | VRAM  | Speed  | Use Case                   |
| --------- | ---------- | ----- | ------ | -------------------------- |
| tiny      | 39M        | ~1GB  | 10x    | Quick prototyping          |
| base      | 74M        | ~1GB  | 7x     | Development                |
| small     | 244M       | ~2GB  | 4x     | Good balance               |
| medium    | 769M       | ~5GB  | 2x     | High accuracy              |
| large     | 1550M      | ~10GB | 1x     | Production                 |
| **turbo** | 809M       | ~6GB  | **8x** | **Production (optimized)** |

**Key Features:**

- Multilingual support (99+ languages)
- Speech translation (non-English → English)
- Language identification
- Voice activity detection
- 30-second sliding window processing

**Basic Usage:**

```python
import whisper

# Load model (turbo recommended for production)
model = whisper.load_model("turbo")

# Simple transcription
result = model.transcribe("audio.mp3")
print(result["text"])

# Result includes segments with timestamps
for segment in result["segments"]:
    print(f"[{segment['start']:.2f} - {segment['end']:.2f}] {segment['text']}")
```

**Low-Level API:**

```python
import whisper

model = whisper.load_model("turbo")

# Load and preprocess audio
audio = whisper.load_audio("audio.mp3")
audio = whisper.pad_or_trim(audio)

# Create mel spectrogram
mel = whisper.log_mel_spectrogram(audio, n_mels=model.dims.n_mels).to(model.device)

# Detect language
_, probs = model.detect_language(mel)
print(f"Detected language: {max(probs, key=probs.get)}")

# Decode with options
options = whisper.DecodingOptions()
result = whisper.decode(model, mel, options)
```

**Limitations:**

- Segment-level timestamps only (not word-level)
- No speaker diarization
- Sequential processing (not batched)
- `turbo` model doesn't support translation task

---

### 1.2 WhisperX (Word-Level + Diarization)

**Repository:** `vendor/captions/whisperx`
**Type:** Enhanced Whisper Pipeline
**Key Innovation:** Word-level timestamps + Speaker diarization

**Overview:**
WhisperX extends Whisper with three critical enhancements:

1. **Batched Inference** - 70x faster than standard Whisper
2. **Word-Level Timestamps** - Via wav2vec2 forced alignment
3. **Speaker Diarization** - Via pyannote-audio

**Architecture:**

```
Audio → faster-whisper (batch transcribe) → wav2vec2 (align) → pyannote (diarize) → Result
         │                                   │                  │
         └─ Segment timestamps               └─ Word timestamps └─ Speaker labels
```

**Installation:**

```bash
pip install whisperx
# For speaker diarization, accept HuggingFace pyannote agreement
```

**Complete Pipeline:**

```python
import whisperx

device = "cuda"
compute_type = "float16"  # or "int8" for smaller memory

# 1. Load model (uses faster-whisper backend)
model = whisperx.load_model("large-v2", device, compute_type=compute_type)

# 2. Transcribe with batching
audio = whisperx.load_audio("audio.mp3")
result = model.transcribe(audio, batch_size=16)
# result["segments"] contains segment-level timestamps

# 3. Align for word-level timestamps
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device=device
)
result = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio,
    device,
    return_char_alignments=False
)
# result["segments"] now contains word-level timestamps

# 4. Speaker diarization (optional)
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token="YOUR_HF_TOKEN",  # Requires HuggingFace token
    device=device
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
# result["segments"] now contains speaker labels
```

**Output Format:**

```python
# Each segment contains:
{
    "start": 0.0,
    "end": 2.5,
    "text": "Hello world",
    "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5, "score": 0.95},
        {"word": "world", "start": 0.7, "end": 1.2, "score": 0.92}
    ],
    "speaker": "SPEAKER_01"  # If diarization enabled
}
```

**Performance Benchmarks:**

| Feature               | Standard Whisper | WhisperX            |
| --------------------- | ---------------- | ------------------- |
| Batched inference     | No               | Yes (16-32 samples) |
| Speed (vs realtime)   | 1-5x             | **70x**             |
| Timestamp granularity | Segment          | **Word**            |
| Speaker diarization   | No               | **Yes**             |
| Memory efficiency     | Moderate         | High (int8 support) |

**Critical for Content-Machine:**

- Word-level timestamps enable precise caption animation
- Speaker diarization enables multi-person video support
- 70x speedup enables real-time processing

---

### 1.3 auto-subtitle-generator (TikTok/Instagram Style)

**Repository:** `vendor/captions/auto-subtitle-generator`
**Type:** GUI Subtitle Generator
**Key Feature:** Instagram/TikTok visual style

**Overview:**
Simple GUI application for creating Instagram/TikTok/Reels style subtitles. Uses moviepy for video editing and Whisper for transcription.

**Features:**

- Word-by-word highlighting
- Customizable colors
- Automatic timestamp reuse
- Cross-platform (Windows/macOS/Linux)

**Target Use Case:**
End-user tool for quick subtitle generation without programming.

---

### 1.4 video-subtitles-generator

**Repository:** `vendor/captions/video-subtitles-generator`
**Type:** GUI Subtitle Application
**Key Feature:** OpenAI Whisper integration

**Overview:**
Desktop application for video subtitle generation with highlighting and color customization.

**Features:**

- Word-by-word highlighting
- Customizable subtitle colors
- Timestamp reuse
- MP4/AVI/MOV format support

---

## Part 2: LLM Observability & Evaluation

### 2.1 Langfuse (LLM Observability Platform)

**Repository:** `vendor/observability/langfuse`
**Type:** Open-source LLM Engineering Platform
**License:** MIT (except `ee` folders)
**Stars:** 16,000+

**Overview:**
Langfuse is a battle-tested LLM observability platform used by applications serving 10M+ users. It provides tracing, prompt management, evaluations, and datasets for LLM applications.

**Core Features:**

| Feature               | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| **Tracing**           | Instrument app to track LLM calls, retrieval, embedding, agent actions |
| **Prompt Management** | Version control, collaborative editing, caching                        |
| **Evaluations**       | LLM-as-judge, user feedback, manual labeling, custom pipelines         |
| **Datasets**          | Test sets, benchmarks, pre-deployment testing                          |
| **Playground**        | Test prompts/model configs interactively                               |
| **API**               | OpenAPI spec, Python/JS SDKs                                           |

**Deployment Options:**

```bash
# Local (Docker Compose) - 5 minutes
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up

# Cloud: cloud.langfuse.com (free tier available)
# Self-hosted: VM, Kubernetes (Helm), AWS/Azure/GCP Terraform
```

**Integration Methods:**

| Integration   | Language      | Method                 |
| ------------- | ------------- | ---------------------- |
| SDK           | Python, JS/TS | Manual instrumentation |
| OpenAI        | Python, JS/TS | Drop-in replacement    |
| LangChain     | Python, JS/TS | Callback handler       |
| LlamaIndex    | Python        | Callback system        |
| Vercel AI SDK | JS/TS         | Built-in support       |
| LiteLLM       | Python, JS/TS | Proxy support          |

**Python SDK Usage:**

```python
from langfuse import observe
from langfuse.openai import openai  # Drop-in replacement

@observe()
def generate_script(topic: str):
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Write a video script about {topic}"}],
    ).choices[0].message.content

@observe()
def video_pipeline(topic: str):
    script = generate_script(topic)
    # ... rest of pipeline
    return script

# All LLM calls are automatically traced
result = video_pipeline("content-machine tutorial")
```

**Trace Structure:**

```
video_pipeline (trace)
├── generate_script (span)
│   └── openai.chat.completions (generation)
│       ├── model: gpt-4o
│       ├── prompt_tokens: 45
│       ├── completion_tokens: 230
│       ├── latency: 1.2s
│       └── cost: $0.003
├── transcribe_audio (span)
└── render_video (span)
```

**Prompt Management:**

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch versioned prompt
prompt = langfuse.get_prompt("video_script_prompt", version=3)

# Use in generation
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": prompt.prompt},
        {"role": "user", "content": topic}
    ]
)
```

**Evaluations:**

```python
# LLM-as-judge evaluation
@observe()
def evaluate_script(script: str):
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": f"Rate this script 1-10 for engagement:\n\n{script}"
        }]
    ).choices[0].message.content
```

**Integration with Content-Machine:**

- Trace all LLM calls (script generation, trend analysis)
- Version control prompts for different video styles
- Evaluate script quality automatically
- Debug pipeline failures with detailed traces

---

### 2.2 Promptfoo (LLM Testing & Red Teaming)

**Repository:** `vendor/observability/promptfoo`
**Type:** LLM Testing Framework
**License:** MIT
**Focus:** Evaluations + Security

**Overview:**
Promptfoo is a developer-friendly CLI tool for testing LLM applications. It supports automated evaluations, model comparison, red teaming, and CI/CD integration.

**Key Features:**

| Feature              | Description                              |
| -------------------- | ---------------------------------------- |
| **Evals**            | Test prompts with automated assertions   |
| **Red Teaming**      | Vulnerability scanning for LLM apps      |
| **Model Comparison** | Side-by-side testing of different models |
| **CI/CD**            | Integration with GitHub Actions, etc.    |
| **Code Scanning**    | PR reviews for LLM security issues       |

**Quick Start:**

```bash
# Install and initialize
npx promptfoo@latest init

# Run evaluation
npx promptfoo eval

# View results
npx promptfoo view
```

**Eval Configuration:**

```yaml
# promptfooconfig.yaml
prompts:
  - 'Write a video script about {{topic}}'

providers:
  - openai:gpt-4o
  - anthropic:claude-3-sonnet

tests:
  - vars:
      topic: 'content-machine tutorial'
    assert:
      - type: contains
        value: 'video'
      - type: llm-rubric
        value: 'The script is engaging and under 60 seconds'
```

**Red Teaming:**

```yaml
# Red team configuration
redteam:
  plugins:
    - harmful
    - prompt-injection
    - jailbreak
  strategies:
    - jailbreak
    - prompt-injection
```

**CI/CD Integration:**

```yaml
# .github/workflows/llm-eval.yml
name: LLM Evaluation
on: [push]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx promptfoo@latest eval
      - run: npx promptfoo@latest assert
```

**Integration with Langfuse:**
Promptfoo integrates directly with Langfuse for combined testing + observability:

```yaml
# promptfooconfig.yaml
providers:
  - id: openai:gpt-4o
    config:
      langfuse:
        public_key: pk-lf-...
        secret_key: sk-lf-...
```

---

### 2.3 OpenTelemetry JS (Distributed Tracing)

**Repository:** `vendor/observability/opentelemetry-js`
**Type:** Observability Framework
**License:** Apache 2.0
**Focus:** Traces, Metrics, Logs (standard spec)

**Overview:**
OpenTelemetry is the industry-standard framework for collecting telemetry data (traces, metrics, logs) from applications. It provides vendor-neutral instrumentation.

**Supported Signals:**

| Signal  | Status      |
| ------- | ----------- |
| Tracing | Stable      |
| Metrics | Stable      |
| Logs    | Development |

**Installation:**

```bash
npm install @opentelemetry/api
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
```

**Setup:**

```javascript
// tracing.js
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new opentelemetry.NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'content-machine',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .finally(() => process.exit(0));
});
```

**Run Application:**

```bash
node -r ./tracing.js app.js
```

**Runtime Support:**

| Platform   | Supported    |
| ---------- | ------------ |
| Node.js 22 | ✅           |
| Node.js 20 | ✅           |
| Node.js 18 | ✅           |
| Browsers   | Experimental |

**Use in Content-Machine:**

- Trace video rendering pipeline
- Monitor capture service latency
- Track queue processing metrics
- Export to Jaeger/Grafana/etc.

---

### 2.4 Sentry (Error Tracking)

**Repository:** `vendor/observability/sentry`
**Type:** Error & Performance Monitoring
**Focus:** Debugging, Issue Detection

**Overview:**
Sentry is a debugging platform that helps detect, trace, and fix issues. It provides error tracking, performance monitoring, session replays, and more.

**Key Features:**

- Issue detection & grouping
- Stack traces with source context
- AI-powered issue analysis (Seer)
- Session replays
- Performance insights
- Distributed tracing
- Uptime monitoring

**SDK Support:**

| Language     | SDK                 |
| ------------ | ------------------- |
| JavaScript   | sentry-javascript   |
| Python       | sentry-python       |
| Go           | sentry-go           |
| Rust         | sentry-rust         |
| Ruby         | sentry-ruby         |
| PHP          | sentry-php          |
| C#           | sentry-dotnet       |
| Java/Kotlin  | sentry-java         |
| Swift        | sentry-cocoa        |
| React Native | sentry-react-native |

**JavaScript Setup:**

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'https://your-dsn@sentry.io/project',
  tracesSampleRate: 1.0,
});

// Automatic error capture
try {
  renderVideo();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

**Use in Content-Machine:**

- Capture rendering errors with context
- Monitor production pipeline health
- Track performance regressions
- AI-assisted debugging

---

## Recommended Stack for Content-Machine

### Caption/Transcription Layer

| Use Case                  | Primary Tool         | Fallback               |
| ------------------------- | -------------------- | ---------------------- |
| **Fast transcription**    | WhisperX (70x speed) | faster-whisper         |
| **Word-level timestamps** | WhisperX (wav2vec2)  | Whisper + post-process |
| **Speaker diarization**   | WhisperX (pyannote)  | pyannote standalone    |
| **Translation**           | Whisper medium/large | DeepL API              |

### Observability Layer

| Use Case                | Primary Tool       | Fallback           |
| ----------------------- | ------------------ | ------------------ |
| **LLM Tracing**         | Langfuse           | OpenTelemetry      |
| **Prompt Testing**      | Promptfoo          | Langfuse evals     |
| **Error Tracking**      | Sentry             | Langfuse + logging |
| **Distributed Tracing** | OpenTelemetry      | Sentry performance |
| **LLM Security**        | Promptfoo red team | Manual testing     |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content-Machine Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Capture    │    │   Script     │    │   Render     │      │
│  │  (Playwright)│───▶│  (LLM Agent) │───▶│  (Remotion)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   │               │
│  ┌──────▼──────────────────▼───────────────────▼──────────┐    │
│  │                    WhisperX                             │    │
│  │    Audio → Transcription → Word Alignment → Speakers   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Observability Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Langfuse   │    │  Promptfoo   │    │   Sentry     │      │
│  │  LLM Tracing │    │  LLM Testing │    │Error Tracking│      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                   │
│                    OpenTelemetry                                │
│              (Unified telemetry export)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Patterns

### WhisperX Caption Pipeline

```python
import whisperx
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class CaptionWord:
    text: str
    start: float
    end: float
    score: float
    speaker: Optional[str] = None

@dataclass
class CaptionSegment:
    text: str
    start: float
    end: float
    words: List[CaptionWord]
    speaker: Optional[str] = None

class CaptionPipeline:
    def __init__(
        self,
        model_size: str = "large-v2",
        device: str = "cuda",
        compute_type: str = "float16",
        enable_diarization: bool = True,
        hf_token: Optional[str] = None
    ):
        self.device = device
        self.enable_diarization = enable_diarization

        # Load transcription model
        self.model = whisperx.load_model(
            model_size, device, compute_type=compute_type
        )

        # Load alignment model (lazy loaded per language)
        self.align_models = {}

        # Load diarization model if enabled
        if enable_diarization and hf_token:
            self.diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=hf_token, device=device
            )
        else:
            self.diarize_model = None

    def transcribe(self, audio_path: str, batch_size: int = 16) -> List[CaptionSegment]:
        # Load audio
        audio = whisperx.load_audio(audio_path)

        # Step 1: Transcribe
        result = self.model.transcribe(audio, batch_size=batch_size)
        language = result["language"]

        # Step 2: Align for word-level timestamps
        if language not in self.align_models:
            model_a, metadata = whisperx.load_align_model(
                language_code=language, device=self.device
            )
            self.align_models[language] = (model_a, metadata)

        model_a, metadata = self.align_models[language]
        result = whisperx.align(
            result["segments"], model_a, metadata, audio, self.device
        )

        # Step 3: Diarize if enabled
        if self.diarize_model:
            diarize_segments = self.diarize_model(audio)
            result = whisperx.assign_word_speakers(diarize_segments, result)

        # Convert to dataclass format
        segments = []
        for seg in result["segments"]:
            words = [
                CaptionWord(
                    text=w.get("word", ""),
                    start=w.get("start", 0),
                    end=w.get("end", 0),
                    score=w.get("score", 0),
                    speaker=w.get("speaker")
                )
                for w in seg.get("words", [])
            ]
            segments.append(CaptionSegment(
                text=seg.get("text", ""),
                start=seg.get("start", 0),
                end=seg.get("end", 0),
                words=words,
                speaker=seg.get("speaker")
            ))

        return segments
```

### Langfuse Integration Pattern

```typescript
// observability.ts
import { Langfuse, observeOpenAI } from 'langfuse';
import OpenAI from 'openai';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Wrap OpenAI for automatic tracing
const openai = observeOpenAI(new OpenAI(), { client: langfuse });

export async function generateScript(topic: string, style: string): Promise<string> {
  const trace = langfuse.trace({
    name: 'generate_script',
    metadata: { topic, style },
  });

  try {
    // Get versioned prompt
    const prompt = await langfuse.getPrompt('video_script');

    const generation = trace.generation({
      name: 'script_generation',
      model: 'gpt-4o',
      input: { topic, style },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.prompt },
        { role: 'user', content: `Topic: ${topic}\nStyle: ${style}` },
      ],
    });

    const script = response.choices[0].message.content!;

    generation.end({
      output: script,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
    });

    trace.update({ output: script });
    return script;
  } catch (error) {
    trace.update({
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
      level: 'ERROR',
    });
    throw error;
  } finally {
    await langfuse.flushAsync();
  }
}
```

### Promptfoo Eval Config

```yaml
# promptfooconfig.yaml
description: Content-Machine Script Evaluation

prompts:
  - id: video_script_v1
    label: 'Basic Script'
    raw: |
      Write a 30-second video script about {{topic}}.
      Style: {{style}}

  - id: video_script_v2
    label: 'Enhanced Script'
    raw: |
      Create an engaging 30-second video script about {{topic}}.
      Style: {{style}}
      Requirements:
      - Hook in first 3 seconds
      - Clear call to action
      - Product demonstration included

providers:
  - id: openai:gpt-4o
  - id: openai:gpt-4o-mini
  - id: anthropic:claude-3-5-sonnet

tests:
  - vars:
      topic: 'VS Code extensions'
      style: 'educational'
    assert:
      - type: contains-any
        value: ['extension', 'VS Code', 'Visual Studio']
      - type: llm-rubric
        value: 'Script has a clear hook in the first sentence'
      - type: llm-rubric
        value: 'Script is under 150 words for 30-second delivery'
      - type: javascript
        value: output.length < 800

  - vars:
      topic: 'GitHub Copilot'
      style: 'promotional'
    assert:
      - type: contains
        value: 'Copilot'
      - type: llm-rubric
        value: 'Script highlights key benefits'
      - type: not-contains
        value: ['competitor', 'alternative']

# Red team tests
redteam:
  purpose: "Ensure video scripts don't contain harmful content"
  plugins:
    - harmful
    - contracts
  strategies:
    - jailbreak
```

---

## Key Insights

### 1. WhisperX is Essential for Caption Quality

- Standard Whisper only provides segment-level timestamps
- Word-level alignment via wav2vec2 enables smooth caption animation
- 70x speedup makes real-time processing feasible
- Speaker diarization enables multi-person video support

### 2. Langfuse vs OpenTelemetry

- **Langfuse**: Purpose-built for LLM apps (prompt management, evals, cost tracking)
- **OpenTelemetry**: General-purpose (HTTP traces, metrics, vendor-neutral)
- **Recommendation**: Use Langfuse for LLM-specific observability, OpenTelemetry for infrastructure

### 3. Promptfoo for CI/CD LLM Testing

- Red teaming catches prompt injection vulnerabilities
- Automated evals prevent quality regressions
- Model comparison helps choose cost-effective options
- Integrates with Langfuse for combined testing + production monitoring

### 4. Error Tracking is Critical

- Video pipelines have many failure points (API limits, rendering errors, encoding issues)
- Sentry provides context-rich error reports
- AI-assisted debugging accelerates resolution

---

## Recommendations for Content-Machine

### Immediate Actions

1. **Caption Pipeline**
   - Implement WhisperX-based transcription service
   - Cache alignment models per language
   - Export word-level timestamps to Remotion captions

2. **LLM Observability**
   - Deploy Langfuse (Docker Compose for dev)
   - Wrap all LLM calls with `@observe()` decorator
   - Create prompt library with version control

3. **Testing**
   - Set up Promptfoo eval suite for script prompts
   - Add red team tests for content safety
   - Integrate with CI/CD pipeline

4. **Error Tracking**
   - Add Sentry to render service
   - Configure source maps for stack traces
   - Set up alerts for production errors

### Architecture Decision

```
Caption Layer: WhisperX (word-level + diarization)
LLM Tracing: Langfuse (purpose-built for LLM)
LLM Testing: Promptfoo (evals + red team)
Error Tracking: Sentry (production debugging)
Metrics Export: OpenTelemetry (vendor-neutral)
```

---

## References

- [OpenAI Whisper Paper](https://arxiv.org/abs/2212.04356)
- [WhisperX: Time-Accurate Speech Transcription](https://github.com/m-bain/whisperX)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Promptfoo Getting Started](https://www.promptfoo.dev/docs/getting-started/)
- [OpenTelemetry JS Guide](https://opentelemetry.io/docs/languages/js/getting-started/)
- [Sentry Documentation](https://docs.sentry.io/)

---

**Document Status:** Complete
**Next Steps:** DD-088 - Explore remaining vendor directories
