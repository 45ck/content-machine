# End-to-End Video Generation Patterns - Deep Dive

**Date:** 2026-01-02  
**Status:** Research Complete  
**Category:** Short Video Generators, Pipeline Architecture, Content Automation

---

## 1. Executive Summary

This document analyzes 15+ end-to-end short video generation repositories to extract reusable patterns for content-machine. Key findings:

1. **Common 6-Step Pipeline:** Topic → Script → TTS → Assets → Render → Publish
2. **LLM-Driven Viral Detection:** Using "ViralGPT" prompts to identify high-engagement segments
3. **Microservice vs Monolith:** Docker-compose orchestration becoming standard
4. **Caption Alignment Critical:** Forced alignment (Aeneas, WhisperX) essential for TikTok captions
5. **Stock Asset Integration:** Pexels/Unsplash APIs with duration-matched video selection

---

## 2. Repository Analysis Matrix

| Repository | Language | Architecture | TTS | Caption | Video Source | Unique Pattern |
|------------|----------|--------------|-----|---------|--------------|----------------|
| **short-video-maker-gyori** | TypeScript | Monolith + REST | Kokoro | Whisper | Pexels | MCP + Remotion |
| **Viral-Faceless-Shorts** | Node + Python | Docker Microservices | Coqui | Aeneas | Local files | Google Trends |
| **shortrocity** | Python | Simple script | ElevenLabs/OpenAI | Captacity | DALL-E | GPT-4 narrative |
| **Auto-YT-Shorts** | Python | Modular | External | MoviePy | AI-generated | Topic CLI |
| **AI-short-creator** | Python | Pipeline chain | External | External | YouTube clips | ViralGPT scoring |
| **shorts_maker** | Python | Class-based | TikTok TTS | WhisperX | Reddit posts | Reddit integration |
| **ShortReelX** | Node.js | REST API | External | FFmpeg | User uploads | AI segment detection |

---

## 3. Pipeline Architectures

### 3.1 The Standard 6-Step Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   1. TOPIC   │ -> │  2. SCRIPT  │ -> │   3. TTS    │
│  (Research)  │    │ (Generate)  │    │  (Narrate)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  6. PUBLISH  │ <- │  5. RENDER  │ <- │  4. ASSETS  │
│  (Upload)    │    │ (Composite) │    │ (Visuals)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 3.2 Short-Video-Maker-Gyori (Blueprint)

**Architecture:** TypeScript monolith with queue-based processing

```typescript
// Per-scene processing loop
for (const scene of inputScenes) {
  // 1. TTS Generation
  const audio = await this.kokoro.generate(scene.text, config.voice);
  
  // 2. Audio normalization
  await this.ffmpeg.saveNormalizedAudio(audioStream, tempWavPath);
  
  // 3. Caption generation via Whisper
  const captions = await this.whisper.CreateCaption(tempWavPath);
  
  // 4. Video asset fetch (duration-matched)
  const video = await this.pexelsApi.findVideo(
    scene.searchTerms, 
    audioLength,  // Match video to audio duration
    excludeVideoIds  // Avoid duplicates
  );
  
  scenes.push({ captions, video, audio });
}

// 5. Final render with Remotion
await this.remotion.render({ music, scenes, config }, videoId);
```

**Key Patterns:**
- Queue-based processing with cuid() IDs
- Duration-matched video asset selection
- Video ID exclusion to prevent duplicates
- Temp file cleanup after rendering

### 3.3 Viral-Faceless-Shorts-Generator (Microservices)

**Architecture:** Docker-compose with 4 services

```yaml
services:
  trendscraper:   # Node.js + Puppeteer
    - Scrapes Google Trends via Puppeteer
    - Generates scripts via Gemini API
    - Burns subtitles with FFmpeg
    
  coqui:          # Coqui TTS
    - Text-to-speech conversion
    - Speaker ID configuration
    
  speechalign:    # Python + Aeneas
    - Forced alignment for subtitle timing
    - Smart text splitting (~6 words per line)
    
  nginx:          # Reverse proxy
    - One-click web interface
    - Routes API calls
```

**Trend Scraping Pattern:**

```javascript
// Puppeteer-based Google Trends scraping
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(`https://trends.google.com/trending?geo=${geo}&hours=${hours}`);

// Wait for table and download CSV
await page.waitForSelector("tr[role='row']");
await page.evaluate(() => 
  document.querySelector('li[data-action="csv"]').click()
);

// Parse CSV to JSON
const trends = await csv().fromFile(downloadedFile);
```

**Script Generation Pattern:**

```javascript
const prompt = `You are a professional content strategist. Analyze this trending topic:
${JSON.stringify(trend)}

Output JSON with:
- "title": Catchy title < 100 chars with hashtags
- "description": Short description with hashtags  
- "body": 250-300 word speech script, natural narrator voice

IMPORTANT: No "I", "me" references. No visuals in body. 
Call to action at end.`;

const response = await gemini.generateContent(prompt);
```

### 3.4 Shortrocity (Simple Python)

**Architecture:** Single-file orchestration

```python
# main.py - Simple sequential pipeline
short_id = str(int(time.time()))  # Timestamp-based ID

# 1. Generate script via GPT-4
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": NARRATOR_PROMPT},
        {"role": "user", "content": f"Create short from: {source_material}"}
    ]
)

# 2. Parse into [image_description] + Narrator: "text" pairs
data, narrations = narration.parse(response_text)

# 3. Generate narration audio (ElevenLabs or OpenAI)
narration.create(data, output_folder)

# 4. Generate images via DALL-E
images.create_from_data(data, output_folder)

# 5. Create video with cross-fade transitions
video.create(narrations, basedir, output_file, caption_settings)
```

**Narrator Prompt Pattern:**

```python
NARRATOR_PROMPT = """You generate 30-60 seconds narration with image descriptions.

Format:
[Description of background image]
Narrator: "One sentence of narration"

Rules:
- Max 6 sentences
- NO celebrity names in image descriptions (legal)
- DO use real names in narration
- No special characters (TTS compatibility)
"""
```

### 3.5 AI-Short-Creator (ViralGPT Pattern)

**Architecture:** Pipeline chain via os.system()

```python
# main.py - Sequential shell commands
os.system("python video_downloader.py")     # Download source video
os.system("python transcript_analysis.py")   # LLM viral detection
os.system("python video_cutter.py")          # Cut viral segments
os.system("python face.py")                  # Face detection/tracking
os.system("python last_edit.py")             # Final edits
os.system("python process.py")               # Cleanup
```

**ViralGPT Pattern:**

```python
# transcript_analysis.py
response_format = [
    {
        "start_time": 0.0,
        "end_time": 55.26,
        "description": "main description",
        "duration": 55.26
    }
]

prompt = f"""This is a video transcript. Identify the most viral sections:
- Must be 30-58 seconds
- Provide EXTREMELY accurate timestamps
- Respond ONLY with JSON: {json.dumps(response_format)}

Transcript:
{subtitle_content}"""

messages = [
    {"role": "system", "content": "You are ViralGPT. Master at identifying viral content."},
    {"role": "user", "content": prompt}
]
```

**Video Cutting Pattern:**

```python
# video_cutter.py
for segment in viral_segments:
    subclip = video_clip.subclip(
        segment['start_time'], 
        segment['end_time']
    )
    subclip.write_videofile(
        f"video_{i}.mp4", 
        codec='libx264', 
        audio_codec='aac'
    )
```

### 3.6 Shorts-Maker (Reddit Integration)

**Architecture:** Class-based with YAML config

```python
class ShortsMaker:
    def get_reddit_post(self, url=None):
        """Fetch Reddit post for content"""
        reddit = praw.Reddit(
            client_id=self.cfg["client_id"],
            client_secret=self.cfg["client_secret"],
            user_agent=self.cfg["user_agent"]
        )
        
        if url:
            submission = reddit.submission(url=url)
        else:
            # Get random hot post from subreddit
            for submission in subreddit.hot():
                if self.is_unique_submission(submission):
                    break
        
        # Save to cache
        with open(record_file, "w") as f:
            f.write(submission.title + ".\n")
            f.write(submission.selftext)
```

**Text Normalization Pattern:**

```python
# Reddit-specific abbreviation expansion
ABBREVIATION_TUPLES = [
    ("AITA", "Am I the asshole ", " "),
    ("NTA", "Not the asshole ", " "),
    ("YTA", "You're the Asshole", ""),
    (" BF ", " boyfriend ", ""),
    (" GF ", " girlfriend ", ""),
    ("MIL", "mother in law ", " "),
]

for abbr, replacement, padding in ABBREVIATION_TUPLES:
    text = text.replace(abbr + padding, replacement)
```

---

## 4. Caption & Alignment Patterns

### 4.1 Forced Alignment with Aeneas

```python
# speechalign/app.py
def smart_split(text):
    """Split text into ~6 word subtitle lines"""
    splits = [text]
    for sep in [". ", ", ", "; ", ": "]:
        new_splits = []
        for chunk in splits:
            new_splits.extend(split_with_separator(chunk, sep))
        splits = new_splits
    
    # Further split large chunks
    final_chunks = []
    for s in splits:
        words = s.split()
        if len(words) > 6:
            # Split into ~6 word segments
            num_parts = max(2, len(words) // 6)
            words_per_part = ceil(len(words) / num_parts)
            # ... split logic
    return final_chunks

# Aeneas alignment command
command = [
    "python3", "-m", "aeneas.tools.execute_task",
    audio_file, text_file,
    "task_language=eng|os_task_file_format=srt|is_text_type=plain",
    output_srt
]
```

### 4.2 WhisperX Word-Level Timestamps

```python
import whisperx

# 1. Transcribe with batched inference
model = whisperx.load_model("large-v2", device, compute_type="float16")
result = model.transcribe(audio, batch_size=16)

# 2. Align to get word-level timestamps
model_a, metadata = whisperx.load_align_model(language_code="en", device=device)
result = whisperx.align(result["segments"], model_a, metadata, audio, device)

# result["segments"][0]["words"]:
# [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
```

### 4.3 Captacity Library

```python
import captacity

# Simple API for adding captions
captacity.add_captions(
    video_file="input.mp4",
    output_file="output.mp4",
    font="/path/to/font.ttf",
    font_size=130,
    font_color="yellow",
    stroke_width=3,
    stroke_color="black",
    highlight_current_word=True,
    word_highlight_color="red",
    line_count=1,
    padding=50
)
```

---

## 5. TTS Patterns

### 5.1 Kokoro (Local, Fast)

```python
from kokoro import KPipeline

pipeline = KPipeline(lang_code='a')  # American English
generator = pipeline(text, voice='af_heart', speed=1)

for i, (gs, ps, audio) in enumerate(generator):
    # gs = graphemes/text, ps = phonemes
    sf.write(f'{i}.wav', audio, 24000)
```

### 5.2 ElevenLabs API

```python
from elevenlabs.client import ElevenLabs
from elevenlabs import save

client = ElevenLabs(api_key=os.getenv("ELEVEN_API_KEY"))

audio = client.generate(
    text=element["content"],
    voice="Michael",
    model="eleven_monolingual_v1"
)
save(audio, output_file)
```

### 5.3 OpenAI TTS

```python
import openai

audio = openai.audio.speech.create(
    input=text,
    model="tts-1",
    voice="alloy",
)
audio.stream_to_file(output_file)
```

### 5.4 Coqui TTS (Docker)

```dockerfile
# Coqui container exposes HTTP API
# Call via: POST /api/tts with text and speaker_id
```

---

## 6. Video Rendering Patterns

### 6.1 Remotion (React-based)

```typescript
// Render via bundled composition
const composition = await selectComposition({
  serveUrl: bundledPath,
  id: "ShortVideo",
  inputProps: { scenes, music, config }
});

await renderMedia({
  codec: "h264",
  composition,
  serveUrl: bundledPath,
  outputLocation: `${id}.mp4`,
  concurrency: 2,  // Limit for Docker memory
  offthreadVideoCacheSizeInBytes: cacheSize
});
```

### 6.2 MoviePy (Python)

```python
from moviepy import ImageClip, AudioFileClip, CompositeVideoClip, concatenate_videoclips

clips = []
for i, (audio_path, image_path) in enumerate(pairs):
    audio = AudioFileClip(audio_path)
    img = ImageClip(image_path).resized(height=1920)
    img = img.with_background_color(size=(1080, 1920), color=(0, 0, 0))
    img = img.with_audio(audio).with_duration(audio.duration)
    
    subtitle = TextClip(text=f"Caption {i}", font_size=60, color="white")
    subtitle = subtitle.with_duration(audio.duration).with_position(("center", "bottom"))
    
    clip = CompositeVideoClip([img, subtitle], size=(1080, 1920))
    clips.append(clip)

final = concatenate_videoclips(clips, method="compose")
final.write_videofile("output.mp4", fps=30, audio_codec="aac")
```

### 6.3 FFmpeg (Direct)

```javascript
// Burn subtitles directly with FFmpeg
const command = `ffmpeg -y 
  -ss ${startOffset} 
  -i "${videoPath}" 
  -i "${audioPath}" 
  -vf "subtitles=${assPath}:fontsdir=/app/fonts" 
  -map 0:v:0 -map 1:a:0 
  -c:v libx264 -c:a aac 
  -shortest "${outputPath}"`;

await execPromise(command);
```

### 6.4 OpenCV + pydub (Low-level)

```python
# shortrocity/video.py - Frame-by-frame construction
fourcc = cv2.VideoWriter_fourcc(*'XVID')
out = cv2.VideoWriter(temp_video, fourcc, 30, (1080, 1920))

for i in range(image_count):
    image1 = cv2.imread(f"image_{i+1}.webp")
    image1 = resize_image(image1, 1080, 1920)
    
    duration = get_audio_duration(f"narration_{i+1}.mp3")
    
    # Write frames for duration
    for _ in range(int(duration * 30)):
        frame = np.zeros((1920, 1080, 3), dtype=np.uint8)
        frame[:image1.shape[0], :] = image1
        out.write(frame)
    
    # Cross-fade transition
    for alpha in np.linspace(0, 1, 30):
        blended = cv2.addWeighted(image1, 1-alpha, image2, alpha, 0)
        out.write(blended)

out.release()
```

---

## 7. Asset Fetching Patterns

### 7.1 Pexels API (Duration-Matched)

```typescript
// short-video-maker-gyori pattern
async findVideo(
  searchTerms: string[],
  minDuration: number,
  excludeIds: string[],
  orientation: string
): Promise<Video> {
  for (const term of searchTerms) {
    const results = await this.pexels.videos.search({
      query: term,
      orientation,
      size: 'medium'
    });
    
    for (const video of results.videos) {
      if (
        video.duration >= minDuration &&
        !excludeIds.includes(video.id)
      ) {
        return {
          id: video.id,
          url: video.video_files[0].link,
          width: video.width,
          height: video.height
        };
      }
    }
  }
  throw new Error("No matching video found");
}
```

### 7.2 Local Video Pool

```javascript
// Viral-Faceless pattern - Random from /videos folder
const allFiles = fs.readdirSync("/mnt/videos");
const defaultVideos = allFiles.filter(f => f.startsWith("default_"));
const video = defaultVideos[Math.floor(Math.random() * defaultVideos.length)];

// Calculate random start offset to match audio duration
const videoDuration = await getDuration(videoPath);
const audioDuration = await getDuration(audioPath);
const delta = Math.max(videoDuration - audioDuration - 1, 0);
const startOffset = delta > 0 ? Math.random() * delta : 0;
```

### 7.3 AI-Generated Images (DALL-E)

```python
# shortrocity pattern
from openai import OpenAI

def create_image(description: str, output_path: str):
    response = client.images.generate(
        model="dall-e-3",
        prompt=description,
        size="1024x1792",  # Vertical for shorts
        quality="standard"
    )
    
    image_url = response.data[0].url
    # Download and save
```

---

## 8. Trend Research Patterns

### 8.1 Google Trends Scraping

```javascript
// Puppeteer-based scraping
const url = `https://trends.google.com/trending?geo=${geo}&hours=${hours}`;
await page.goto(url);
await page.waitForSelector("tr[role='row']");

// Download CSV export
await page.evaluate(() => 
  document.querySelector('li[data-action="csv"]').click()
);

// Parse to structured format
const trends = csv.parse(file).map(row => ({
  trend: row["Trends"],
  volume: row["Search volume"],
  breakdown: row["Trend breakdown"]
}));
```

### 8.2 Reddit Hot Posts

```python
# shorts_maker pattern
import praw

reddit = praw.Reddit(client_id, client_secret, user_agent)
subreddit = reddit.subreddit("AmItheAsshole")

for submission in subreddit.hot(limit=10):
    if is_unique(submission.id):
        return {
            "title": submission.title,
            "content": submission.selftext,
            "url": submission.url
        }
```

---

## 9. Queue & State Management

### 9.1 In-Memory Queue (Simple)

```typescript
// short-video-maker-gyori
private queue: { sceneInput, config, id }[] = [];

public addToQueue(scenes, config): string {
  const id = cuid();
  this.queue.push({ sceneInput: scenes, config, id });
  
  if (this.queue.length === 1) {
    this.processQueue();  // Start processing
  }
  return id;
}

private async processQueue(): Promise<void> {
  if (this.queue.length === 0) return;
  
  const { sceneInput, config, id } = this.queue[0];
  try {
    await this.createShort(id, sceneInput, config);
  } finally {
    this.queue.shift();
    this.processQueue();  // Process next
  }
}
```

### 9.2 File-Based State

```python
# AI-short-creator
# State persisted via JSON files between pipeline stages
with open('main_part.json', 'w') as f:
    json.dump({"combined_response": viral_segments}, f)

# Next stage reads from file
with open('main_part.json', 'r') as f:
    data = json.load(f)
```

### 9.3 Redis/BullMQ (Production)

```typescript
// See infrastructure-and-integrations-DEEP.md for BullMQ patterns
const flow = new FlowProducer();
await flow.add({
  name: 'render-video',
  queueName: 'render',
  children: [
    { name: 'generate-tts', queueName: 'audio' },
    { name: 'generate-captions', queueName: 'captions' }
  ]
});
```

---

## 10. Content-Machine Implementation Strategy

### 10.1 Recommended Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Orchestrator                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Trend Research│ -> │Script Generate│ -> │ TTS + Align  │   │
│  │ (MCP Reddit)  │    │(Pydantic AI) │    │(Kokoro+Whisp)│   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                             │                               │
│                      ┌──────▼──────┐                        │
│                      │  LlamaIndex  │                        │
│                      │ Product RAG  │                        │
│                      └──────────────┘                        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Asset Fetch  │ -> │   Render     │ -> │   Review     │   │
│  │(Pexels/Local)│    │  (Remotion)  │    │ (Interrupt)  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Core Types (from short-video-maker-gyori)

```typescript
// Scene input from planning agent
interface SceneInput {
  text: string;  // Narration text
  searchTerms: string[];  // Video asset search terms
}

// Render configuration
interface RenderConfig {
  paddingBack?: number;  // Extra time at end (ms)
  music?: MusicMoodEnum;
  captionPosition?: CaptionPositionEnum;
  captionBackgroundColor?: string;
  voice?: VoiceEnum;
  orientation?: OrientationEnum;
  musicVolume?: MusicVolumeEnum;
}

// Caption with timing
interface Caption {
  text: string;
  startMs: number;
  endMs: number;
}
```

### 10.3 Key Implementation Decisions

1. **Use TypeScript + Remotion** for rendering (blueprint proven)
2. **Use Kokoro for TTS** (fast, local, no API costs)
3. **Use WhisperX for alignment** (word-level, GPU-accelerated)
4. **Use LangGraph for orchestration** (durable, checkpointed)
5. **Use Pydantic AI for structured outputs** (type-safe)
6. **Use BullMQ for job queue** (production-ready)
7. **Use Pexels for stock assets** (free API, good selection)

---

## 11. Key Takeaways

1. **ViralGPT Pattern** - LLM analysis of transcripts to identify viral-worthy segments
2. **Duration Matching** - Always match video asset duration to audio narration
3. **Forced Alignment** - Critical for TikTok-style word highlighting
4. **Microservices via Docker** - Separation of TTS, alignment, rendering concerns
5. **Queue-Based Processing** - Handle multiple video requests gracefully
6. **Temp File Management** - Critical cleanup to prevent disk bloat
7. **Reddit as Content Source** - Rich text content with engagement signals

---

## 12. Related Documents

- [10-short-video-maker-gyori.md](../10-short-video-maker-gyori-20260102.md) - Primary blueprint
- [agent-frameworks-orchestration-DEEP.md](agent-frameworks-orchestration-DEEP-20260102.md) - LangGraph patterns
- [video-editing-rendering-DEEP.md](video-editing-rendering-DEEP-20260102.md) - Remotion integration
- [infrastructure-and-integrations-DEEP.md](infrastructure-and-integrations-DEEP-20260102.md) - BullMQ patterns

---

**Research completed by:** content-machine research pipeline  
**Last updated:** 2026-01-02
