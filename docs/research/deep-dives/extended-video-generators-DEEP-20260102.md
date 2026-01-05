# Extended Video Generators Deep Dive

> **Created:** 2026-01-02
> **Status:** Research Document
> **Category:** End-to-End Video Generator Patterns

---

## Executive Summary

This document analyzes 15+ additional video generator repos beyond the core blueprint repos, extracting unique patterns for orchestration, content generation, video processing, and automation.

---

## 1. OBrainRot - Wav2Vec2 Force Alignment

**Path:** `vendor/OBrainRot/`
**Pattern:** PyTorch Wav2Vec2-based forced alignment for word-level timestamps

### Key Innovation: Neural Force Alignment

Unlike Whisper-based approaches, OBrainRot uses **Wav2Vec2** for forced alignment - more accurate for known text.

```python
# force_alignment.py - Trellis-based alignment
def class_label_prob(SPEECH_FILE):
    bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
    model = bundle.get_model().to(device)
    labels = bundle.get_labels()
    with torch.inference_mode():
        waveform, _ = torchaudio.load(SPEECH_FILE)
        emissions, _ = model(waveform.to(device))
        emissions = torch.log_softmax(emissions, dim=-1)
    return (bundle, waveform, labels, emission)

def trellis_algo(labels, ts, emission, blank_id=0):
    """Viterbi-style trellis for CTC alignment"""
    dictionary = {c: i for i, c in enumerate(labels)}
    transcript = format_text(ts)  # |WORD|WORD|WORD|
    tokens = [dictionary.get(c, 0) for c in transcript]

    num_frame = emission.size(0)
    num_tokens = len(tokens)
    trellis = torch.zeros((num_frame, num_tokens))

    # Forward pass with CTC blank handling
    for t in range(num_frame - 1):
        trellis[t + 1, 1:] = torch.maximum(
            trellis[t, 1:] + emission[t, blank_id],
            trellis[t, :-1] + emission[t, tokens[1:]],
        )
    return trellis, emission, tokens
```

### ASS Subtitle Generation

```python
def convert_timing_to_ass(timing_info, output_path):
    ass_content = """[Script Info]
Title: Default ASS file
ScriptType: v4.00+

[V4+ Styles]
Style: Default,Arial,24,&H00FFFFFF,...

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    for word, start_time, end_time in timing_info:
        ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{word}\n"
```

### Key Takeaways

- **When to use:** Known transcript needing precise alignment
- **Advantage:** More accurate than Whisper for pre-generated TTS
- **Pattern:** Trellis → Backtrack → Segment → Merge Words

---

## 2. Crank - Plugin Architecture for Background Videos

**Path:** `vendor/Crank/`
**Pattern:** Extensible plugin system for video source abstraction

### Plugin Architecture

```python
# src/plugins/base.py - Abstract Plugin Interface
class BackgroundVideoPlugin(ABC):
    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace

    @abstractmethod
    def get_media(self, data: Dict[str, Any]) -> Path:
        """Generate background video from pipeline data."""
        pass

# Plugin receives all pipeline context
data = {
    "transcript": "Welcome to our channel...",
    "title": "Amazing Facts About Space",
    "description": "Learn about space...",
    "search_term": "space exploration cinematic",
    "categoryId": "24"
}
```

### Plugin Discovery

```
plugins/
└── custom_plugin/
    ├── plugin.py      # Must have class ending in `Plugin`
    └── config.yml     # Plugin-specific settings
```

### Key Takeaways

- **Pattern:** Registry-based plugin discovery
- **Benefit:** Swap video sources without code changes
- **Examples:** Pexels, AI-generated, local stock, YouTube clips

---

## 3. AutoTube - n8n Orchestration with Docker

**Path:** `vendor/Autotube/`
**Pattern:** n8n workflow automation with containerized services

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────┐ │
│  │   n8n    │──▶│ Ollama   │──▶│  Python  │──▶│ YT API│ │
│  │ Workflow │    │   AI    │    │ Video API│    │      │ │
│  └──────────┘    └─────────┘    └──────────┘    └──────┘ │
│       │               │                │              │  │
│  ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────┐ │
│  │PostgreSQL│    │ OpenTTS │    │   AI     │    │Redis │ │
│  │    DB    │    │  Voice  │    │  Images  │    │Cache │ │
│  └──────────┘    └─────────┘    └──────────┘    └──────┘ │
└──────────────────────────────────────────────────────────┘
```

### Ken Burns Zoom Effect

```python
def create_image_scene(image_path, text, duration=6, zoom=True):
    img = ImageClip(image_path).with_duration(duration)

    # Ken Burns: 1.0x to 1.08x zoom over duration
    if zoom:
        img = img.resized(lambda t: 1 + 0.08 * (t / duration))

    # Dark overlay for text readability
    overlay = ColorClip(size=(WIDTH, HEIGHT), color=(0, 0, 0))
    overlay = overlay.with_opacity(0.3).with_duration(duration)

    return CompositeVideoClip([img, overlay, text_clip])
```

### Key Takeaways

- **n8n for orchestration:** Visual workflows, error handling
- **Containerized services:** Each component isolated
- **Ken Burns:** Simple zoom interpolation for static images

---

## 4. Tiktok-Automatic-Videos - Remotion + Google Cloud TTS

**Path:** `vendor/tiktok-automatic-videos/`
**Pattern:** Remotion with cloud-hosted assets and dynamic content loading

### Remote Script Loading

```tsx
const RemotionVideo: React.FC = () => {
  const baseUrl = 'https://storage.googleapis.com/tiktok-video-assets/video-assets';
  const projectId = process.env.REMOTION_PROJECT_ID;
  const scriptUrl = `${baseUrl}/${projectId}/script.json`;

  const [content, setContent] = useState<JustContent[]>([]);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    fetch(scriptUrl)
      .then((res) => res.json())
      .then((json) => {
        // Parse script into content segments
        const parsedContent = [json.title, ...json.script].map((entry) => ({
          text: entry.text,
          duration: Math.max(entry.duration, 1),
          audioFile: `${projectAssets}/sounds/${entry.audio_file}`,
          emoji: [entry.emoji],
        }));
        setContent(parsedContent);
        continueRender(handle);
      });
  }, []);
};
```

### Word-by-Word Animation

```tsx
const TextComponent = () => (
  <div style={{ background: 'black', color: 'white' }}>
    <p>
      {content.text.split(' ').map((word, i) => (
        <span
          style={{
            opacity: opacity(i), // Fade in per word
            transform: `translateY(${translate(i)}px)`, // Bounce in
            marginLeft: 11,
          }}
        >
          {word}
        </span>
      ))}
    </p>
  </div>
);
```

### Key Takeaways

- **Cloud assets:** Script/audio hosted externally, render dynamically
- **delayRender/continueRender:** Wait for async data before rendering
- **Per-word animation:** Spring-based interpolation for bounce effect

---

## 5. Faceless-short - Modular Utility Pipeline

**Path:** `vendor/Faceless-short/`
**Pattern:** Clean utility module separation

### Module Structure

```
utility/
├── script_generator.py       # LLM script generation
├── audio_generator.py        # Edge TTS synthesis
├── timed_captions_generator.py  # Whisper timestamped
├── video_search_query_generator.py  # LLM → Pexels keywords
├── background_video_generator.py   # Pexels API
└── render_engine.py          # MoviePy composition
```

### Caption Chunking Algorithm

```python
def splitWordsBySize(words, maxCaptionSize):
    halfCaptionSize = maxCaptionSize / 2
    captions = []
    while words:
        caption = words[0]
        words = words[1:]
        while words and len(caption + ' ' + words[0]) <= maxCaptionSize:
            caption += ' ' + words[0]
            words = words[1:]
            # Break at half capacity for readability
            if len(caption) >= halfCaptionSize and words:
                break
        captions.append(caption)
    return captions
```

### Key Takeaways

- **Utility-based modularity:** Each concern isolated
- **Caption chunking:** Half-size break for natural flow
- **Whisper timestamped:** `whisper_timestamped` library for word timing

---

## 6. VideoShortsCreator-Gemini - ASS Subtitle Styling

**Path:** `vendor/VideoShortsCreator-Gemini/`
**Pattern:** Dynamic ASS subtitle generation with multiple animation styles

### ASS Style System

```python
def generate_subtitles_ass(transcription_data, start_sec, end_sec, subtitle_options):
    # Style definitions with user options
    font = subtitle_options.get("font", "Impact")
    font_size = int(subtitle_options.get("font_size", 60))
    animation_style = subtitle_options.get("animation_style", "Elastic-Jump")

    # Color themes
    color_map = {
        "Yellow/White": {"primary": "&H00FFFFFF", "highlight": "&H0000FFFF"},
        "Green/White": {"primary": "&H00FFFFFF", "highlight": "&H0000FF00"},
        "Red/White": {"primary": "&H00FFFFFF", "highlight": "&H000000FF"},
        "Neon Blue/White": {"primary": "&H00FFFFFF", "highlight": "&H00FFD700"}
    }

    # Position mapping
    pos_map = {
        "Inferior": {"align": 2, "marginV": 30},
        "Centralizado": {"align": 5, "marginV": 30},
        "Superior": {"align": 8, "marginV": 30}
    }

    # Animation per word
    for word_info in segment.get("words", []):
        style = word_info.get("style", "normal").capitalize()
        text = word_info.get("word", "")

        if style == "Impact":
            if animation_style == "Elastic-Jump":
                # ASS animation tags for elastic bounce
                text = f"{{\\an5\\t(0, 100, \\fscx120\\fscy120)\\t(100, 400, \\fscx115\\fscy115)}}{text}"
```

### Key Takeaways

- **ASS format:** Rich styling, animations, positioning
- **Word-level styling:** Impact words get different treatment
- **Configurable themes:** User-selectable color schemes

---

## 7. ShortReelX - TensorFlow Frame Analysis

**Path:** `vendor/ShortReelX/`
**Pattern:** MobileNet-based keyframe scoring for highlight detection

### AI Frame Analysis

```javascript
async function analyzeFrames(videoPath, numShorts, frameCount = 10) {
  const keyFrames = await extractFrames(videoPath, frameCount);
  const model = await mobilenet.load();

  const scores = await Promise.all(
    keyFrames.map(async (frame) => {
      const processedFrame = await preprocessImage(frame);
      const tensor = tf.node.decodeImage(processedFrame);
      const prediction = await model.classify(tensor);
      // Average classification probability as "interestingness" score
      const score = prediction.reduce((acc, p) => acc + p.probability, 0) / prediction.length;
      return { frame, score };
    })
  );

  // Return top N most "interesting" frames by MobileNet confidence
  validScores.sort((a, b) => b.score - a.score);
  return validScores.slice(0, numShorts);
}
```

### Key Takeaways

- **Visual scoring:** MobileNet classification confidence as proxy for interest
- **Keyframe extraction:** FFmpeg screenshots at intervals
- **Limitation:** Classification confidence != virality (better: CLIP similarity)

---

## 8. Gemini-YouTube-Automation - GitHub Actions Daily Pipeline

**Path:** `vendor/gemini-youtube-automation/`
**Pattern:** Scheduled content generation via CI/CD

### Curriculum Generation

```python
def generate_curriculum(previous_titles=None):
    """Generate course curriculum with Gemini"""
    prompt = f"""
    Generate a curriculum for 'AI for Developers by {YOUR_NAME}'.

    The curriculum must guide from beginner to advanced AI:
    - Generative AI, LLMs, Vector Databases, Agentic AI
    - Transformers internals, multi-agent systems, LangGraph

    Respond with ONLY valid JSON:
    {{"lessons": [{{"chapter", "part", "title", "status": "pending"}}]}}
    """
    response = model.generate_content(prompt)
    return json.loads(response.text)
```

### Per-Slide Audio Sync

```python
def create_video(slide_paths, audio_paths, output_path, video_type):
    """Sync each slide with its own audio clip"""
    image_clips = []
    for i, (img_path, audio_path) in enumerate(zip(slide_paths, audio_paths)):
        audio_clip = AudioFileClip(str(audio_path))
        duration = audio_clip.duration + 0.5  # Padding

        img_clip = (
            ImageClip(img_path)
            .set_duration(duration)
            .set_audio(audio_clip)
            .fadein(0.5)
            .fadeout(0.5)
        )
        image_clips.append(img_clip)

    final_video = concatenate_videoclips(image_clips, method="compose")
```

### Key Takeaways

- **GitHub Actions:** Daily automated generation
- **Curriculum continuity:** Previous lesson titles for continuation
- **Slide-audio sync:** Each slide timed to its audio clip

---

## 9. Viral-Faceless-Shorts-Generator - Google Trends Pipeline

**Path:** `vendor/Viral-Faceless-Shorts-Generator/`
**Pattern:** Trend-to-video automation with containerized services

### Pipeline Overview

```
1. Scrape Google Trends (Puppeteer)
     ↓
2. Generate Script (Gemini)
     ↓
3. Text-to-Speech (Coqui TTS)
     ↓
4. Forced Alignment (Aeneas)
     ↓
5. Video Assembly (FFmpeg)
     ↓
6. Web Trigger Interface (nginx)
```

### Service Architecture

```yaml
# docker-compose.yml
services:
  trendscraper: # Puppeteer + Gemini + FFmpeg
  coqui: # Coqui TTS container
  speechalign: # Aeneas alignment
  nginx: # Web interface
```

### Key Takeaways

- **Trend-driven:** Content based on real-time Google Trends
- **Aeneas alignment:** Alternative to Whisper for subtitle timing
- **One-click interface:** nginx frontend triggers full pipeline

---

## 10. YASGU - Multi-LLM Image Generation

**Path:** `vendor/YASGU/`
**Pattern:** Configurable LLM/image model per video generator

### Generator Configuration

```json
{
  "generators": [
    {
      "id": "history_facts",
      "language": "en",
      "subject": "History of France",
      "llm": "claude_3_sonnet",
      "image_prompt_llm": "mixtral_8x7b",
      "image_model": "lexica",
      "images_count": 5,
      "font": "Arial.ttf",
      "subtitles_max_chars": 40,
      "subtitles_font_size": 60
    }
  ]
}
```

### Available Models

| Type      | Models                                                   |
| --------- | -------------------------------------------------------- |
| **LLM**   | gpt-4, claude-3-sonnet, mixtral-8x7b, gemini, llama2-70b |
| **Image** | DALL-E v3, lexica, prodia, simurg, animefy               |

### Key Takeaways

- **Multi-generator:** Different topics with different models
- **LLM routing:** gpt4free for model abstraction
- **Firefox automation:** Selenium for YouTube upload

---

## 11. youtube-auto-shorts-generator - Complete Single-File Pipeline

**Path:** `vendor/youtube-auto-shorts-generator/`
**Pattern:** All functionality consolidated in one Python file

### Video Search Query Generation

```python
VIDEO_SEARCH_PROMPT = """
Generate video search keywords in this exact format:
{
  "segments": [
    {
      "time_range": [t1, t2],
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ]
}

Guidelines:
1. Create 3 VISUAL keywords per segment (2-4 seconds each)
2. Must be concrete (e.g., "dog running" not "happy moment")
3. English only, 1-2 words per keyword
"""
```

### Transcript to Captions (AssemblyAI)

```python
def process_transcript_to_captions(transcript, maxCaptionSize: int = 15):
    captions = []
    current_caption = []
    current_start = 0

    for word in transcript.words:
        word_start = word.start / 1000  # ms to seconds

        test_caption = ' '.join(current_caption + [word.text])
        if len(test_caption) <= maxCaptionSize:
            current_caption.append(word.text)
        else:
            if current_caption:
                captions.append((
                    (current_start, word_start),
                    ' '.join(current_caption)
                ))
            current_caption = [word.text]
            current_start = word_start

    return captions
```

### Key Takeaways

- **Single file:** ~500 lines covers entire pipeline
- **AssemblyAI:** Paid but reliable transcription
- **OpenRouter fallback:** Multiple LLM provider support

---

## 12. AI-short-creator - LLM Virality Detection

**Path:** `vendor/AI-short-creator/`
**Pattern:** GPT-based identification of viral segments from transcripts

### Viral Segment Detection

```python
def analyze_transcript(subtitle_file_path):
    response_obj = [
        {
            "start_time": 0.0,
            "end_time": 55.26,
            "description": "main description",
            "duration": 55.26
        }
    ]

    prompt = f"""
    This is a transcript of a video/podcast.
    Please identify the most viral sections from this part of the video.
    Make sure they are more than 30 seconds in duration.
    Provide extremely accurate timestamps.
    Respond only in this format: {json.dumps(response_obj)}

    Transcription:
    {subtitle_content}
    """

    messages = [
        {"role": "system", "content": "You are ViralGPT. Master at identifying viral content from podcasts (30-58 seconds)."},
        {"role": "user", "content": prompt}
    ]
```

### Key Takeaways

- **LLM as curator:** GPT identifies viral-worthy segments
- **Duration constraints:** 30-58 seconds for Shorts compliance
- **JSON extraction:** Direct time ranges from LLM

---

## 13. Cassette - Audio Waveform Visualization

**Path:** `vendor/Cassette/`
**Pattern:** Terminal-based video generation with seewav visualization

### Features

- GPT-3.5-turbo for transcript
- UnrealSpeech API for voice
- seewav module for audio visualization
- Word or sentence-level subtitles
- Custom fonts and colors

---

## Summary: Pattern Extraction

### Orchestration Patterns

| Pattern            | Repo           | Description                |
| ------------------ | -------------- | -------------------------- |
| **n8n Workflows**  | AutoTube       | Visual workflow automation |
| **Docker Compose** | Viral-Faceless | Service containerization   |
| **GitHub Actions** | Gemini-YT      | Scheduled daily generation |
| **Single File**    | youtube-auto   | All-in-one Python script   |

### Alignment Patterns

| Pattern                 | Repo           | Technology               |
| ----------------------- | -------------- | ------------------------ |
| **Wav2Vec2 Trellis**    | OBrainRot      | PyTorch forced alignment |
| **Whisper Timestamped** | Faceless-short | Word-level from ASR      |
| **AssemblyAI**          | youtube-auto   | Paid cloud transcription |
| **Aeneas**              | Viral-Faceless | Force alignment tool     |

### Video Composition Patterns

| Pattern                | Repo               | Framework             |
| ---------------------- | ------------------ | --------------------- |
| **Ken Burns Zoom**     | AutoTube           | MoviePy lambda resize |
| **Remotion Sequences** | tiktok-automatic   | React composition     |
| **ASS Subtitles**      | VideoShortsCreator | FFmpeg subtitle burn  |
| **MoviePy Composite**  | Faceless-short     | Python video editing  |

### Content Discovery Patterns

| Pattern               | Repo             | Source                |
| --------------------- | ---------------- | --------------------- |
| **Google Trends**     | Viral-Faceless   | Puppeteer scraping    |
| **LLM Virality**      | AI-short-creator | GPT segment detection |
| **MobileNet Scoring** | ShortReelX       | Frame classification  |
| **Curriculum LLM**    | Gemini-YT        | Topic generation      |

### Plugin/Extensibility Patterns

| Pattern                      | Repo           | Mechanism          |
| ---------------------------- | -------------- | ------------------ |
| **Background Video Plugins** | Crank          | Registry discovery |
| **Multi-Generator Config**   | YASGU          | JSON configuration |
| **Utility Modules**          | Faceless-short | Clean separation   |

---

## Recommendations for content-machine

### 1. Adopt Plugin Architecture (from Crank)

- Abstract video sources behind plugin interface
- Support Pexels, Unsplash, AI-generated, local stock

### 2. Use Wav2Vec2 for Known Text (from OBrainRot)

- When transcript is known (TTS output), use forced alignment
- More accurate than ASR for pre-generated audio

### 3. Implement ASS Subtitle System (from VideoShortsCreator)

- Rich styling, animation, positioning
- Word-level effects via ASS tags

### 4. Consider n8n for Orchestration (from AutoTube)

- Visual workflow debugging
- Easy monitoring and retry

### 5. LLM-Based Virality Detection (from AI-short-creator)

- For clipping long-form content
- Prompt engineering for duration constraints
