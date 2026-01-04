# Deep Dive #59: Research Agents, Schema Validation & Caption Infrastructure
**Date:** 2026-01-02  
**Category:** Research, Validation, ASR/Captions  
**Status:** Complete  
**Priority:** High - Intelligence & Data Quality Layer  

---

## Executive Summary

This deep dive documents the research agent frameworks, schema validation libraries, and caption/ASR infrastructure in content-machine's vendored repositories. These components form the intelligence and data quality layer of the video generation pipeline.

**Key Findings:**
1. **GPT Researcher + Open Deep Research** provide production-ready research agents
2. **Instructor** enables reliable structured outputs from any LLM
3. **WhisperX** provides 70x realtime ASR with word-level timestamps
4. **Zod (TypeScript) + Pydantic (Python)** form the schema validation backbone
5. **Force alignment** critical for professional subtitle timing

---

## Part 1: Research Agent Frameworks

### 1.1 GPT Researcher

**Location:** `vendor/research/gpt-researcher`  
**Language:** Python  
**License:** MIT  
**Stars:** 16k+  

**Core Concept:** Autonomous research agent that produces detailed, factual, unbiased reports with citations.

**Architecture:**
```
Research Query
      ↓
Task-Specific Agent
      ↓
Question Generation (5-10 questions)
      ↓
Parallel Crawling (20+ sources per question)
      ↓
Source Summarization + Tracking
      ↓
Filter + Aggregate
      ↓
Final Research Report (2000+ words)
```

**Key Features:**
- 📝 Reports > 2,000 words with citations
- 🌐 20+ sources aggregated
- 🖼️ Smart image scraping
- 📂 Memory/context preservation
- 📄 Export to PDF, Word, Markdown
- 🔍 JavaScript-enabled scraping

**Why GPT Researcher?**
- Manual research takes weeks
- LLMs hallucinate on current events
- Token limits prevent long reports
- Limited sources = bias

**Integration Pattern:**
```python
from gpt_researcher import GPTResearcher

async def research_trend(topic: str) -> dict:
    """Research a trending topic for video content."""
    researcher = GPTResearcher(
        query=f"Latest developments in {topic} for tech content creators",
        report_type="research_report",
        source_urls=[]  # Auto-search
    )
    
    # Conduct research (5-10 minutes)
    report = await researcher.conduct_research()
    
    # Get structured data
    sources = researcher.get_source_urls()
    context = researcher.get_research_context()
    
    return {
        "report": report,
        "sources": sources,
        "context": context
    }
```

**content-machine Relevance:**
- Research phase of content pipeline
- Fact-checking for product-truthful videos
- Source gathering for citations in video descriptions
- Trend analysis for content planning

---

### 1.2 Open Deep Research

**Location:** `vendor/research/open-deep-research`  
**Language:** Python  
**License:** MIT  
**Creator:** LangChain  

**Core Concept:** Configurable deep research agent with model/search provider flexibility.

**Architecture:**
```
Research Query
      ↓
Summarization Model (gpt-4.1-mini)
      ↓
Research Model (gpt-4.1)
      ↓
Search Agent (Tavily/MCP/Native)
      ↓
Compression Model (gpt-4.1)
      ↓
Final Report Model (gpt-4.1)
```

**Key Differentiators:**
- **Multi-Model:** Different models for different stages
- **MCP Compatible:** Native MCP server support
- **Benchmarked:** #6 on Deep Research Bench
- **LangGraph Studio:** Visual debugging

**Configuration:**
```python
# .env configuration
SUMMARIZATION_MODEL=openai:gpt-4.1-mini
RESEARCH_MODEL=anthropic:claude-sonnet-4-0
COMPRESSION_MODEL=openai:gpt-4.1
FINAL_REPORT_MODEL=openai:gpt-4.1
SEARCH_API=tavily  # or mcp, openai_websearch, anthropic_websearch
```

**LangGraph Integration:**
```python
from open_deep_research import create_research_graph

# Create the research graph
graph = create_research_graph()

# Run research
result = await graph.ainvoke({
    "messages": [{"role": "user", "content": "Research AI coding tools trends 2026"}]
})

report = result["final_report"]
```

**content-machine Relevance:**
- LangGraph-native research integration
- Configurable model selection
- MCP server compatibility
- Production-ready evaluation framework

---

## Part 2: Schema Validation Infrastructure

### 2.1 Instructor - Structured LLM Outputs

**Location:** `vendor/schema/instructor`  
**Language:** Python  
**License:** MIT  
**Stars:** 8k+  

**Core Concept:** Get reliable JSON from any LLM using Pydantic validation.

**Key Benefits:**
- **No JSON parsing:** Automatic extraction
- **Type safety:** Pydantic models
- **Automatic retries:** Validation errors trigger re-prompts
- **Multi-provider:** OpenAI, Anthropic, Gemini, Mistral, etc.

**Basic Pattern:**
```python
import instructor
from pydantic import BaseModel, Field

class VideoScript(BaseModel):
    """Structured video script output."""
    title: str = Field(description="Catchy title for the video")
    hook: str = Field(description="Opening hook (3 seconds)")
    body: list[str] = Field(description="Main content points")
    cta: str = Field(description="Call to action")
    duration_seconds: int = Field(ge=15, le=60)

client = instructor.from_provider("openai/gpt-4o")

script = client.chat.completions.create(
    response_model=VideoScript,
    messages=[
        {"role": "user", "content": "Create a script about Python tips"}
    ],
)

print(script.title)  # "5 Python Tips You Need to Know"
print(script.hook)   # "Stop writing slow Python code..."
```

**Advanced Pattern - Iterable Outputs:**
```python
from instructor import Iterable

class Scene(BaseModel):
    description: str
    duration_seconds: int
    visual_type: str  # "capture", "stock", "text"

# Stream scenes as they're generated
for scene in client.chat.completions.create(
    response_model=Iterable[Scene],
    messages=[{"role": "user", "content": "Break down this script into scenes"}],
    stream=True,
):
    print(f"Scene: {scene.description} ({scene.duration_seconds}s)")
    process_scene(scene)
```

**Retry Pattern:**
```python
from instructor import Maybe

class ContentReview(BaseModel):
    approved: bool
    issues: list[str] = []
    suggestions: list[str] = []

# Maybe wrapper handles extraction failures gracefully
result = client.chat.completions.create(
    response_model=Maybe[ContentReview],
    messages=[{"role": "user", "content": review_content}],
    max_retries=3,  # Retry up to 3 times on validation failure
)

if result.result:
    review = result.result
else:
    print(f"Extraction failed: {result.error}")
```

**content-machine Relevance:**
- Script generation with guaranteed structure
- Scene breakdown with validation
- Review outputs with approval flags
- Multi-provider LLM support

---

### 2.2 Zod - TypeScript Schema Validation

**Location:** `vendor/schema/zod`  
**Language:** TypeScript  
**License:** MIT  
**Stars:** 35k+  

**Core Concept:** TypeScript-first schema validation with static type inference.

**Key Features:**
- Zero dependencies
- Works in Node.js and browsers
- Static type inference from schemas
- Composable and chainable

**Video Pipeline Schemas:**
```typescript
import { z } from 'zod';

// Scene schema
const SceneSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(10),
  duration_ms: z.number().int().min(1000).max(60000),
  visual_type: z.enum(['capture', 'stock', 'text', 'animation']),
  audio_type: z.enum(['narration', 'music', 'sfx', 'silent']),
  captions: z.array(z.object({
    text: z.string(),
    start_ms: z.number(),
    end_ms: z.number(),
  })).optional(),
});

// Video project schema
const VideoProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(100),
  description: z.string().max(5000),
  platform: z.enum(['tiktok', 'youtube_shorts', 'instagram_reels']),
  resolution: z.object({
    width: z.literal(1080),
    height: z.literal(1920),
  }),
  fps: z.union([z.literal(30), z.literal(60)]),
  scenes: z.array(SceneSchema).min(1),
  created_at: z.string().datetime(),
});

// Type inference
type Scene = z.infer<typeof SceneSchema>;
type VideoProject = z.infer<typeof VideoProjectSchema>;

// Validation
const project = VideoProjectSchema.parse(rawData);  // Throws on invalid
const result = VideoProjectSchema.safeParse(rawData);  // Returns result object
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

**Integration with OpenAI Agents SDK:**
```typescript
import { z } from 'zod';
import { Agent, tool } from '@openai/agents';

const scriptTool = tool({
  name: 'generate_script',
  description: 'Generate a video script',
  parameters: z.object({
    topic: z.string(),
    duration: z.number().min(15).max(60),
    style: z.enum(['educational', 'entertaining', 'promotional']),
  }),
  execute: async (input) => {
    return await generateScript(input);
  },
});
```

**content-machine Relevance:**
- TypeScript-native schema definitions
- MCP tool parameter validation
- Video project configuration validation
- API request/response validation

---

### 2.3 Pydantic - Python Data Validation

**Location:** `vendor/schema/pydantic`  
**Language:** Python  
**License:** MIT  
**Stars:** 22k+  

**Core Concept:** Data validation using Python type hints.

**Key Features:**
- Type coercion
- Detailed validation errors
- JSON Schema generation
- Dataclass compatibility

**Video Pipeline Models:**
```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal
from datetime import datetime
from uuid import UUID

class Caption(BaseModel):
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    
    @field_validator('end_ms')
    def end_after_start(cls, v, values):
        if 'start_ms' in values.data and v <= values.data['start_ms']:
            raise ValueError('end_ms must be greater than start_ms')
        return v

class Scene(BaseModel):
    id: UUID
    description: str = Field(min_length=10)
    duration_ms: int = Field(ge=1000, le=60000)
    visual_type: Literal['capture', 'stock', 'text', 'animation']
    audio_type: Literal['narration', 'music', 'sfx', 'silent']
    captions: list[Caption] = []

class VideoProject(BaseModel):
    id: UUID
    title: str = Field(min_length=5, max_length=100)
    platform: Literal['tiktok', 'youtube_shorts', 'instagram_reels']
    resolution: tuple[int, int] = (1080, 1920)
    fps: Literal[30, 60] = 30
    scenes: list[Scene] = Field(min_length=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        'json_schema_extra': {
            'examples': [
                {
                    'title': 'AI Tools Review',
                    'platform': 'tiktok',
                    'scenes': [...]
                }
            ]
        }
    }
```

**JSON Schema Export:**
```python
# Generate JSON Schema for MCP/API documentation
schema = VideoProject.model_json_schema()
print(json.dumps(schema, indent=2))
```

---

## Part 3: Caption & ASR Infrastructure

### 3.1 WhisperX - Fast ASR with Word Timestamps

**Location:** `vendor/captions/whisperx`  
**Language:** Python  
**License:** BSD  
**Stars:** 13k+  

**Core Concept:** 70x realtime transcription with word-level timestamps and speaker diarization.

**Architecture:**
```
Audio Input
      ↓
VAD Preprocessing (pyannote)
      ↓
Batched Whisper (faster-whisper)
      ↓
Phoneme Alignment (wav2vec2)
      ↓
Speaker Diarization (pyannote)
      ↓
Word-Level Timestamps + Speaker IDs
```

**Key Features:**
- ⚡ 70x realtime with large-v2
- 🪶 <8GB GPU memory
- 🎯 Word-level timestamps
- 👯 Speaker diarization
- 🗣️ VAD preprocessing (reduces hallucination)

**Basic Usage:**
```python
import whisperx

# Load model
device = "cuda"
compute_type = "float16"
model = whisperx.load_model("large-v2", device, compute_type=compute_type)

# Transcribe with batching
audio = whisperx.load_audio("video.mp4")
result = model.transcribe(audio, batch_size=16)

# Load alignment model
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device=device
)

# Align for word-level timestamps
aligned = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio,
    device
)

# Print word-level results
for segment in aligned["segments"]:
    for word in segment["words"]:
        print(f"{word['start']:.2f} - {word['end']:.2f}: {word['word']}")
```

**Speaker Diarization:**
```python
# Load diarization model (requires HuggingFace token)
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token="YOUR_HF_TOKEN",
    device=device
)

# Diarize
diarize_segments = diarize_model(audio)

# Assign speakers to transcript
result = whisperx.assign_word_speakers(diarize_segments, aligned)

for segment in result["segments"]:
    speaker = segment.get("speaker", "UNKNOWN")
    print(f"[{speaker}] {segment['text']}")
```

**content-machine Relevance:**
- Primary ASR for video captioning
- Word-level timestamps for animated captions
- Speaker diarization for interview content
- VAD for cleaner transcripts

---

### 3.2 Whisper (OpenAI)

**Location:** `vendor/captions/whisper`  
**Language:** Python  
**License:** MIT  

**Core Concept:** Original OpenAI Whisper model for robust speech recognition.

**Model Sizes:**
| Model | Parameters | VRAM | Speed |
|-------|-----------|------|-------|
| tiny | 39M | ~1GB | 32x |
| base | 74M | ~1GB | 16x |
| small | 244M | ~2GB | 6x |
| medium | 769M | ~5GB | 2x |
| large-v2 | 1550M | ~10GB | 1x |

**Basic Usage:**
```python
import whisper

model = whisper.load_model("base")
result = model.transcribe("audio.mp3")

print(result["text"])
for segment in result["segments"]:
    print(f"[{segment['start']:.2f}s] {segment['text']}")
```

**content-machine Relevance:**
- Fallback when WhisperX unavailable
- Simpler API for quick prototyping
- Multi-language support (99 languages)

---

### 3.3 Auto-Subtitle-Generator

**Location:** `vendor/captions/auto-subtitle-generator`  
**Language:** Python  
**License:** MIT  

**Core Concept:** Generate styled subtitles for short-form video (TikTok/Reels format).

**Features:**
- GUI interface
- Font customization (size, color, style)
- Y-position control
- Text alignment
- MoviePy-based rendering

**Usage Pattern:**
```python
# GUI-based workflow
# 1. Load video
# 2. Configure subtitle style
# 3. Run Whisper transcription
# 4. Render subtitles onto video

# Planned: Word-level timestamps via WhisperX
```

**content-machine Relevance:**
- Reference for styled subtitle rendering
- GUI patterns for preview
- MoviePy integration example

---

### 3.4 Force Alignment Concept

**What is Force Alignment?**

Force alignment synchronizes orthographic transcriptions (text) with audio recordings to generate phone-level (phoneme) segmentation. This is critical for:

1. **Word-level timestamps:** Know exactly when each word starts/ends
2. **Animated captions:** Highlight words as they're spoken
3. **Karaoke-style effects:** Visual sync with audio

**How WhisperX Achieves This:**

```
1. Whisper generates utterance-level transcript
         ↓
2. wav2vec2 generates frame-wise phoneme probabilities
         ↓
3. Trellis matrix created (probability × time)
         ↓
4. Viterbi algorithm finds optimal path
         ↓
5. Word boundaries extracted from phoneme alignment
```

**Integration with Remotion:**
```typescript
// Use word-level timestamps for animated captions
import { Word } from '@remotion/captions';

const words: Word[] = whisperxOutput.words.map(w => ({
  word: w.word,
  start: w.start * 1000,  // Convert to ms
  end: w.end * 1000,
}));

// Render with word highlighting
<Captions words={words} currentTime={frame / fps * 1000}>
  {(word, isHighlighted) => (
    <span style={{ 
      color: isHighlighted ? 'yellow' : 'white',
      fontWeight: isHighlighted ? 'bold' : 'normal'
    }}>
      {word.word}
    </span>
  )}
</Captions>
```

---

## Part 4: Integration Architecture

### 4.1 Research → Script Pipeline

```python
from gpt_researcher import GPTResearcher
import instructor
from pydantic import BaseModel

class VideoScript(BaseModel):
    title: str
    hook: str
    scenes: list[str]
    cta: str

async def research_to_script(topic: str) -> VideoScript:
    # 1. Deep research
    researcher = GPTResearcher(query=topic)
    research = await researcher.conduct_research()
    
    # 2. Structured script generation
    client = instructor.from_provider("anthropic/claude-sonnet")
    script = client.chat.completions.create(
        response_model=VideoScript,
        messages=[
            {"role": "system", "content": "Create a 60-second video script"},
            {"role": "user", "content": f"Research: {research}\n\nCreate script."}
        ]
    )
    
    return script
```

### 4.2 Audio → Captions Pipeline

```python
import whisperx

async def audio_to_captions(audio_path: str) -> list[dict]:
    # 1. Transcribe
    model = whisperx.load_model("large-v2", "cuda")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16)
    
    # 2. Align for word-level timestamps
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device="cuda"
    )
    aligned = whisperx.align(
        result["segments"],
        model_a, metadata, audio, "cuda"
    )
    
    # 3. Format for Remotion
    words = []
    for segment in aligned["segments"]:
        for word in segment.get("words", []):
            words.append({
                "word": word["word"],
                "start": int(word["start"] * 1000),
                "end": int(word["end"] * 1000),
            })
    
    return words
```

### 4.3 Full Pipeline with Validation

```typescript
import { z } from 'zod';
import { VideoProjectSchema } from './schemas';

async function createVideo(topic: string): Promise<VideoProject> {
  // 1. Research (GPT Researcher via API)
  const research = await fetch('/api/research', {
    method: 'POST',
    body: JSON.stringify({ topic }),
  }).then(r => r.json());
  
  // 2. Generate script (Instructor via API)
  const script = await fetch('/api/script', {
    method: 'POST',
    body: JSON.stringify({ research }),
  }).then(r => r.json());
  
  // 3. Generate audio (Kokoro TTS)
  const audio = await fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ script }),
  }).then(r => r.json());
  
  // 4. Generate captions (WhisperX)
  const captions = await fetch('/api/captions', {
    method: 'POST',
    body: JSON.stringify({ audioPath: audio.path }),
  }).then(r => r.json());
  
  // 5. Validate and return
  const project = VideoProjectSchema.parse({
    title: script.title,
    platform: 'tiktok',
    scenes: script.scenes.map((s, i) => ({
      id: crypto.randomUUID(),
      description: s,
      duration_ms: calculateDuration(audio, i),
      visual_type: 'capture',
      audio_type: 'narration',
      captions: filterCaptions(captions, i),
    })),
  });
  
  return project;
}
```

---

## Summary

### Research Agent Recommendations

| Use Case | Tool | Reasoning |
|----------|------|-----------|
| **Deep Research** | GPT Researcher | Proven, 20+ sources, citations |
| **LangGraph Integration** | Open Deep Research | Native LangGraph, MCP support |
| **Quick Lookup** | Tavily directly | Simple API for focused queries |

### Schema Validation Recommendations

| Language | Tool | Use Case |
|----------|------|----------|
| **TypeScript** | Zod | MCP tools, API validation |
| **Python** | Pydantic | Data models, LLM outputs |
| **LLM Outputs** | Instructor | Structured extraction |

### Caption/ASR Recommendations

| Use Case | Tool | Reasoning |
|----------|------|-----------|
| **Production** | WhisperX | 70x realtime, word timestamps |
| **Simple Tasks** | Whisper | Easy API, good enough |
| **Interviews** | WhisperX + Diarization | Speaker identification |

### Key Integration Patterns

1. **Research → Script:** GPT Researcher → Instructor → Pydantic model
2. **Audio → Captions:** Kokoro TTS → WhisperX → Word timestamps
3. **Validation:** Zod (TypeScript) ↔ Pydantic (Python) via JSON Schema
4. **Type Safety:** Instructor + Pydantic for guaranteed LLM outputs

---

## References

- [GPT Researcher Documentation](https://docs.gptr.dev/)
- [Open Deep Research](https://github.com/langchain-ai/open_deep_research)
- [Instructor Documentation](https://python.useinstructor.com/)
- [Zod Documentation](https://zod.dev/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [WhisperX Paper](https://arxiv.org/abs/2303.00747)
