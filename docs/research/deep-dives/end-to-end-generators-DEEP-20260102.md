# Deep Dive: End-to-End Short Video Generators

**Date:** 2026-01-02  
**Repos:** `vendor/shortrocity/`, `vendor/RedditShortVideoMaker/`, `vendor/AI-short-creator/`, `vendor/shorts_maker/`  
**Priority:** ⭐ HIGH - Reference implementations for complete pipelines

---

## Executive Summary

Analysis of multiple end-to-end short video generators reveals consistent patterns across all implementations. These repos demonstrate complete pipelines from content → final video.

### Common Pipeline Pattern

```
Content Source → Script/Narration → TTS → Visual Assets → Composition → Captions → Export
```

### Key Findings

1. **All use same core tools**: OpenAI, ElevenLabs/OpenAI TTS, Whisper, FFmpeg/MoviePy
2. **All follow similar pipeline structure**: Sequential processing stages
3. **Captions are critical**: Every repo emphasizes word-level captions
4. **Remotion is emerging**: TypeScript + Remotion for modern implementations

---

## Shortrocity (Simple Reference)

**Type:** Source material → Narrated short video  
**Approach:** LLM generates script + image descriptions, AI generates everything

### Pipeline

```
Source Material → LLM Script → TTS → AI Images → Video Composition → Captions
```

### Key Patterns

**LLM Script Generation:**
```python
system_prompt = """You are a YouTube short narration generator. 
You generate 30 seconds to 1 minute of narration.

Respond with a pair of an image description in square brackets 
and a narration below it:

[Description of a background image]

Narrator: "One sentence of narration"

[Description of a background image]

Narrator: "One sentence of narration"
"""

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Create a short based on:\n\n{source_material}"}
    ]
)
```

**Parsing Script:**
```python
def parse(narration):
    data = []
    narrations = []
    lines = narration.split("\n")
    for line in lines:
        if line.startswith('Narrator: '):
            text = line.replace('Narrator: ', '').strip('"')
            data.append({"type": "text", "content": text})
            narrations.append(text)
        elif line.startswith('['):
            background = line.strip('[]')
            data.append({"type": "image", "description": background})
    return data, narrations
```

**Multi-TTS Support:**
```python
narration_api = "elevenlabs"  # or "openai"

if narration_api == "openai":
    audio = openai.audio.speech.create(
        input=element["content"],
        model="tts-1",
        voice="alloy",
    )
    audio.stream_to_file(output_file)
else:
    audio = elevenlabs.generate(
        text=element["content"],
        voice="Michael",
        model="eleven_monolingual_v1"
    )
    save(audio, output_file)
```

**Video Composition with Crossfade:**
```python
def create(narrations, output_dir, output_filename, caption_settings):
    # 1080x1920 vertical video
    width, height = 1080, 1920
    frame_rate = 30
    fade_time = 1000  # ms
    
    out = cv2.VideoWriter(temp_video, fourcc, frame_rate, (width, height))
    
    for i in range(image_count):
        image1 = cv2.imread(f"image_{i+1}.webp")
        image2 = cv2.imread(f"image_{i+2}.webp")
        
        # Duration based on narration audio
        duration = get_audio_duration(f"narration_{i+1}.mp3")
        
        # Static frames
        for _ in range(int(duration/1000*30)):
            out.write(create_frame(image1))
        
        # Crossfade transition
        for alpha in np.linspace(0, 1, int(fade_time/1000*30)):
            blended = cv2.addWeighted(image1, 1-alpha, image2, alpha, 0)
            out.write(create_frame(blended))
```

**Caption Integration (using captacity):**
```python
def create_segments(narrations, output_dir):
    segments = []
    offset = 0
    
    for i, narration in enumerate(narrations):
        audio_file = f"narration_{i+1}.mp3"
        
        # Transcribe with Whisper, using narration as prompt for accuracy
        t_segments = captacity.transcriber.transcribe_locally(
            audio_file=audio_file,
            prompt=narration,  # Helps Whisper accuracy
        )
        
        # Offset timestamps for multi-segment video
        for segment in t_segments:
            segment["start"] += offset
            segment["end"] += offset
            for word in segment["words"]:
                word["start"] += offset
                word["end"] += offset
        
        segments.extend(t_segments)
        offset += get_audio_duration(audio_file) / 1000
    
    return segments

# Apply captions to video
captacity.add_captions(
    video_file=input_path,
    output_file=output_path,
    segments=segments,
    **caption_settings,
)
```

---

## RedditShortVideoMaker (Reddit → Short)

**Type:** Reddit post → Short video  
**Approach:** Clean sequential pipeline

### Pipeline

```
Background Video → Reddit Post → Text Extraction → TTS → Screenshots → Video Edit
```

### Key Patterns

**Config-Driven Pipeline:**
```python
config = configparser.ConfigParser()
config.read('config.ini')

# Sequential pipeline steps
background_video = get_background_video(config['Preferences']['background_youtube_url'])
post = retrieve_post(config['Preferences']['subreddit'], ...)
text = get_text(post)
clean_text = clean_strings(text)
screenshots = take_screenshots(post.url, ...)
speech_files = text_to_speech(clean_text, ...)
edited_video = edit_video(background_video, screenshots, speech_files)
delete_assets()
```

**Text Cleaning:**
```python
def clean_strings(text):
    # Remove markdown, special chars, URLs
    # Split into speakable chunks
    # Handle abbreviations
    pass
```

---

## AI-Short-Creator (Long → Short Clipping)

**Type:** Long video → Multiple short clips  
**Approach:** LLM identifies viral moments, Remotion for captions

### Pipeline

```
Download Video → Extract Transcript → LLM Analyze → Cut Clips → Add Captions
```

### Key Patterns

**LLM Viral Moment Detection:**
```python
response_obj = [
    {
        "start_time": 0.0,
        "end_time": 55.26,
        "description": "main description",
        "duration": 55.26
    },
    # ... more segments
]

prompt = f"""This is a transcript of a video/podcast. 
Please identify the most viral sections from this part of the video.
Make sure they are more than 30 seconds in duration.
Make sure you provide extremely accurate timestamps.
Respond only in this format {json.dumps(response_obj)}, I just want JSON.

Here is the Transcription:
{subtitle_content}"""

messages = [
    {"role": "system", "content": "You are ViralGPT. Master at reading transcripts and identifying viral content."},
    {"role": "user", "content": prompt}
]

response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo-16k",
    messages=messages,
)

# Extract viral segments
viral_segments = json.loads(response.choices[0]['message']['content'])
```

**Remotion Caption Component:**
```tsx
// Subtitles.tsx
import parseSRT from 'parse-srt';
import { useCurrentFrame, useVideoConfig } from 'remotion';

const useWindowedFrameSubs = (src: string, options) => {
    const { fps } = useVideoConfig();
    const parsed = useMemo(() => parseSRT(src), [src]);
    
    return useMemo(() => {
        return parsed
            .map((item) => ({
                item,
                start: Math.floor(item.start * fps),
                end: Math.floor(item.end * fps),
            }))
            .filter(({ start }) => start >= windowStart && start <= windowEnd)
            .map(({ item, start, end }) => ({ ...item, start, end }));
    }, [fps, parsed, windowStart, windowEnd]);
};

export const PaginatedSubtitles = ({
    subtitles,
    startFrame,
    endFrame,
    linesPerPage,
}) => {
    const frame = useCurrentFrame();
    const subs = useWindowedFrameSubs(subtitles, { windowStart: startFrame, windowEnd: endFrame });
    
    // Only show current and following sentences
    const currentSentences = subs.filter(word => word.start < frame);
    
    return (
        <div>
            {currentSentences.map((item) => (
                <Word key={item.id} frame={frame} item={item} />
            ))}
        </div>
    );
};
```

---

## ClipForge/shorts_maker (Complete Python Reference)

**Type:** Reddit post → Fully captioned video  
**Approach:** Clean modular architecture with config-driven pipeline

### Key Patterns

**Modular Class Design:**
```python
class ShortsMaker:
    """Content acquisition and audio generation"""
    def get_reddit_post(self, url=None): ...
    def generate_audio(self, source_txt, output_audio): ...
    def generate_audio_transcript(self, source_audio_file): ...

class MoviepyCreateVideo:
    """Video composition and rendering"""
    def __init__(self, config_file, speed_factor=1.0): ...
    def prepare_background_video(self): ...
    def create_text_clips(self): ...
    def prepare_audio(self): ...
    def __call__(self, output_path): ...
```

**Text Abbreviation Handling:**
```python
ABBREVIATION_TUPLES = [
    ("AITA", "Am I the asshole ", " "),
    ("WIBTA", "Would I be the asshole ", " "),
    ("NTA", "Not the asshole ", " "),
    ("YTA", "You're the Asshole", ""),
    (" BF ", " boyfriend ", ""),
    (" GF ", " girlfriend ", ""),
]

def abbreviation_replacer(text, abbreviation, replacement, padding=""):
    text = text.replace(abbreviation + padding, replacement)
    text = text.replace(padding + abbreviation, replacement)
    return text
```

**Word-Level Caption Clips:**
```python
def create_text_clips(self):
    for word in self.word_transcript:
        clip = (
            TextClip(
                font=self.font_path,
                text=word["word"],
                font_size=int(0.06 * self.bg_video.size[0]),
                size=(int(0.8 * self.bg_video.size[0]), int(0.8 * self.bg_video.size[0])),
                color=self.color,
                bg_color=(0, 0, 0, 100),
                text_align="center",
                method="caption",
                stroke_color="black",
                stroke_width=1,
                transparent=True,
            )
            .with_start(word["start"] + self.delay)
            .with_end(word["end"] + self.delay)
            .with_position(("center", "center"))
        )
        self.text_clips.append(clip)
```

**9:16 Crop Pattern:**
```python
def prepare_background_video(self):
    width, height = self.bg_video.size
    
    # Random segment selection
    random_start = random.uniform(20, self.bg_video.duration - audio_duration - 20)
    self.bg_video = self.bg_video.subclipped(random_start, random_end)
    
    # Crop to 9:16 aspect ratio
    self.bg_video = self.bg_video.cropped(
        x_center=width/2, 
        width=int(height * 9/16) & -2  # Ensure even width
    )
    
    # Add fade effects
    self.bg_video = self.bg_video.with_effects([
        vfx.FadeIn(self.fade_time), 
        vfx.FadeOut(self.fade_time)
    ])
```

---

## Common Patterns Across All Repos

### 1. Pipeline Structure

All repos follow this pattern:
```
Input Content
    ↓
Script Generation (LLM)
    ↓
Text-to-Speech (ElevenLabs/OpenAI/EdgeTTS)
    ↓
Transcription (Whisper)
    ↓
Visual Assets (AI images or screenshots or background video)
    ↓
Video Composition (MoviePy/FFmpeg/Remotion)
    ↓
Caption Overlay
    ↓
Export
```

### 2. Word-Level Timing

Critical for good captions:
```python
# All repos rely on word-level timestamps
word_timings = [
    {"word": "Hello", "start": 0.0, "end": 0.3},
    {"word": "world", "start": 0.4, "end": 0.8},
    # ...
]
```

### 3. Vertical Video Format

All target 9:16 (1080x1920):
```python
width, height = 1080, 1920  # Standard vertical video
frame_rate = 30
```

### 4. Multi-Engine TTS

Support multiple providers:
```python
TTS_ENGINES = {
    "elevenlabs": ElevenLabsTTS,
    "openai": OpenAITTS,
    "edge": EdgeTTS,  # Free!
    "kokoro": KokoroTTS,  # Local
}
```

### 5. LLM for Content Intelligence

All use LLM for:
- Script generation
- Viral moment detection
- Image description generation
- Title/description generation

---

## TypeScript Adaptation

### Unified Pipeline

```typescript
// src/pipeline/types.ts
export interface PipelineConfig {
  contentSource: ContentSource;
  ttsEngine: TTSEngine;
  captionStyle: CaptionStyle;
  outputFormat: OutputFormat;
}

export interface ContentSource {
  type: 'reddit' | 'text' | 'url' | 'product';
  data: any;
}

export interface PipelineResult {
  videoPath: string;
  metadata: {
    duration: number;
    script: string;
    captions: CaptionSegment[];
  };
}
```

### Pipeline Implementation

```typescript
// src/pipeline/ShortVideoPipeline.ts
export class ShortVideoPipeline {
  constructor(
    private scriptGenerator: ScriptGenerator,
    private ttsEngine: TTSEngine,
    private transcriber: Transcriber,
    private renderer: VideoRenderer,
  ) {}
  
  async generate(config: PipelineConfig): Promise<PipelineResult> {
    // Step 1: Generate script
    const script = await this.scriptGenerator.generate(config.contentSource);
    
    // Step 2: Generate TTS audio
    const audioPath = await this.ttsEngine.synthesize(script.narration);
    
    // Step 3: Transcribe for word-level timing
    const segments = await this.transcriber.transcribe(audioPath, script.narration);
    
    // Step 4: Generate visual assets
    const visuals = await this.generateVisuals(script.imageDescriptions);
    
    // Step 5: Render video with Remotion
    const videoPath = await this.renderer.render({
      audio: audioPath,
      segments,
      visuals,
      captionStyle: config.captionStyle,
    });
    
    return {
      videoPath,
      metadata: {
        duration: script.estimatedDuration,
        script: script.narration,
        captions: segments,
      },
    };
  }
}
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **LLM script generation prompts** - Proven prompts for shorts
2. **Word-level caption timing** - Essential for good UX
3. **9:16 crop pattern** - Standard vertical video
4. **Multi-TTS architecture** - Flexibility for different use cases
5. **Segment offset calculation** - For multi-part narrations

### Patterns to Implement 🔧

1. **Config-driven pipeline** - Easy customization
2. **Modular class design** - Separate concerns
3. **Abbreviation handling** - Clean TTS input
4. **Crossfade transitions** - Professional look
5. **Background video with random segment** - Consistent visual

### Future Consideration 🔮

1. **Parallel processing** - Generate visuals while TTS runs
2. **Caching** - Reuse TTS for repeated scripts
3. **A/B testing** - Compare caption styles
4. **Analytics** - Track what works

---

## Lessons Learned

1. **Word timing is critical** - Users expect TikTok-quality captions
2. **LLM prompts need structure** - Format enforcement prevents parsing errors
3. **Whisper prompt helps** - Passing expected text improves accuracy
4. **Segment offsets are tricky** - Must track cumulative time
5. **9:16 is non-negotiable** - Every platform expects vertical
6. **Fade transitions look professional** - 1-2 second crossfades work well
7. **Clean text before TTS** - Abbreviations, special chars cause issues

---

**Status:** Research complete. All major patterns documented.
