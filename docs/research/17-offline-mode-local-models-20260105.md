# Research: Offline Mode for Short-Form Video Generation

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P2 (Post-MVP)

---

## Executive Summary

This document analyzes the **minimum viable offline stack** for content-machine using only local models. The goal is to enable video generation without internet connectivity by replacing cloud APIs with local alternatives.

### Key Findings

| Component | Cloud Option | Local Replacement | Storage | Notes |
|-----------|--------------|-------------------|---------|-------|
| **LLM** | OpenAI/Claude | Ollama | 4-20GB | Model-dependent |
| **TTS** | EdgeTTS | Kokoro | ~300MB | 82M params, high quality |
| **ASR** | Whisper API | whisper.cpp | 1-10GB | Model-dependent |
| **Embeddings** | OpenAI | sentence-transformers | ~100MB | all-MiniLM-L6-v2 |

**Total Estimated Storage:** 6-32GB (depending on model sizes)

---

## 1. Minimum Viable Offline Stack

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Offline Content Machine                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Ollama     │    │   Kokoro     │    │  Whisper.cpp │  │
│  │   (LLM)      │    │   (TTS)      │    │   (ASR)      │  │
│  │  localhost   │    │  localhost   │    │   local      │  │
│  │  :11434      │    │  :8880       │    │   binary     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         └───────────────────┴───────────────────┘           │
│                             │                               │
│                    ┌────────────────┐                       │
│                    │ Content Machine│                       │
│                    │   Pipeline     │                       │
│                    └────────────────┘                       │
│                             │                               │
│                    ┌────────────────┐                       │
│                    │   Remotion     │                       │
│                    │   (Render)     │                       │
│                    └────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Matrix

| Component | Local Solution | Vendor Path | Quality | Speed |
|-----------|---------------|-------------|---------|-------|
| LLM | Ollama + llama3.1:8b | `vendor/agents/langchain/libs/partners/ollama` | Good | Medium |
| TTS | Kokoro-FastAPI | `vendor/audio/kokoro-fastapi` | High | 35-100x realtime |
| ASR | @remotion/install-whisper-cpp | `vendor/captions/whisper` | Excellent | Fast |
| Embeddings | fastembed (ONNX) | `vendor/agents/llama-index/.../fastembed` | Good | Fast |

---

## 2. Ollama Integration Patterns

### 2.1 LangChain Ollama Integration

**Source:** [langchain_ollama/chat_models.py](../../../vendor/agents/langchain/libs/partners/ollama/langchain_ollama/chat_models.py)

```python
# vendor/agents/langchain/libs/partners/ollama/langchain_ollama/chat_models.py

from langchain_ollama import ChatOllama

# Basic usage - connect to local Ollama
model = ChatOllama(
    model="llama3.1:8b",
    base_url="http://localhost:11434",  # Default Ollama port
    temperature=0.7,
    num_predict=256,  # Max tokens
    num_ctx=4096,     # Context window
    validate_model_on_init=True,  # Verify model exists locally
)

# Generate response
messages = [
    ("system", "You are a short-form video script writer."),
    ("human", "Write a 30-second script about Python productivity tips."),
]
response = model.invoke(messages)
print(response.content)
```

### 2.2 Ollama with Structured Output

```python
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field

class VideoScript(BaseModel):
    """A short-form video script with scenes."""
    hook: str = Field(description="Attention-grabbing opening (3 seconds)")
    scenes: list[str] = Field(description="Main content scenes")
    cta: str = Field(description="Call to action ending")

model = ChatOllama(model="llama3.1:8b", temperature=0)
structured_model = model.with_structured_output(VideoScript)

script = structured_model.invoke(
    "Create a 30-second TikTok script about VS Code shortcuts"
)
print(script.hook)
print(script.scenes)
print(script.cta)
```

### 2.3 Ollama with Reasoning Mode

```python
from langchain_ollama import ChatOllama

# For models that support reasoning (e.g., deepseek-r1)
model = ChatOllama(
    model="deepseek-r1:8b",
    reasoning=True,  # Capture reasoning separately
)

response = model.invoke("Analyze the virality factors of this video concept...")

# Main response
print(response.content)

# Reasoning process (if available)
if "reasoning_content" in response.additional_kwargs:
    print("Reasoning:", response.additional_kwargs["reasoning_content"])
```

### 2.4 Ollama Embeddings for Local RAG

**Source:** [langchain_ollama/embeddings.py](../../../vendor/agents/langchain/libs/partners/ollama/langchain_ollama/embeddings.py)

```python
from langchain_ollama import OllamaEmbeddings

# Use Ollama for embeddings (requires embedding model)
embed = OllamaEmbeddings(
    model="nomic-embed-text",  # or "mxbai-embed-large"
    base_url="http://localhost:11434",
)

# Embed documents for similarity search
docs = ["VS Code productivity tips", "Python automation tricks"]
vectors = embed.embed_documents(docs)

# Embed query
query_vector = embed.embed_query("coding tips")
```

---

## 3. Local Embedding Alternatives

### 3.1 FastEmbed (ONNX-based, Recommended)

**Source:** [llama-index-embeddings-fastembed/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-fastembed/llama_index/embeddings/fastembed/base.py)

```python
# pip install fastembed

from llama_index.embeddings.fastembed import FastEmbedEmbedding

# Default: BAAI/bge-small-en-v1.5 (~100MB)
embed_model = FastEmbedEmbedding(
    model_name="BAAI/bge-small-en-v1.5",
    cache_dir="./models/embeddings",
    threads=4,  # ONNX threads
)

# Generate embeddings
embeddings = embed_model.get_text_embedding("VS Code shortcuts for productivity")
```

### 3.2 HuggingFace SentenceTransformers

**Source:** [llama-index-embeddings-huggingface/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-huggingface/llama_index/embeddings/huggingface/base.py)

```python
# pip install sentence-transformers

from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# all-MiniLM-L6-v2: 22M params, 384 dimensions, ~90MB
embed_model = HuggingFaceEmbedding(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    cache_folder="./models/embeddings",
    device="cpu",  # or "cuda"
    normalize=True,
)

embedding = embed_model.get_text_embedding("Python coding tips")
print(f"Dimensions: {len(embedding)}")  # 384
```

### 3.3 Embedding Model Comparison

| Model | Size | Dimensions | Speed | Quality | Use Case |
|-------|------|------------|-------|---------|----------|
| `all-MiniLM-L6-v2` | 90MB | 384 | Fast | Good | General semantic search |
| `BAAI/bge-small-en-v1.5` | 130MB | 384 | Fast | Better | RAG applications |
| `BAAI/bge-base-en-v1.5` | 440MB | 768 | Medium | Best | Production RAG |
| `nomic-embed-text` (Ollama) | 270MB | 768 | Medium | Good | Ollama ecosystem |

### 3.4 TypeScript: transformers.js for Browser/Node

```typescript
// For browser or Node.js without Python
// npm install @xenova/transformers

import { pipeline } from '@xenova/transformers';

// Initialize embedding pipeline
const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2',
  { quantized: true }  // Use quantized model (~23MB)
);

// Generate embeddings
const result = await embedder('Python coding productivity tips', {
  pooling: 'mean',
  normalize: true,
});

const embedding = Array.from(result.data);
console.log(`Dimensions: ${embedding.length}`);  // 384
```

---

## 4. Local TTS Quality Comparison

### 4.1 Kokoro (Recommended)

**Repository:** `vendor/audio/kokoro/`  
**Model:** 82M parameters  
**Output:** 24kHz audio  
**Speed:** 35-100x realtime on GPU

#### Python Usage

**Source:** [kokoro/pipeline.py](../../../vendor/audio/kokoro/kokoro/pipeline.py)

```python
# pip install kokoro soundfile
# apt-get install espeak-ng (for fallback)

from kokoro import KPipeline
import soundfile as sf

# Initialize pipeline for American English
pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')

text = """
5 VS Code shortcuts every developer needs to know.
Number one: Command Palette. Press Ctrl+Shift+P to access any command.
"""

# Generate with voice
generator = pipeline(
    text,
    voice='af_heart',  # Female voice
    speed=1.0,
    split_pattern=r'\n+',
)

# Collect audio segments
for i, result in enumerate(generator):
    print(f"Segment {i}: {result.graphemes[:50]}...")
    sf.write(f'segment_{i}.wav', result.audio, 24000)
```

#### TypeScript Usage (kokoro-js)

**Source:** [short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Kokoro.ts)

```typescript
// npm install kokoro-js

import { KokoroTTS, TextSplitterStream } from "kokoro-js";

class KokoroService {
  private tts: KokoroTTS;

  static async init(): Promise<KokoroService> {
    const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "fp32",  // or "q8", "q4" for smaller size
      device: "cpu",  // Node.js only supports CPU
    });
    return new KokoroService(tts);
  }

  async generate(text: string, voice: string = "af_heart"): Promise<ArrayBuffer> {
    const splitter = new TextSplitterStream();
    const stream = this.tts.stream(splitter, { voice });

    splitter.push(text);
    splitter.close();

    const audioBuffers: ArrayBuffer[] = [];
    for await (const audio of stream) {
      audioBuffers.push(audio.audio.toWav());
    }

    return this.concatWavBuffers(audioBuffers);
  }

  private concatWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const header = Buffer.from(buffers[0].slice(0, 44));
    let totalDataLength = 0;
    const dataParts = buffers.map((buf) => {
      const b = Buffer.from(buf);
      const data = b.slice(44);
      totalDataLength += data.length;
      return data;
    });
    header.writeUInt32LE(36 + totalDataLength, 4);
    header.writeUInt32LE(totalDataLength, 40);
    return Buffer.concat([header, ...dataParts]);
  }
}
```

### 4.2 Kokoro-FastAPI (Production API)

**Source:** [kokoro-fastapi/README.md](../../../vendor/audio/kokoro-fastapi/README.md)

```bash
# GPU deployment
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest

# CPU deployment
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

```python
# OpenAI-compatible API
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8880/v1",
    api_key="not-needed"
)

# Generate speech with streaming
with client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky+af_bella",  # Voice mixing supported
    input="Hello world!",
    response_format="mp3",
) as response:
    response.stream_to_file("output.mp3")
```

### 4.3 Piper (Alternative Local TTS)

**Note:** Piper is not currently vendored, but is referenced in research.

| Feature | Kokoro | Piper |
|---------|--------|-------|
| Model Size | 82M params (~300MB) | Variable (15-100MB per voice) |
| Languages | 9 (en, es, fr, hi, it, ja, pt, zh) | 30+ |
| Quality | Excellent | Good |
| Speed | 35-100x realtime | Fast |
| License | Apache-2.0 | MIT |
| Voice Mixing | ✅ Yes | ❌ No |
| Word Timestamps | ✅ Yes | ❌ No |

**Recommendation:** Use **Kokoro** for English content (higher quality, voice mixing, timestamps). Consider Piper for broader language support.

---

## 5. Local ASR (Whisper)

### 5.1 @remotion/install-whisper-cpp (TypeScript)

**Source:** [short-video-maker-gyori/src/short-creator/libraries/Whisper.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Whisper.ts)

```typescript
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
} from "@remotion/install-whisper-cpp";
import path from "path";

// One-time setup
async function setupWhisper(installPath: string) {
  await installWhisperCpp({
    to: installPath,
    version: "1.5.5",
    printOutput: true,
  });

  await downloadWhisperModel({
    model: "medium.en",  // English-only, good quality
    folder: path.join(installPath, "models"),
    printOutput: true,
  });
}

// Transcribe audio
async function transcribeAudio(audioPath: string): Promise<Caption[]> {
  const { transcription } = await transcribe({
    model: "medium.en",
    whisperPath: "./whisper",
    modelFolder: "./whisper/models",
    inputPath: audioPath,
    tokenLevelTimestamps: true,  // Word-level timing
  });

  return transcription.flatMap(record =>
    record.tokens
      .filter(token => !token.text.startsWith("[_TT"))
      .map(token => ({
        text: token.text,
        startMs: record.offsets.from,
        endMs: record.offsets.to,
      }))
  );
}
```

### 5.2 Python Whisper

**Source:** [whisper/README.md](../../../vendor/captions/whisper/README.md)

```python
import whisper

# Load model (auto-downloads on first use)
model = whisper.load_model("turbo")  # Fast, optimized

# Transcribe
result = model.transcribe("audio.mp3")
print(result["text"])

# With word-level timestamps
result = model.transcribe(
    "audio.mp3",
    word_timestamps=True,
)
for segment in result["segments"]:
    for word in segment.get("words", []):
        print(f"{word['start']:.2f} - {word['end']:.2f}: {word['word']}")
```

### 5.3 Whisper Model Sizes

| Model | Parameters | VRAM | English WER | Speed |
|-------|------------|------|-------------|-------|
| tiny | 39M | ~1GB | 7.6% | 10x |
| base | 74M | ~1GB | 5.8% | 7x |
| small | 244M | ~2GB | 4.3% | 4x |
| medium | 769M | ~5GB | 3.3% | 2x |
| large-v3 | 1.55B | ~10GB | 2.5% | 1x |
| turbo | 809M | ~6GB | 2.9% | 8x |

**Recommendation:** Use `turbo` for transcription (fast + accurate). Use `medium.en` for English-only with limited VRAM.

---

## 6. Storage Requirements

### 6.1 Minimum Offline Stack

| Component | Model | Size | Notes |
|-----------|-------|------|-------|
| **Ollama LLM** | llama3.1:8b | 4.7GB | Good general purpose |
| **Kokoro TTS** | Kokoro-82M | ~300MB | Auto-downloads from HF |
| **Whisper ASR** | turbo | ~1.5GB | Fast + accurate |
| **Embeddings** | all-MiniLM-L6-v2 | ~90MB | For semantic search |
| **Total** | - | **~6.6GB** | Minimum viable |

### 6.2 Production Offline Stack

| Component | Model | Size | Notes |
|-----------|-------|------|-------|
| **Ollama LLM** | llama3.1:70b-q4 | 40GB | High quality |
| **Kokoro TTS** | Kokoro-82M | ~300MB | Same |
| **Whisper ASR** | large-v3 | ~6GB | Best accuracy |
| **Embeddings** | bge-base-en-v1.5 | ~440MB | Better retrieval |
| **Total** | - | **~47GB** | Production quality |

### 6.3 Minimal Footprint (Edge/Embedded)

| Component | Model | Size | Notes |
|-----------|-------|------|-------|
| **Ollama LLM** | phi3:mini | 2.3GB | Small but capable |
| **Kokoro TTS** | Kokoro-82M (q4) | ~80MB | Quantized |
| **Whisper ASR** | tiny.en | ~150MB | English only |
| **Embeddings** | all-MiniLM-L6-v2 (q8) | ~23MB | Quantized |
| **Total** | - | **~2.5GB** | Edge deployment |

---

## 7. Implementation Recommendations

### 7.1 Phased Approach

**Phase 1 (MVP):** Cloud-first with graceful degradation
- Use EdgeTTS (free, 30+ languages)
- Use OpenAI/Claude for LLM
- Prepare abstraction layer for swap

**Phase 2 (Offline Ready):**
- Add Ollama support with model detection
- Add Kokoro-FastAPI as TTS option
- Add local Whisper transcription

**Phase 3 (Full Offline):**
- Implement offline mode toggle
- Bundle minimal models
- Add model download management

### 7.2 Abstraction Pattern

```typescript
// src/services/providers/LLMProvider.ts
interface LLMProvider {
  generate(prompt: string, options: LLMOptions): Promise<string>;
  stream(prompt: string, options: LLMOptions): AsyncGenerator<string>;
}

class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: { baseUrl?: string; model?: string }) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama3.1:8b";
  }

  async generate(prompt: string, options: LLMOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
    });
    const data = await response.json();
    return data.response;
  }
}

class OpenAIProvider implements LLMProvider {
  // ... cloud implementation
}

// Factory
function createLLMProvider(mode: "offline" | "cloud"): LLMProvider {
  if (mode === "offline") {
    return new OllamaProvider({});
  }
  return new OpenAIProvider({});
}
```

### 7.3 Health Check for Offline Mode

```typescript
async function checkOfflineReadiness(): Promise<OfflineStatus> {
  const status: OfflineStatus = {
    ollama: false,
    kokoro: false,
    whisper: false,
    embeddings: false,
  };

  // Check Ollama
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (response.ok) {
      const data = await response.json();
      status.ollama = data.models?.length > 0;
    }
  } catch {}

  // Check Kokoro
  try {
    const response = await fetch("http://localhost:8880/v1/audio/voices");
    status.kokoro = response.ok;
  } catch {}

  // Check Whisper (file-based check)
  status.whisper = fs.existsSync("./whisper/main");

  // Check embeddings (model files)
  status.embeddings = fs.existsSync("./models/embeddings");

  return status;
}
```

---

## 8. References

### Vendored Repositories

| Component | Path | License |
|-----------|------|---------|
| Kokoro | `vendor/audio/kokoro/` | Apache-2.0 |
| Kokoro-FastAPI | `vendor/audio/kokoro-fastapi/` | Apache-2.0 |
| Whisper | `vendor/captions/whisper/` | MIT |
| LangChain Ollama | `vendor/agents/langchain/libs/partners/ollama/` | MIT |
| LlamaIndex Fastembed | `vendor/agents/llama-index/.../embeddings/fastembed/` | MIT |
| short-video-maker-gyori | `vendor/short-video-maker-gyori/` | MIT |

### External Resources

- [Ollama Models Library](https://ollama.com/library)
- [Kokoro HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M)
- [sentence-transformers](https://www.sbert.net/)
- [fastembed](https://github.com/qdrant/fastembed)
- [Remotion Whisper Integration](https://www.remotion.dev/docs/install-whisper-cpp/install-whisper-cpp)

---

## Appendix: Quick Start Commands

```bash
# Install Ollama (Windows)
winget install ollama

# Pull models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Run Kokoro-FastAPI
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest

# Install Whisper (Python)
pip install openai-whisper

# Install fastembed
pip install fastembed
```

---

**Author:** Research Agent  
**Last Updated:** 2026-01-05
