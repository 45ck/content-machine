# Layer 3 Category D: Clipping & Scene Detection

**Date:** 2026-01-04  
**Synthesized From:** 9 Deep Dive Documents  
**Layer:** 3 (Category Synthesis)  
**Feeds Into:** Theme 2 - Video Production

---

## Category Summary

Clipping and scene detection tools extract interesting segments from longer videos. Key approaches: **LLM-based selection**, **ML virality scoring**, and **scene boundary detection**.

---

## Tool Comparison

| Tool              | Approach          | Language | Accuracy  | Speed     |
| ----------------- | ----------------- | -------- | --------- | --------- |
| **FunClip**       | LLM-based         | Python   | Excellent | Medium    |
| **Clip-Anything** | ML virality       | Python   | Excellent | Slow      |
| **PySceneDetect** | Visual analysis   | Python   | Good      | Fast      |
| **auto-editor**   | Silence detection | Python   | Good      | Very Fast |
| **autoclipper**   | Combined          | Python   | Good      | Medium    |

---

## Primary Choice: FunClip (Alibaba)

### LLM-Based Highlight Extraction

```python
from funasr import AutoModel

# 1. Transcribe with timestamps
asr_model = AutoModel(model="SenseVoiceSmall")
result = asr_model.generate(audio_path, batch_size=1)

# 2. Use LLM to identify highlights
llm_prompt = f"""
Given this transcript, identify the 5 most engaging segments:
{result['text']}

For each segment, provide:
- Start time
- End time
- Why it's engaging (hook, emotional peak, insight, etc.)
"""

highlights = llm.complete(llm_prompt)

# 3. Extract clips
for highlight in highlights:
    extract_clip(video, highlight.start, highlight.end, f"clip_{i}.mp4")
```

### Key Features

- **SenseVoice ASR** - Fast, accurate transcription
- **LLM highlight selection** - Context-aware
- **Gradio UI** - Easy to use
- **Industrial quality** - Alibaba production

---

## Secondary Choice: Clip-Anything

### Multi-Modal Virality Scoring

```python
# Video understanding with CLIP/BLIP
from transformers import CLIPProcessor, CLIPModel, BlipProcessor

# Analyze frames for visual engagement
def score_frame_engagement(frame):
    # CLIP embedding
    clip_embedding = clip_model.get_image_features(frame)

    # BLIP caption
    caption = blip_model.generate_caption(frame)

    # Engagement scoring
    engagement_score = model.predict([
        clip_embedding,
        text_features(caption),
        audio_features(segment_audio)
    ])

    return engagement_score
```

### Virality Prediction Model

```python
# Features used for virality scoring
features = [
    "visual_diversity",      # Scene changes
    "emotional_intensity",   # Sentiment peaks
    "audio_dynamics",        # Volume changes
    "face_presence",         # People in frame
    "text_engagement",       # Hook quality
    "pacing",                # Cuts per minute
]

# Trained on viral video dataset
virality_score = model.predict(features)
```

---

## Scene Detection: PySceneDetect

### Detect Scene Boundaries

```python
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector

video_manager = VideoManager([video_path])
scene_manager = SceneManager()

# Content detector (visual changes)
scene_manager.add_detector(ContentDetector(threshold=30))

video_manager.start()
scene_manager.detect_scenes(video_manager)

# Get scene list
scene_list = scene_manager.get_scene_list()

for scene in scene_list:
    print(f"Scene: {scene[0].get_timecode()} - {scene[1].get_timecode()}")
```

### Detection Algorithms

| Algorithm             | Best For              |
| --------------------- | --------------------- |
| **ContentDetector**   | General scene changes |
| **ThresholdDetector** | Fade to black         |
| **AdaptiveDetector**  | Variable lighting     |

---

## Silence-Based: auto-editor

### Remove Dead Air

```bash
# Auto-remove silences
auto-editor input.mp4 \
  --margin 0.2sec \
  --silent-threshold 0.04 \
  --video-speed 1.0 \
  --silent-speed 999 \
  --output output.mp4
```

### Python API

```python
import auto_editor

result = auto_editor.edit(
    input_path="input.mp4",
    output_path="output.mp4",
    margin="0.2sec",
    silent_threshold=0.04,
    edit_based_on="audio"
)
```

---

## Combined Approach: autoclipper

### Multi-Signal Detection

```python
# Combines multiple signals
def find_highlights(video_path):
    # 1. Transcribe
    transcript = whisper.transcribe(video_path)

    # 2. Detect scenes
    scenes = pyscenedetect.detect(video_path)

    # 3. Analyze audio energy
    audio_peaks = librosa.onset.onset_detect(audio)

    # 4. LLM analysis
    highlights = llm.analyze(transcript,
        prompt="Find the 5 most engaging moments")

    # 5. Combine signals
    final_clips = merge_signals(
        scenes, audio_peaks, highlights,
        weights=[0.2, 0.3, 0.5]
    )

    return final_clips
```

---

## Highlight Selection Patterns

### Pattern 1: Hook Detection

```python
# First 3 seconds are critical
def has_strong_hook(transcript):
    first_words = get_first_n_words(transcript, 10)

    hook_patterns = [
        r"did you know",
        r"here's how",
        r"watch this",
        r"you won't believe",
        r"the secret to"
    ]

    return any(re.match(p, first_words.lower()) for p in hook_patterns)
```

### Pattern 2: Emotional Peaks

```python
# Find emotional intensity spikes
from textblob import TextBlob

def find_emotional_peaks(transcript):
    sentences = transcript.split('.')
    peaks = []

    for i, sentence in enumerate(sentences):
        sentiment = TextBlob(sentence).sentiment
        if abs(sentiment.polarity) > 0.5:
            peaks.append({
                'index': i,
                'text': sentence,
                'intensity': abs(sentiment.polarity)
            })

    return sorted(peaks, key=lambda x: x['intensity'], reverse=True)[:5]
```

### Pattern 3: Key Insight Detection

```python
# LLM identifies key insights
def find_key_insights(transcript):
    prompt = f"""
    Analyze this transcript and find the 5 most valuable insights:

    {transcript}

    For each insight, provide:
    - The exact quote
    - Why it's valuable
    - Timestamp if available
    """

    return llm.complete(prompt)
```

---

## Long-to-Short Workflow

### AI-Youtube-Shorts-Generator Pattern

```python
# 1. Download video
video_path = yt_dlp.download(youtube_url)

# 2. Transcribe
transcript = whisper.transcribe(video_path)

# 3. Get GPT-4 to select highlights
prompt = f"""
You are a viral video editor. Select 5 segments (30-60s each)
that would make great shorts:

Transcript:
{transcript}

Return timestamps for each segment.
"""

highlights = gpt4.complete(prompt)

# 4. Extract each highlight
for i, highlight in enumerate(highlights):
    extract_clip(
        video_path,
        highlight.start,
        highlight.end,
        f"short_{i}.mp4"
    )

# 5. Reframe for vertical
for clip in clips:
    reframe_vertical(clip, focus="face")
```

### Face-Aware Cropping

```python
import cv2

def reframe_vertical(horizontal_video, output_path):
    cap = cv2.VideoCapture(horizontal_video)

    # Face detection
    face_cascade = cv2.CascadeClassifier('haarcascade_frontalface.xml')

    frames = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Detect faces
        faces = face_cascade.detectMultiScale(frame)

        if len(faces) > 0:
            # Center crop on face
            x, y, w, h = faces[0]
            center_x = x + w // 2

            # 9:16 crop centered on face
            crop_width = frame.shape[0] * 9 // 16
            start_x = max(0, center_x - crop_width // 2)
            end_x = start_x + crop_width

            vertical_frame = frame[:, start_x:end_x]
        else:
            # Center crop
            vertical_frame = center_crop(frame)

        frames.append(vertical_frame)

    export_video(frames, output_path)
```

---

## Integration with content-machine

### Recommended Approach

```typescript
// Clipping pipeline
interface ClippingPipeline {
  // 1. Scene detection
  detectScenes(video: string): Scene[];

  // 2. Transcription
  transcribe(video: string): Transcript;

  // 3. LLM highlight selection
  selectHighlights(transcript: Transcript, count: number): Highlight[];

  // 4. Extract clips
  extractClips(video: string, highlights: Highlight[]): Clip[];

  // 5. Reframe for vertical
  reframeVertical(clip: Clip): Clip;
}
```

### When to Use Each Tool

| Use Case                     | Tool          |
| ---------------------------- | ------------- |
| General highlight extraction | FunClip       |
| Virality prediction          | Clip-Anything |
| Scene boundaries             | PySceneDetect |
| Remove silences              | auto-editor   |
| Combined pipeline            | autoclipper   |

---

## Source Documents

- DD-45: Video processing + clipping + capture
- DD-52: Clipping + publishing + processing
- DD-58: Processing + orchestration + clipping
- DD-64: Clipping + audio + publishing
- DD-68: Connectors + publishing + clipping
- DD-78: Clipping + audio + scene detection
- DD-85: Clipping + publishing ecosystem
- clipping-tools-DEEP
- clipping-video-processing-orchestration-DEEP

---

## Key Takeaway

> **FunClip (LLM-based) produces best highlight selection. Combine with PySceneDetect for scene boundaries and auto-editor for silence removal. For virality prediction, use Clip-Anything's multi-modal scoring.**
