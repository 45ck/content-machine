# RQ-20: Minimal Offline Mode with Ollama + Piper

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P2  
**Question:** What's the minimal offline mode using local models?

---

## 1. Problem Statement

Some users may need to operate without network access:
- Air-gapped environments
- Privacy requirements
- Cost sensitivity
- Unreliable internet

We need to identify which components can run locally.

---

## 2. Offline Stack Options

### 2.1 Minimum Viable Offline Stack (~6.6GB)

| Component | Online | Offline Alternative | Storage |
|-----------|--------|---------------------|---------|
| **LLM** | OpenAI/Anthropic | Ollama + llama3.1:8b | 4.7GB |
| **TTS** | Edge TTS | Kokoro-82M | ~300MB |
| **ASR** | WhisperX (cloud) | whisper.cpp (local) | ~1.5GB |
| **Embeddings** | OpenAI | all-MiniLM-L6-v2 | ~90MB |
| **Stock Footage** | Pexels | User-provided only | N/A |

### 2.2 Storage Profiles

| Profile | LLM | TTS | ASR | Embeddings | **Total** |
|---------|-----|-----|-----|------------|-----------|
| **Edge** | phi3:mini (2.3GB) | Kokoro q4 (80MB) | tiny.en (150MB) | MiniLM q8 (23MB) | **~2.5GB** |
| **Standard** | llama3.1:8b (4.7GB) | Kokoro (300MB) | medium.en (1.5GB) | MiniLM (90MB) | **~6.6GB** |
| **Quality** | llama3.1:70b-q4 (40GB) | Kokoro (300MB) | large-v3 (6GB) | bge-base (440MB) | **~47GB** |

---

## 3. Vendor Evidence

### 3.1 Ollama Integration

**Source:** [vendor/agents/langchain](../../../vendor/agents/langchain) via langchain_ollama

```typescript
import { Ollama } from '@langchain/community/llms/ollama';

const llm = new Ollama({
  model: 'llama3.1:8b',
  baseUrl: 'http://localhost:11434',
  temperature: 0.7,
});

// Structured output
const structuredLlm = llm.withStructuredOutput(ScriptSchema);
const script = await structuredLlm.invoke(prompt);
```

**Model installation:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1:8b       # 4.7GB, good quality
ollama pull phi3:mini         # 2.3GB, fast/small
ollama pull deepseek-r1:8b    # Reasoning model
```

### 3.2 Kokoro Local TTS

**Source:** [vendor/audio/kokoro](../../../vendor/audio/kokoro)

```typescript
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained(
  "onnx-community/Kokoro-82M-v1.0-ONNX",
  { dtype: "q8" }  // Quantized for smaller size
);

const audio = await tts.generate(text, {
  voice: "af_heart",
  speed: 1.0,
});

await audio.save("output.wav");
```

**Features:**
- 9 languages supported
- Voice mixing (blend multiple voices)
- Timestamps available (for captions)
- ~300MB model size

### 3.3 Local Whisper via Remotion

**Source:** [vendor/remotion/packages/install-whisper-cpp](../../../vendor/remotion/packages/install-whisper-cpp)

```typescript
import { installWhisperCpp, transcribe } from "@remotion/install-whisper-cpp";

// One-time installation
await installWhisperCpp({
  to: "./whisper",
  version: "1.7.4",
});

// Download model
await downloadWhisperModel({
  model: "medium.en",  // Options: tiny, base, small, medium, large
  destination: "./whisper/models",
});

// Transcribe
const result = await transcribe({
  inputPath: audioPath,
  model: "medium.en",
  tokenLevelTimestamps: true,
  whisperPath: "./whisper",
});
```

### 3.4 Local Embeddings

**Option A: transformers.js (TypeScript native)**

```typescript
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

async function embed(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map(async (text) => {
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    })
  );
  return results;
}
```

**Option B: FastEmbed (Python, faster)**

```python
from fastembed import TextEmbedding

model = TextEmbedding("BAAI/bge-small-en-v1.5")
embeddings = list(model.embed(["text1", "text2"]))
```

---

## 4. Recommended Implementation

### 4.1 Offline Configuration

```typescript
// ~/.cmrc.json offline profile
{
  "profile": "offline",
  "llm": {
    "default": {
      "provider": "ollama",
      "model": "llama3.1:8b",
      "baseUrl": "http://localhost:11434"
    }
  },
  "embedding": {
    "provider": "local",
    "model": "all-MiniLM-L6-v2"
  },
  "commands": {
    "audio": {
      "ttsEngine": "kokoro",
      "asrEngine": "whisper-cpp"
    },
    "visuals": {
      "stockApis": []  // No stock footage in offline mode
    }
  }
}
```

### 4.2 Provider Abstraction with Offline Support

```typescript
interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  isAvailable(): Promise<boolean>;
}

class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: { baseUrl: string; model: string }) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.some((m: any) => m.name === this.model);
    } catch {
      return false;
    }
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        options: {
          temperature: options?.temperature ?? 0.7,
        },
        format: options?.jsonMode ? 'json' : undefined,
      }),
    });

    const data = await response.json();
    return {
      content: data.message.content,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
      },
    };
  }
}
```

### 4.3 Local Embedding Provider

```typescript
import { pipeline, Pipeline } from '@xenova/transformers';

class LocalEmbeddingProvider {
  private embedder: Pipeline | null = null;
  private modelName: string;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
  }

  async init(): Promise<void> {
    this.embedder = await pipeline('feature-extraction', this.modelName);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.embedder) await this.init();

    return Promise.all(
      texts.map(async (text) => {
        const output = await this.embedder!(text, {
          pooling: 'mean',
          normalize: true,
        });
        return Array.from(output.data);
      })
    );
  }
}
```

### 4.4 Offline Setup Command

```typescript
async function setupOffline(): Promise<void> {
  console.log('Setting up offline mode...\n');

  // 1. Check Ollama
  console.log('Checking Ollama...');
  const ollamaAvailable = await checkOllama();
  if (!ollamaAvailable) {
    console.log('  ❌ Ollama not running. Start with: ollama serve');
    console.log('  Then install model: ollama pull llama3.1:8b');
  } else {
    console.log('  ✓ Ollama running');
    
    // Check model
    const modelAvailable = await checkOllamaModel('llama3.1:8b');
    if (!modelAvailable) {
      console.log('  ⏳ Downloading model...');
      await execAsync('ollama pull llama3.1:8b');
    }
    console.log('  ✓ Model ready');
  }

  // 2. Install whisper.cpp
  console.log('\nSetting up whisper.cpp...');
  await installWhisperCpp({ to: './whisper', version: '1.7.4' });
  console.log('  ✓ whisper.cpp installed');

  // Download whisper model
  console.log('  ⏳ Downloading whisper model...');
  await downloadWhisperModel({ model: 'medium.en', destination: './whisper/models' });
  console.log('  ✓ Whisper model ready');

  // 3. Pre-cache Kokoro model
  console.log('\nSetting up Kokoro TTS...');
  await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX');
  console.log('  ✓ Kokoro ready');

  // 4. Pre-cache embedding model
  console.log('\nSetting up local embeddings...');
  await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('  ✓ Embeddings ready');

  console.log('\n✓ Offline mode ready!');
  console.log('  Total storage: ~6.6GB');
  console.log('  Run with: cm --profile offline');
}
```

---

## 5. Limitations of Offline Mode

| Feature | Online | Offline |
|---------|--------|---------|
| Script quality | GPT-4o level | LLaMA 8B level (good, not great) |
| TTS languages | 30+ (Edge TTS) | 9 (Kokoro) |
| ASR speed | 70x realtime (WhisperX) | 10x realtime (whisper.cpp) |
| Stock footage | ✓ (Pexels) | ❌ (user-provided only) |
| Embedding quality | text-embedding-3 | MiniLM (slightly lower) |

---

## 6. Implementation Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Offline by default | No | Most users have internet |
| Setup command | `cm setup --offline` | One-time download |
| Profile switching | `--profile offline` | Easy toggle |
| Stock footage | Require user-provided | No free offline alternative |
| Model storage | `~/.cm/models/` | Shared across projects |

---

## 7. References

- [Ollama](https://ollama.com/) — Local LLM runner
- [vendor/audio/kokoro](../../../vendor/audio/kokoro) — Local TTS
- [vendor/remotion/packages/install-whisper-cpp](../../../vendor/remotion/packages/install-whisper-cpp) — Local ASR
- [transformers.js](https://huggingface.co/docs/transformers.js) — Local embeddings
- [vendor/audio/piper](../../../vendor/audio/piper) — Alternative local TTS
