# Deep Dive: Clipping Tools & Scene Detection

**Date:** 2026-01-02  
**Repos:** `vendor/clipping/FunClip/`, `vendor/clipping/pyscenedetect/`, `vendor/Clip-Anything/`  
**Priority:** ⭐ HIGH - Essential for long-form to short-form conversion

---

## Executive Summary

Analysis of clipping tools reveals two major approaches:

1. **Text-based clipping (FunClip)** - Clip by transcript/content
2. **Visual-based scene detection (pyscenedetect)** - Clip by visual changes

Both are complementary for our use case.

### Why This Matters

- ✅ **Long-form → Short-form** - Extract clips from product demos
- ✅ **LLM-guided clipping** - AI selects best segments
- ✅ **Speaker-aware** - Extract specific speaker segments
- ✅ **Scene boundaries** - Detect natural cut points

---

## FunClip (Alibaba DAMO Academy)

**Type:** Text/transcript-based video clipping  
**Language:** Python  
**License:** MIT

### Core Concept

FunClip uses ASR (Automatic Speech Recognition) to create transcript with timestamps, then allows clipping by text selection:

```
Video → ASR → Transcript with timestamps → Select text → Extract matching video
```

### Architecture

```python
class VideoClipper:
    def __init__(self, funasr_model):
        self.funasr_model = funasr_model  # FunASR model

    def video_recog(self, video_filename, sd_switch='no', hotwords=""):
        """Extract audio, run ASR, return transcript with timestamps"""
        video = mpy.VideoFileClip(video_filename)
        video.audio.write_audiofile(audio_file)
        wav = librosa.load(audio_file, sr=16000)[0]

        rec_result = self.funasr_model.generate(
            wav,
            return_spk_res=(sd_switch == 'Yes'),  # Speaker diarization
            sentence_timestamp=True,
            hotword=hotwords,  # Custom vocabulary
        )

        return res_text, res_srt, state

    def video_clip(self, dest_text, start_ost, end_ost, state):
        """Clip video by matching text to transcript"""
        # Find timestamp ranges for matching text
        for _dest_text in dest_text.split('#'):
            ts = proc(recog_res_raw, timestamp, _dest_text)
            all_ts.extend(ts)

        # Extract video segments
        for _ts in all_ts:
            start, end = _ts[0] / 16000, _ts[1] / 16000
            video_clip = video.subclip(start, end)
            concate_clip.append(video_clip)

        # Concatenate clips
        final = concatenate_videoclips(concate_clip)
        return final
```

### LLM Integration

FunClip integrates LLM for **smart clipping**:

```python
# Prompt template for LLM clipping
PROMPT = """
你是一个视频srt字幕剪辑工具，根据如下要求剪辑对应的片段：
剪辑出以下片段中最有意义的、尽可能连续的部分，
按如下格式输出：1. [开始时间-结束时间] 文本

原始srt字幕如下：
{srt_content}
"""

# LLM generates timestamps to clip
def llm_clip(srt_content):
    response = openai.chat.completions.create(
        messages=[{"role": "user", "content": PROMPT.format(srt_content=srt_content)}],
        model="gpt-3.5-turbo",
    )
    # Parse timestamps from response
    return parse_timestamps(response.choices[0].message.content)
```

### Key Features

1. **Speaker diarization** - Clip by speaker (e.g., "spk0#spk3")
2. **Hotword boosting** - Improve recognition of specific terms
3. **Multi-segment clipping** - Clip multiple non-contiguous segments
4. **SRT generation** - Auto-generate subtitles for clips
5. **LLM-guided selection** - AI picks best clips

---

## PySceneDetect

**Type:** Visual scene detection  
**Language:** Python  
**License:** BSD-3-Clause

### Core Concept

Detects scene changes based on visual content (cuts, fades):

```python
from scenedetect import detect, ContentDetector, split_video_ffmpeg

# Detect scenes
scene_list = detect('video.mp4', ContentDetector())

# Split video at scene boundaries
split_video_ffmpeg('video.mp4', scene_list)
```

### Detection Algorithms

| Algorithm           | Use Case                         | Speed  |
| ------------------- | -------------------------------- | ------ |
| `ContentDetector`   | Fast cuts, hard transitions      | Fast   |
| `AdaptiveDetector`  | Camera movement, gradual changes | Medium |
| `ThresholdDetector` | Fades, black screens             | Fast   |
| `HistogramDetector` | Color histogram changes          | Medium |

### API Usage

```python
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
from scenedetect.video_splitter import split_video_ffmpeg

def split_video_into_scenes(video_path, threshold=27.0):
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    scene_manager.detect_scenes(video, show_progress=True)

    scene_list = scene_manager.get_scene_list()

    # Each scene is (start_timecode, end_timecode)
    for i, scene in enumerate(scene_list):
        print(f'Scene {i+1}: {scene[0].get_timecode()} - {scene[1].get_timecode()}')

    # Optional: split into separate files
    split_video_ffmpeg(video_path, scene_list, show_progress=True)

    return scene_list
```

---

## Clip-Anything (Multimodal AI)

**Type:** Prompt-based multimodal clipping  
**Approach:** Uses LLM to analyze visual, audio, and sentiment cues

### Concept

"Clip any moment from any video with prompts"

```
User Prompt: "Find moments where the speaker looks excited"
     ↓
Multimodal Analysis (visual + audio + sentiment)
     ↓
Scored Scenes (virality rating)
     ↓
Extracted Clips
```

### Features

- **Visual analysis** - Object/scene/action detection
- **Audio analysis** - Speech, music, sound effects
- **Sentiment analysis** - Emotional tone detection
- **Virality scoring** - Predicts engaging moments
- **Custom prompts** - Natural language clip selection

### API (Commercial)

```bash
# Vadoo.tv API for AI clipping
POST https://api.vadoo.tv/clips
{
  "video_url": "https://...",
  "prompt": "Find the funniest moments",
  "max_clips": 5
}
```

---

## ClipForge / shorts_maker

**Type:** End-to-end Reddit → Short video  
**Pattern:** Complete pipeline for reference

### Pipeline

```python
# 1. Get Reddit content
get_post.get_reddit_post(url="https://reddit.com/...")

# 2. Generate audio (TTS)
get_post.generate_audio(
    source_txt=script,
    output_audio="audio.wav",
)

# 3. Generate transcript (WhisperX)
get_post.generate_audio_transcript(
    source_audio_file="audio.wav",
    source_text_file="script.txt",
)

# 4. Create video (MoviePy)
create_video = MoviepyCreateVideo(config_file="setup.yml")
create_video(output_path="output.mp4")
```

### Key Patterns

**Text processing for TTS:**

```python
ABBREVIATION_TUPLES = [
    ("AITA", "Am I the asshole ", " "),
    ("NTA", "Not the asshole ", " "),
    (" BF ", " boyfriend ", ""),
    (" GF ", " girlfriend ", ""),
]

def abbreviation_replacer(text, abbreviation, replacement, padding=""):
    text = text.replace(abbreviation + padding, replacement)
    text = text.replace(padding + abbreviation, replacement)
    return text
```

**Video composition:**

```python
# Random background video segment
random_start = random.uniform(20, bg_video.duration - audio_clip.duration - 20)
video = bg_video.subclipped(random_start, random_end)

# Crop to 9:16 aspect ratio
video = video.cropped(x_center=width/2, width=int(height * 9/16) & -2)

# Add fade effects
video = video.with_effects([vfx.FadeIn(2), vfx.FadeOut(2)])

# Text overlay with word-level timing
for word in word_transcript:
    clip = TextClip(
        text=word["word"],
        font_size=int(0.06 * video.size[0]),
    ).with_start(word["start"]).with_end(word["end"])
```

---

## TypeScript Implementation

### Clipping Service Interface

```typescript
// src/clipping/types.ts
export interface ClipRequest {
  videoPath: string;
  method: 'text' | 'scene' | 'llm';
  options: TextClipOptions | SceneClipOptions | LLMClipOptions;
}

export interface TextClipOptions {
  transcript: TranscriptSegment[];
  targetText: string[]; // Text to find and clip
  offsetMs?: { start: number; end: number };
}

export interface SceneClipOptions {
  threshold: number; // 0-100, lower = more sensitive
  minSceneLength: number; // Minimum scene duration in seconds
  detector: 'content' | 'adaptive' | 'threshold';
}

export interface LLMClipOptions {
  transcript: TranscriptSegment[];
  prompt: string; // e.g., "Find the most engaging moments"
  maxClips: number;
}

export interface ClipResult {
  clips: VideoClip[];
  metadata: ClipMetadata;
}

export interface VideoClip {
  startTime: number; // seconds
  endTime: number;
  text?: string; // Associated transcript
  score?: number; // Relevance/virality score
}
```

### Text-Based Clipper

```typescript
// src/clipping/textClipper.ts
export class TextClipper {
  constructor(private ffmpeg: FFmpegWrapper) {}

  async clip(videoPath: string, options: TextClipOptions): Promise<ClipResult> {
    const clips: VideoClip[] = [];

    for (const targetText of options.targetText) {
      // Find matching segments in transcript
      const matches = this.findTextMatches(options.transcript, targetText);

      for (const match of matches) {
        clips.push({
          startTime: match.start + (options.offsetMs?.start || 0) / 1000,
          endTime: match.end + (options.offsetMs?.end || 0) / 1000,
          text: match.text,
        });
      }
    }

    // Extract clips using FFmpeg
    const outputPaths = await Promise.all(
      clips.map((clip, i) =>
        this.ffmpeg.extractClip(videoPath, clip.startTime, clip.endTime, `clip_${i}.mp4`)
      )
    );

    return { clips, metadata: { outputPaths } };
  }

  private findTextMatches(
    transcript: TranscriptSegment[],
    targetText: string
  ): TranscriptSegment[] {
    const normalized = targetText.toLowerCase();
    return transcript.filter((seg) => seg.text.toLowerCase().includes(normalized));
  }
}
```

### LLM-Guided Clipper

```typescript
// src/clipping/llmClipper.ts
import { generateObject } from 'ai';
import { z } from 'zod';

const ClipSelectionSchema = z.object({
  clips: z.array(
    z.object({
      startTime: z.number().describe('Start time in seconds'),
      endTime: z.number().describe('End time in seconds'),
      reason: z.string().describe('Why this clip is engaging'),
      viralityScore: z.number().min(0).max(100),
    })
  ),
});

export class LLMClipper {
  constructor(
    private model: LanguageModel,
    private ffmpeg: FFmpegWrapper
  ) {}

  async clip(videoPath: string, options: LLMClipOptions): Promise<ClipResult> {
    // Format transcript as SRT-like text
    const transcriptText = this.formatTranscript(options.transcript);

    // Ask LLM to select clips
    const { object } = await generateObject({
      model: this.model,
      schema: ClipSelectionSchema,
      prompt: `You are a video editor selecting clips for short-form content.

Transcript:
${transcriptText}

User request: ${options.prompt}

Select up to ${options.maxClips} clips that best match the request.
Each clip should be 15-60 seconds long.
Prioritize engaging, complete thoughts or demonstrations.`,
    });

    // Extract selected clips
    const clips = object.clips.map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      text: this.getTranscriptSlice(options.transcript, c.startTime, c.endTime),
      score: c.viralityScore,
    }));

    return { clips, metadata: { llmReasoning: object.clips } };
  }

  private formatTranscript(transcript: TranscriptSegment[]): string {
    return transcript
      .map(
        (seg, i) =>
          `${i}\n${this.formatTime(seg.start)} --> ${this.formatTime(seg.end)}\n${seg.text}\n`
      )
      .join('\n');
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0').replace('.', ',')}`;
  }
}
```

### Scene Detector (via FFmpeg/Python subprocess)

```typescript
// src/clipping/sceneDetector.ts
export class SceneDetector {
  async detectScenes(videoPath: string, options: SceneClipOptions): Promise<VideoClip[]> {
    // Use Python subprocess for pyscenedetect
    const result = await this.runPython(`
import json
from scenedetect import detect, ContentDetector, AdaptiveDetector, ThresholdDetector

detector_map = {
    'content': ContentDetector(threshold=${options.threshold}),
    'adaptive': AdaptiveDetector(),
    'threshold': ThresholdDetector(),
}

scenes = detect('${videoPath}', detector_map['${options.detector}'])
output = [{'start': s[0].get_seconds(), 'end': s[1].get_seconds()} for s in scenes]
print(json.dumps(output))
    `);

    const scenes = JSON.parse(result);

    // Filter by minimum scene length
    return scenes.filter((s) => s.end - s.start >= options.minSceneLength);
  }

  private async runPython(script: string): Promise<string> {
    const { spawn } = await import('child_process');
    return new Promise((resolve, reject) => {
      const proc = spawn('python', ['-c', script]);
      let output = '';
      proc.stdout.on('data', (data) => (output += data));
      proc.on('close', (code) => (code === 0 ? resolve(output) : reject(output)));
    });
  }
}
```

---

## Integration Strategy

### Workflow for Product Demo Clipping

```
1. Record full product demo (Playwright)
     ↓
2. Transcribe with WhisperX (word timestamps)
     ↓
3. Scene detection (pyscenedetect)
     ↓
4. LLM selects best segments:
   - "Show the most impressive features"
   - "Find moments with clear explanations"
     ↓
5. Extract clips with transitions
     ↓
6. Add captions + render
```

### Combined Clipping Service

```typescript
// src/clipping/index.ts
export class ClippingService {
  constructor(
    private textClipper: TextClipper,
    private sceneDetector: SceneDetector,
    private llmClipper: LLMClipper
  ) {}

  async findBestClips(
    videoPath: string,
    transcript: TranscriptSegment[],
    prompt: string
  ): Promise<VideoClip[]> {
    // 1. Get scene boundaries (natural cut points)
    const scenes = await this.sceneDetector.detectScenes(videoPath, {
      threshold: 27,
      minSceneLength: 3,
      detector: 'content',
    });

    // 2. LLM selects best content segments
    const { clips } = await this.llmClipper.clip(videoPath, {
      transcript,
      prompt,
      maxClips: 5,
    });

    // 3. Snap to scene boundaries for clean cuts
    return clips.map((clip) => this.snapToSceneBoundary(clip, scenes));
  }

  private snapToSceneBoundary(clip: VideoClip, scenes: VideoClip[]): VideoClip {
    // Find nearest scene boundary for start/end
    const snapStart = this.findNearestBoundary(clip.startTime, scenes, 'start');
    const snapEnd = this.findNearestBoundary(clip.endTime, scenes, 'end');

    return { ...clip, startTime: snapStart, endTime: snapEnd };
  }
}
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **PySceneDetect** - Scene boundary detection
2. **LLM clip selection pattern** - AI picks best moments
3. **Word-level transcript alignment** - From WhisperX
4. **Multi-segment concatenation** - Combine non-contiguous clips

### Patterns to Implement 🔧

1. **Unified clipping interface** - Text, scene, LLM methods
2. **Scene-snapped cuts** - Clean transitions at scene boundaries
3. **Virality scoring** - Predict engaging moments
4. **Speaker isolation** - Clip by speaker ID

### Future Consideration 🔮

1. **Multimodal analysis** - Visual + audio + sentiment
2. **A/B testing** - Compare clip selections
3. **User feedback loop** - Learn what works

---

## Lessons Learned

1. **Text + Scene = Best clips** - Combine transcript with visual detection
2. **LLM selection > manual** - AI finds non-obvious good moments
3. **Scene boundaries matter** - Cuts at scene changes feel natural
4. **Speaker diarization helps** - For multi-speaker content
5. **Word-level timestamps essential** - For precise clipping

---

**Status:** Research complete. Core patterns identified for implementation.
