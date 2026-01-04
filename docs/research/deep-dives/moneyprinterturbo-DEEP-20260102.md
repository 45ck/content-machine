# Deep Dive: MoneyPrinterTurbo - Full Video Generation Pipeline

**Date:** 2026-01-02  
**Repo:** `vendor/MoneyPrinterTurbo/`  
**Priority:** ⭐ HIGH - Script Generation, Multi-LLM, Video Composition

---

## Executive Summary

**MoneyPrinterTurbo** is a Python-based video generation system with a FastAPI backend and WebUI. It features multi-LLM provider support, script generation prompts, stock footage sourcing, and MoviePy-based video composition.

### Why This Matters

- ✅ **Multi-LLM support** - OpenAI, Azure, Gemini, DeepSeek, Qwen, Ollama, etc.
- ✅ **Script generation prompts** - Well-crafted prompts for video scripts
- ✅ **Video search term generation** - LLM-driven asset sourcing
- ✅ **REST API architecture** - Task-based video generation
- ✅ **Video composition** - MoviePy-based rendering with transitions
- ⚠️ **Python/MoviePy** - We use Remotion, but patterns are extractable

---

## Architecture

```
MoneyPrinterTurbo/
├── app/
│   ├── controllers/
│   │   ├── v1/
│   │   │   ├── video.py      # Video generation endpoints
│   │   │   └── base.py       # Auth, routing
│   │   └── manager/
│   │       ├── memory_manager.py  # In-memory task queue
│   │       └── redis_manager.py   # Redis task queue
│   ├── services/
│   │   ├── llm.py            # Multi-LLM provider support
│   │   ├── video.py          # Video composition (MoviePy)
│   │   ├── task.py           # Task execution
│   │   └── state.py          # State management
│   ├── models/
│   │   └── schema.py         # Pydantic schemas
│   └── config/
│       └── config.py         # Configuration
├── webui/                     # Gradio-based WebUI
└── main.py                    # FastAPI entrypoint
```

---

## Multi-LLM Provider Support

MoneyPrinterTurbo supports **12+ LLM providers** with a unified interface:

```python
llm_provider = config.app.get("llm_provider", "openai")

# Supported providers:
# - openai (OpenAI API)
# - azure (Azure OpenAI)
# - gemini (Google Gemini)
# - moonshot (Moonshot AI)
# - ollama (Local Ollama)
# - oneapi (OneAPI aggregator)
# - qwen (Alibaba Qwen)
# - cloudflare (Cloudflare Workers AI)
# - deepseek (DeepSeek)
# - modelscope (ModelScope)
# - ernie (Baidu ERNIE)
# - pollinations (Pollinations - free!)
# - g4f (Free GPT4Free)
```

### Provider Configuration Pattern

```python
if llm_provider == "openai":
    api_key = config.app.get("openai_api_key")
    model_name = config.app.get("openai_model_name")
    base_url = config.app.get("openai_base_url", "https://api.openai.com/v1")
elif llm_provider == "ollama":
    api_key = "ollama"  # Any string works
    model_name = config.app.get("ollama_model_name")
    base_url = config.app.get("ollama_base_url", "http://localhost:11434/v1")
# ... more providers

# Unified OpenAI-compatible call
client = OpenAI(api_key=api_key, base_url=base_url)
response = client.chat.completions.create(
    model=model_name, 
    messages=[{"role": "user", "content": prompt}]
)
```

---

## Script Generation Prompt

This is the core prompt for generating video scripts:

```python
prompt = f"""
# Role: Video Script Generator

## Goals:
Generate a script for a video, depending on the subject of the video.

## Constrains:
1. the script is to be returned as a string with the specified number of paragraphs.
2. do not under any circumstance reference this prompt in your response.
3. get straight to the point, don't start with unnecessary things like, "welcome to this video".
4. you must not include any type of markdown or formatting in the script, never use a title.
5. only return the raw content of the script.
6. do not include "voiceover", "narrator" or similar indicators of what should be spoken at the beginning of each paragraph or line.
7. you must not mention the prompt, or anything about the script itself. also, never talk about the amount of paragraphs or lines. just write the script.
8. respond in the same language as the video subject.

# Initialization:
- video subject: {video_subject}
- number of paragraphs: {paragraph_number}
- language: {language}
""".strip()
```

### Key Script Generation Patterns

1. **No markdown** - Plain text only for TTS
2. **No intro/outro** - Straight to content
3. **No speaker indicators** - Just the script
4. **Language-aware** - Match subject language
5. **Retry logic** - Multiple attempts for reliability

---

## Video Search Terms Generation

LLM generates search queries for stock footage:

```python
prompt = f"""
# Role: Video Search Terms Generator

## Goals:
Generate {amount} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings. you must not return anything else. you must not return the script.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}

### Video Script
{video_script}

Please note that you must use English for generating video search terms; Chinese is not accepted.
""".strip()
```

### Response Parsing

```python
def parse_search_terms(response):
    # Try direct JSON parse
    try:
        search_terms = json.loads(response)
        return search_terms
    except:
        pass
    
    # Extract JSON array from response
    match = re.search(r"\[.*]", response)
    if match:
        return json.loads(match.group())
    
    return []
```

---

## REST API Pattern

### Task-Based Architecture

```python
@router.post("/videos", response_model=TaskResponse)
def create_video(
    background_tasks: BackgroundTasks, 
    request: Request, 
    body: TaskVideoRequest
):
    task_id = utils.get_uuid()
    
    # Add to task queue
    task_manager.add_task(
        tm.start, 
        task_id=task_id, 
        params=body, 
        stop_at="video"
    )
    
    return {"task_id": task_id}

@router.get("/tasks/{task_id}", response_model=TaskQueryResponse)
def get_task(task_id: str):
    task = sm.state.get_task(task_id)
    if task:
        # Convert file paths to URIs
        if "videos" in task:
            task["videos"] = [file_to_uri(v) for v in task["videos"]]
        return task
    raise HttpException(status_code=404, message="task not found")
```

### Task Manager Options

```python
# In-memory (development)
task_manager = InMemoryTaskManager(max_concurrent_tasks=5)

# Redis (production)
task_manager = RedisTaskManager(
    max_concurrent_tasks=5, 
    redis_url="redis://:password@localhost:6379/0"
)
```

---

## Video Composition (MoviePy)

### Clip Concatenation with Transitions

```python
def combine_videos(
    combined_video_path: str,
    video_paths: List[str],
    audio_file: str,
    video_aspect: VideoAspect,
    video_concat_mode: VideoConcatMode,
    video_transition_mode: VideoTransitionMode,
    max_clip_duration: int = 5,
):
    # Load audio for duration reference
    audio_clip = AudioFileClip(audio_file)
    audio_duration = audio_clip.duration
    
    # Break videos into clips
    for video_path in video_paths:
        clip = VideoFileClip(video_path)
        # Split into max_clip_duration segments
        while start_time < clip_duration:
            subclipped_items.append(SubClippedVideoClip(...))
    
    # Shuffle if random mode
    if video_concat_mode == VideoConcatMode.random:
        random.shuffle(subclipped_items)
    
    # Apply transitions
    for clip in subclipped_items:
        if transition_mode == VideoTransitionMode.fade_in:
            clip = video_effects.fadein_transition(clip, 1)
        elif transition_mode == VideoTransitionMode.slide_in:
            clip = video_effects.slidein_transition(clip, 1, side)
        # ... more transitions
```

### Aspect Ratio Handling

```python
aspect = VideoAspect(video_aspect)
video_width, video_height = aspect.to_resolution()

# Resize clips to match target aspect ratio
if clip_ratio > video_ratio:
    scale_factor = video_width / clip_w
else:
    scale_factor = video_height / clip_h

# Add black bars if needed
background = ColorClip(size=(video_width, video_height), color=(0, 0, 0))
clip_resized = clip.resized(new_size=(new_width, new_height)).with_position("center")
clip = CompositeVideoClip([background, clip_resized])
```

### Subtitle Composition

```python
def create_text_clip(subtitle_item):
    phrase = subtitle_item[1]
    max_width = video_width * 0.9
    
    # Wrap text to fit
    wrapped_txt, txt_height = wrap_text(
        phrase, 
        max_width=max_width, 
        font=font_path, 
        fontsize=params.font_size
    )
    
    _clip = TextClip(
        text=wrapped_txt,
        font=font_path,
        font_size=params.font_size,
        color=params.text_fore_color,
        bg_color=params.text_background_color,
        stroke_color=params.stroke_color,
        stroke_width=params.stroke_width,
    )
    
    # Set timing
    _clip = _clip.with_start(subtitle_item[0][0])
    _clip = _clip.with_end(subtitle_item[0][1])
    
    # Position
    if params.subtitle_position == "bottom":
        _clip = _clip.with_position(("center", video_height * 0.95 - _clip.h))
    
    return _clip
```

---

## TypeScript Adaptation

### Multi-LLM Service

```typescript
// src/services/llm/index.ts
import { z } from 'zod';

export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

export class OpenAIProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private modelName: string = 'gpt-4',
    private baseUrl: string = 'https://api.openai.com/v1'
  ) {}
  
  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Factory function
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
    case 'ollama':
      return new OllamaProvider(config.model, config.baseUrl);
    // ... more providers
  }
}
```

### Script Generation

```typescript
// src/services/script/generator.ts
export async function generateScript(
  llm: LLMProvider,
  subject: string,
  options: ScriptOptions = {}
): Promise<string> {
  const { language = 'en', paragraphs = 1 } = options;
  
  const prompt = `
# Role: Video Script Generator

## Goals:
Generate a script for a video, depending on the subject of the video.

## Constrains:
1. the script is to be returned as a string with the specified number of paragraphs.
2. do not under any circumstance reference this prompt in your response.
3. get straight to the point, don't start with unnecessary things like, "welcome to this video".
4. you must not include any type of markdown or formatting in the script, never use a title.
5. only return the raw content of the script.
6. do not include "voiceover", "narrator" or similar indicators.
7. you must not mention the prompt or the script itself.
8. respond in the same language as the video subject.

# Initialization:
- video subject: ${subject}
- number of paragraphs: ${paragraphs}
${language ? `- language: ${language}` : ''}
`.trim();

  let script = '';
  for (let i = 0; i < 5; i++) {
    try {
      const response = await llm.complete(prompt);
      script = formatScript(response);
      if (script) break;
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed:`, e);
    }
  }
  
  return script;
}

function formatScript(response: string): string {
  return response
    .replace(/\*/g, '')
    .replace(/#/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}
```

### Search Term Generation

```typescript
// src/services/assets/search-terms.ts
export async function generateSearchTerms(
  llm: LLMProvider,
  subject: string,
  script: string,
  count: number = 5
): Promise<string[]> {
  const prompt = `
# Role: Video Search Terms Generator

## Goals:
Generate ${count} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3"]

## Context:
### Video Subject
${subject}

### Video Script
${script}
`.trim();

  const response = await llm.complete(prompt);
  return parseSearchTerms(response);
}

function parseSearchTerms(response: string): string[] {
  try {
    return JSON.parse(response);
  } catch {
    const match = response.match(/\[.*?\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  }
}
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **Script generation prompts** - Well-tested, production-quality
2. **Search term generation prompts** - LLM-driven asset sourcing
3. **Multi-LLM provider pattern** - OpenAI-compatible interface
4. **Task-based API pattern** - Async video generation

### Pattern Extraction 🔧

1. **Retry logic** - Handle LLM failures gracefully
2. **Response parsing** - Extract JSON from LLM responses
3. **Aspect ratio handling** - Black bars vs. crop
4. **Clip segmentation** - Break long videos into segments

---

## Integration Points

### With Our Pipeline

```typescript
// src/planner/index.ts
export class ContentPlanner {
  constructor(private llm: LLMProvider) {}
  
  async plan(subject: string): Promise<ContentPlan> {
    // 1. Generate script (MoneyPrinterTurbo pattern)
    const script = await generateScript(this.llm, subject);
    
    // 2. Generate search terms (MoneyPrinterTurbo pattern)
    const searchTerms = await generateSearchTerms(this.llm, subject, script);
    
    // 3. Source assets (Pexels API)
    const assets = await sourceAssets(searchTerms);
    
    return { script, assets };
  }
}
```

---

## Lessons Learned

1. **Multi-LLM is essential** - Different providers for different needs
2. **Well-crafted prompts work** - Clear constraints improve output quality
3. **Retry logic is necessary** - LLMs can fail
4. **Task-based architecture scales** - Background processing + status polling
5. **JSON extraction from LLM is tricky** - Need regex fallbacks

---

**Status:** Research complete. Script generation and multi-LLM patterns validated for adoption.
