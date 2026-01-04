# Research: Demographic-Specific Patterns in Short-Form Video Content

**Date:** 2026-01-05  
**Researcher:** content-machine team  
**Status:** Complete  
**Scope:** Gen Z content patterns, platform differences, pacing configurations, background video types, split-screen patterns

---

## Executive Summary

Analysis of 15+ vendored short-form video generators reveals distinct configuration patterns for different demographics and content archetypes. Key findings:

1. **No explicit "brainrot" or "Gen Z" presets exist** in any repo - differentiation is implicit through configuration
2. **Pacing is the primary differentiator** - scene duration ranges from 2s (brainrot) to 8s (educational)
3. **Background video types** are categorized: gameplay (Gen Z), stock footage (educational), abstract (motivational)
4. **Platform differences** are primarily aspect ratio and duration limits
5. **Music mood + caption styling** creates the demographic "feel"

---

## 1. Gen Z / Brainrot Content Patterns

### 1.1 Defining Characteristics

| Feature | Brainrot / Gen Z | Source |
|---------|------------------|--------|
| Scene Duration | 1.5-3 seconds | Implicit in `video_clip_duration` configs |
| Voice Rate | 1.2-1.4x normal | MoneyPrinterTurbo `voice_rate` |
| Music Volume | High (0.4-0.7) | short-video-maker-gyori `MusicVolumeEnum.high` |
| Caption Position | Center screen | captacity `position = ("center", "center")` |
| Caption Font | Bold/playful (Bangers, LuckiestGuy) | ShortGPT `LuckiestGuy-Regular.ttf` |
| Word Highlighting | Active word highlighted | captacity `highlight_current_word = True` |
| Background Video | Gameplay (Subway Surfers, Minecraft) | ShortGPT template_asset_db.json |

### 1.2 Background Video Types (From ShortGPT Asset Database)

```json
// vendor/ShortGPT/.database/template_asset_db.json
{
  "Car race gameplay": {
    "type": "background video",
    "url": "https://www.youtube.com/watch?v=gBsJA8tCeyc"
  },
  "Minecraft jumping circuit": {
    "type": "background video", 
    "url": "https://www.youtube.com/watch?v=Pt5_GSKIWQM"
  },
  "Ski gameplay": {
    "type": "background video",
    "url": "https://www.youtube.com/watch?v=8ao1NAOVKTU"
  }
}
```

**Pattern:** Hypnotic, repetitive gameplay that doesn't require context - viewers can "zone out" while listening.

### 1.3 Brainrot Configuration (Synthesized from Repos)

```typescript
// Hypothetical brainrot config based on extracted patterns
const brainrotConfig = {
  pacing: {
    sceneDurationMs: 2000,        // Very fast cuts
    voiceRate: 1.25,              // Fast speech
    paddingBackMs: 500,           // Quick endings
  },
  audio: {
    musicMood: 'euphoric',        // High energy
    musicVolume: 0.7,             // Louder than voice (0.7 vs 1.0)
    voiceStyle: 'energetic',
  },
  captions: {
    position: 'center',
    fontSize: 130,                // Large (captacity default)
    fontFamily: 'Bangers-Regular.ttf',
    fontColor: 'yellow',          // Bright colors
    highlightCurrentWord: true,
    wordHighlightColor: 'red',
    strokeWidth: 3,
    strokeColor: 'black',
    textTransform: 'uppercase',   // ALL CAPS
  },
  background: {
    type: 'gameplay',
    examples: ['subway_surfers', 'minecraft_parkour', 'satisfying_slime'],
  }
};
```

### 1.4 Caption Styling for Gen Z (From captacity)

```python
# vendor/captacity/captacity/__init__.py
def add_captions(
    font = "Bangers-Regular.ttf",     # Bold, playful font
    font_size = 130,                   # Large text
    font_color = "yellow",             # Bright, attention-grabbing
    stroke_width = 3,                  # Thick outline
    stroke_color = "black",            # High contrast
    highlight_current_word = True,     # Karaoke-style highlighting
    word_highlight_color = "red",      # Contrasting highlight
    line_count = 2,                    # Max 2 lines
    position = ("center", "center"),   # Center of screen
    shadow_strength = 1.0,             # Strong shadow
):
```

---

## 2. Educational Content Patterns

### 2.1 Defining Characteristics

| Feature | Educational | Source |
|---------|-------------|--------|
| Scene Duration | 5-8 seconds | MoneyPrinterTurbo default 5s |
| Voice Rate | 0.9-1.0x | Slower for comprehension |
| Music Volume | Low (0.1-0.2) | Subtle, non-distracting |
| Caption Position | Bottom | Traditional subtitle placement |
| Caption Font | Clean (Inter, Roboto) | Professional appearance |
| Word Highlighting | Off | Less distraction |
| Background Video | Stock footage, diagrams | Pexels/Pixabay integration |

### 2.2 Educational Configuration

```typescript
const educationalConfig = {
  pacing: {
    sceneDurationMs: 6000,        // Longer scenes for comprehension
    voiceRate: 0.95,              // Slightly slower
    paddingBackMs: 2000,          // Time to absorb info
  },
  audio: {
    musicMood: 'contemplative',   // Thinking music
    musicVolume: 0.2,             // Background only
    voiceStyle: 'calm',
  },
  captions: {
    position: 'bottom',
    fontSize: 60,                 // Smaller, less intrusive
    fontFamily: 'Inter',
    fontColor: '#FFFFFF',
    highlightCurrentWord: false,
    backgroundColor: 'transparent',
    strokeWidth: 2,
    strokeColor: '#000000',
  },
  background: {
    type: 'stock',
    source: 'pexels',             // MoneyPrinterTurbo default
  }
};
```

### 2.3 Stock Footage Integration (MoneyPrinterTurbo)

```toml
# vendor/MoneyPrinterTurbo/config.example.toml
[app]
video_source = "pexels"  # "pexels" or "pixabay"
pexels_api_keys = []
pixabay_api_keys = []
```

```python
# vendor/MoneyPrinterTurbo/app/services/video.py
def combine_videos(
    video_paths: List[str],
    audio_file: str,
    video_aspect: VideoAspect = VideoAspect.portrait,
    video_concat_mode: VideoConcatMode = VideoConcatMode.random,
    max_clip_duration: int = 5,  # ← Scene duration control
):
    # Clips are shuffled/concatenated until audio duration is filled
```

---

## 3. Story-Driven Content (Reddit Stories)

### 3.1 Defining Characteristics

| Feature | Reddit/Story | Source |
|---------|--------------|--------|
| Scene Duration | 4-5 seconds | Match narration pacing |
| Voice Rate | 1.0-1.1x | Conversational |
| Music Volume | Medium (0.3-0.45) | Builds atmosphere |
| Caption Position | Center | Emphasis |
| Caption Font | Bold (LuckiestGuy) | Engagement |
| Background Video | Gaming/satisfying | Split attention |
| Reddit Image Overlay | Yes | ShortGPT reddit_short_engine |

### 3.2 Reddit Engine Pattern (ShortGPT)

```python
# vendor/ShortGPT/shortGPT/engine/reddit_short_engine.py
class RedditShortEngine(ContentShortEngine):
    def __init__(self, voiceModule, background_video_name, background_music_name, ...):
        super().__init__(short_type="reddit_shorts", ...)
    
    def _generateScript(self):
        # Generate AskReddit-style story
        self._db_script, _ = self.__getRealisticStory(max_tries=1)
        self._db_reddit_question = reddit_gpt.getQuestionFromThread(self._db_script)

    def _prepareCustomAssets(self):
        # Generate Reddit post image overlay
        title, header, n_comments, n_upvotes = reddit_gpt.generateRedditPostMetadata(...)
        imageEditingEngine.ingestFlow(Flow.WHITE_REDDIT_IMAGE_FLOW, {
            "username_text": header,
            "ncomments_text": n_comments,
            "nupvote_text": n_upvotes,
            "question_text": title
        })
```

### 3.3 Reddit Story Prompt Template

```yaml
# vendor/ShortGPT/shortGPT/prompt_templates/reddit_generate_script.yaml
system_prompt: |
  You are a YouTube shorts content creator who makes extremely good YouTube shorts 
  over answers from AskReddit questions.
  
  1- The story must be between 120 and 140 words MAXIMUM.
  2- DO NOT end the story with a moral conclusion.
  3- Make sure that the story is very SPICY, very unusual, HIGHLY entertaining.
  4- The language used must be familiar, casual, even youthful.
  5- The story must be narrated as if you're a friend of the viewer.
  6- Start the story with 'I'
```

---

## 4. Motivational/Quote Content

### 4.1 Defining Characteristics

| Feature | Motivational/Quote | Source |
|---------|-------------------|--------|
| Scene Duration | 3-4 seconds per quote | Match reading pace |
| Voice Rate | 0.85-0.95x | Dramatic pacing |
| Music Volume | High (0.5-0.7) | Emotional impact |
| Caption Position | Center | Focus |
| Background Video | Abstract, nature | Atmospheric |
| Text Animation | Fade in/out | Emphasis |

### 4.2 Quote Channel Pattern (silent_autopost)

```python
# vendor/silent_autopost/Engine/auto.py
command = f'python {upload_video_script_path} --file={final_video_path} \
    --title="The Quote Realm | Quotes #shorts #quotes #deep #advice #motivation" \
    --description="Quotes | The Quote Realm #shorts #quotes" \
    --privacyStatus="public"'
```

---

## 5. Platform Differences

### 5.1 Aspect Ratios & Resolutions

| Platform | Aspect Ratio | Resolution | Max Duration |
|----------|--------------|------------|--------------|
| TikTok | 9:16 | 1080×1920 | 10 min (was 60s) |
| YouTube Shorts | 9:16 | 1080×1920 | 60 seconds |
| Instagram Reels | 9:16 | 1080×1920 | 90 seconds |
| Landscape (YouTube) | 16:9 | 1920×1080 | N/A |
| Square (IG Feed) | 1:1 | 1080×1080 | 60 seconds |

### 5.2 Resolution Configuration (From Repos)

```python
# vendor/MoneyPrinterTurbo/app/models/schema.py
class VideoAspect(str, Enum):
    landscape = "16:9"
    portrait = "9:16"
    square = "1:1"

    def to_resolution(self):
        if self == VideoAspect.landscape.value:
            return 1920, 1080
        elif self == VideoAspect.portrait.value:
            return 1080, 1920
        elif self == VideoAspect.square.value:
            return 1080, 1080
        return 1080, 1920  # Default to portrait
```

```typescript
// vendor/short-video-maker-gyori/src/components/utils.ts
export function getOrientationConfig(orientation: OrientationEnum) {
  const config: Record<OrientationEnum, OrientationConfig> = {
    portrait: {
      width: 1080,
      height: 1920,
      component: AvailableComponentsEnum.PortraitVideo,
    },
    landscape: {
      width: 1920,
      height: 1080,
      component: AvailableComponentsEnum.LandscapeVideo,
    },
  };
  return config[orientation];
}
```

### 5.3 Platform-Specific Caption Positioning

```tsx
// vendor/templates/template-tiktok-base/src/CaptionedVideo/Page.tsx
const container: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  top: undefined,
  bottom: 350,  // ← Bottom-positioned for TikTok
  height: 150,
};

const DESIRED_FONT_SIZE = 120;
const HIGHLIGHT_COLOR = "#39E508";  // Green highlight
```

---

## 6. Pacing Configuration Matrix

### 6.1 Scene Duration by Content Type

| Content Type | Scene Duration | Cuts/Minute | Voice Rate | Source |
|--------------|---------------|-------------|------------|--------|
| Brainrot/Meme | 1.5-2.5s | 24-40 | 1.2-1.4x | Implicit |
| Story/Reddit | 3-5s | 12-20 | 1.0-1.1x | ShortGPT |
| Facts | 3-4s | 15-20 | 1.1x | ShortGPT FactsEngine |
| Educational | 5-8s | 7-12 | 0.9-1.0x | MoneyPrinterTurbo |
| Motivational | 3-4s | 15-20 | 0.85-0.95x | Implicit |
| Product Demo | 4-6s | 10-15 | 1.0x | Custom |

### 6.2 Video Clip Duration (MoneyPrinterTurbo)

```python
# vendor/MoneyPrinterTurbo/app/models/schema.py
class VideoParams(BaseModel):
    video_clip_duration: Optional[int] = 5  # Max seconds before scene change
    voice_rate: Optional[float] = 1.0       # 0.5 = slow, 1.5 = fast
```

### 6.3 Padding Configuration (short-video-maker-gyori)

```typescript
// vendor/short-video-maker-gyori/src/types/shorts.ts
export const renderConfig = z.object({
  paddingBack: z
    .number()
    .optional()
    .describe(
      "For how long the video should be playing after the speech is done, in milliseconds. 1500 is a good value."
    ),
});
```

---

## 7. Music Mood System

### 7.1 Mood Enum (short-video-maker-gyori)

```typescript
// vendor/short-video-maker-gyori/src/types/shorts.ts
export enum MusicMoodEnum {
  sad = "sad",
  melancholic = "melancholic",
  happy = "happy",
  euphoric = "euphoric/high",    // ← Brainrot
  excited = "excited",
  chill = "chill",
  uneasy = "uneasy",             // ← Story/thriller
  angry = "angry",
  dark = "dark",                 // ← Horror/true crime
  hopeful = "hopeful",           // ← Motivational
  contemplative = "contemplative", // ← Educational
  funny = "funny/quirky",        // ← Meme
}
```

### 7.2 Music Library by Mood

```typescript
// vendor/short-video-maker-gyori/src/short-creator/music.ts
private static musicList: Music[] = [
  // Brainrot / Euphoric
  { file: "Like It Loud - Dyalla.mp3", mood: MusicMoodEnum.euphoric },
  { file: "Delayed Baggage - Ryan Stasik.mp3", mood: MusicMoodEnum.euphoric },
  
  // Story / Uneasy
  { file: "Phantom - Density & Time.mp3", mood: MusicMoodEnum.uneasy },
  { file: "Jetski - Telecasted.mp3", mood: MusicMoodEnum.uneasy },
  
  // Educational / Contemplative
  { file: "Crystaline - Quincas Moreira.mp3", mood: MusicMoodEnum.contemplative },
  { file: "Final Soliloquy - Asher Fulero.mp3", mood: MusicMoodEnum.contemplative },
  
  // Motivational / Hopeful
  { file: "Hopeful - Nat Keefe.mp3", mood: MusicMoodEnum.hopeful },
  { file: "Hopeful Freedom - Asher Fulero.mp3", mood: MusicMoodEnum.hopeful },
  
  // Dark / Horror
  { file: "Honey, I Dismembered The Kids - Ezra Lipp.mp3", mood: MusicMoodEnum.dark },
  { file: "Night Hunt - Jimena Contreras.mp3", mood: MusicMoodEnum.dark },
  
  // Funny / Meme
  { file: "Seagull - Telecasted.mp3", mood: MusicMoodEnum.funny },
  { file: "Baby Animals Playing - Joel Cummins.mp3", mood: MusicMoodEnum.funny },
];
```

### 7.3 Music Volume Levels

```typescript
// vendor/short-video-maker-gyori/src/components/utils.ts
export function calculateVolume(level: MusicVolumeEnum): [number, boolean] {
  switch (level) {
    case "muted": return [0, true];
    case "low": return [0.2, false];      // Educational
    case "medium": return [0.45, false];  // Story, balanced
    case "high": return [0.7, false];     // Brainrot, meme, motivational
  }
}
```

---

## 8. TTS Voice Mapping by Demographic

### 8.1 EdgeTTS Voice Options (70+ Languages)

```python
# vendor/ShortGPT/shortGPT/config/languages.py
EDGE_TTS_VOICENAME_MAPPING = {
    Language.ENGLISH: {'male': 'en-AU-WilliamNeural', 'female': 'en-AU-NatashaNeural'},
    Language.SPANISH: {'male': 'es-AR-TomasNeural', 'female': 'es-AR-ElenaNeural'},
    Language.CHINESE: {'male': 'zh-CN-YunxiNeural', 'female': 'zh-CN-XiaoxiaoNeural'},
    # ... 70+ languages
}
```

### 8.2 Kokoro Local TTS Voices

```typescript
// vendor/short-video-maker-gyori/src/types/shorts.ts
export enum VoiceEnum {
  // American Female
  af_heart = "af_heart",
  af_bella = "af_bella",
  af_nova = "af_nova",
  af_sky = "af_sky",
  
  // American Male
  am_adam = "am_adam",
  am_michael = "am_michael",
  am_onyx = "am_onyx",
  
  // British Female/Male
  bf_emma = "bf_emma",
  bf_alice = "bf_alice",
  bm_george = "bm_george",
  bm_daniel = "bm_daniel",
}
```

---

## 9. Caption Animation Patterns

### 9.1 TikTok-Style Caption Animation (Remotion)

```tsx
// vendor/templates/template-tiktok-base/src/CaptionedVideo/SubtitlePage.tsx
const SubtitlePage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },  // Spring animation
    durationInFrames: 5,       // Quick entrance (5 frames)
  });

  return (
    <AbsoluteFill>
      <Page enterProgress={enter} page={page} />
    </AbsoluteFill>
  );
};
```

### 9.2 Word-Level Highlighting (Remotion)

```tsx
// vendor/templates/template-tiktok-base/src/CaptionedVideo/Page.tsx
{page.tokens.map((t) => {
  const active =
    startRelativeToSequence <= timeInMs &&
    endRelativeToSequence > timeInMs;

  return (
    <span
      key={t.fromMs}
      style={{
        display: "inline",
        whiteSpace: "pre",
        color: active ? HIGHLIGHT_COLOR : "white",  // "#39E508" = green
      }}
    >
      {t.text}
    </span>
  );
})}
```

### 9.3 Active Word Background (short-video-maker-gyori)

```tsx
// vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx
const activeStyle = {
  backgroundColor: captionBackgroundColor,  // e.g., "blue"
  padding: "10px",
  marginLeft: "-10px",
  marginRight: "-10px",
  borderRadius: "10px",
};

// Applied to active word:
<span style={{ fontWeight: "bold", ...(active ? activeStyle : {}) }}>
  {text.text}
</span>
```

---

## 10. Split-Screen Implementation

### 10.1 Current State

**Finding:** No vendored repo has explicit split-screen (Subway Surfers + content) implementation.

Split-screen would need to be implemented as:
- CompositeVideoClip with two layers
- Main content scaled to upper portion
- Gameplay video scaled to lower portion

### 10.2 Hypothetical Implementation

```python
# Hypothetical split-screen using MoviePy
from moviepy.editor import VideoFileClip, CompositeVideoClip

def create_split_screen(content_video, gameplay_video, output_path):
    content = VideoFileClip(content_video).resize((1080, 960))  # Top half
    gameplay = VideoFileClip(gameplay_video).resize((1080, 960))  # Bottom half
    
    content = content.set_position(("center", 0))
    gameplay = gameplay.set_position(("center", 960))
    
    final = CompositeVideoClip([content, gameplay], size=(1080, 1920))
    final.write_videofile(output_path)
```

### 10.3 ShortGPT Cropping Pattern

```json
// vendor/ShortGPT/shortGPT/editing_framework/editing_steps/crop_1920x1080_to_short.json
{
  "crop_1920x1080": {
    "type": "video",
    "z": 0,
    "parameters": { "url": null, "audio": false },
    "actions": [
      { "type": "crop_to_aspect_ratio", "param": { "aspect_ratio": 9/16 } }
    ]
  }
}
```

---

## 11. Script Prompt Templates by Content Type

### 11.1 Facts Content (ShortGPT)

```yaml
# vendor/ShortGPT/shortGPT/prompt_templates/facts_generator.yaml
system_prompt: >
  You are an expert content writer of a YouTube shorts channel. 
  You specialize in `facts` shorts.
  Your facts shorts are less than 50 seconds verbally (around 140 words maximum).
  
  Only give the first `hook`, like "Weird facts you don't know."
  Then the facts.
  Keep it short, extremely interesting and original.
```

### 11.2 TikTok Viral Script (TikTokAIVideoGenerator)

```python
# vendor/TikTokAIVideoGenerator/utils/script_generator.py
prompt = f"""
Create a video script with 250 to 280 tokens based on:
- Topic: {topic}
- Style: {style}  # e.g., funny, educational, inspirational
- Target Audience: {target_audience}
- CTA: {cta}

Requirements:
1. Capture attention in the first 3 seconds with a bold statement
2. Deliver concise content in the body (50–65 seconds)
3. Include compelling CTA in the last 10 seconds
"""
```

### 11.3 Trending Content (Viral-Faceless-Shorts-Generator)

```javascript
// vendor/Viral-Faceless-Shorts-Generator/trendscraper/src/index.js
let prompt = `You are a professional content strategist.

Your task is to analyze trending topic JSON with:
- "trend": the name of the trend
- "volume": search volume (e.g., "1M+")
- "breakdown": related search terms

Create:
- "title": Catchy title (<100 chars) with hashtags
- "description": Short description with hashtags
- "body": Full speech script (250-300 words)
  - Natural, fast-paced, engaging
  - Between 15 and 60 seconds
  - Maximize emotional pull, curiosity, or value
`;
```

---

## 12. Demographic-Specific Archetype System (Proposed)

Based on this research, here's a proposed archetype system for content-machine:

```typescript
// src/types/content-archetype.ts
export interface ContentArchetype {
  id: string;
  name: string;
  targetDemographic: 'gen-z' | 'millennial' | 'general' | 'professional';
  
  pacing: {
    sceneDurationMs: number;
    voiceRate: number;
    paddingBackMs: number;
    cutsPerMinute: number;
  };
  
  audio: {
    musicMood: MusicMoodEnum;
    musicVolume: MusicVolumeEnum;
    voiceGender: 'male' | 'female';
    voiceStyle: 'energetic' | 'calm' | 'conversational' | 'dramatic';
  };
  
  captions: {
    position: 'top' | 'center' | 'bottom';
    fontSize: number;
    fontFamily: string;
    fontColor: string;
    highlightCurrentWord: boolean;
    highlightColor: string;
    strokeWidth: number;
    strokeColor: string;
    textTransform: 'uppercase' | 'none';
    animationType: 'spring' | 'fade' | 'none';
  };
  
  background: {
    type: 'gameplay' | 'stock' | 'abstract' | 'product-capture';
    source?: 'pexels' | 'pixabay' | 'local';
    examples: string[];
  };
  
  script: {
    maxWords: number;
    tone: 'casual' | 'professional' | 'dramatic' | 'humorous';
    structure: 'hook-body-cta' | 'story' | 'listicle' | 'question-answer';
    hookDurationSeconds: number;
  };
}
```

### 12.1 Preset Archetypes

```typescript
const ARCHETYPES: ContentArchetype[] = [
  {
    id: 'gen-z-brainrot',
    name: 'Gen Z Brainrot / Meme',
    targetDemographic: 'gen-z',
    pacing: { 
      sceneDurationMs: 2000, 
      voiceRate: 1.25, 
      paddingBackMs: 500,
      cutsPerMinute: 30,
    },
    audio: { 
      musicMood: MusicMoodEnum.euphoric, 
      musicVolume: MusicVolumeEnum.high, 
      voiceGender: 'female',
      voiceStyle: 'energetic',
    },
    captions: { 
      position: 'center', 
      fontSize: 130,
      fontFamily: 'Bangers-Regular.ttf',
      fontColor: 'yellow',
      highlightCurrentWord: true,
      highlightColor: 'red',
      strokeWidth: 3,
      strokeColor: 'black',
      textTransform: 'uppercase',
      animationType: 'spring',
    },
    background: {
      type: 'gameplay',
      examples: ['subway_surfers', 'minecraft_parkour', 'satisfying_slime'],
    },
    script: { 
      maxWords: 100, 
      tone: 'humorous', 
      structure: 'hook-body-cta',
      hookDurationSeconds: 3,
    },
  },
  {
    id: 'educational',
    name: 'Educational / Explainer',
    targetDemographic: 'general',
    pacing: { 
      sceneDurationMs: 6000, 
      voiceRate: 0.95, 
      paddingBackMs: 2000,
      cutsPerMinute: 10,
    },
    audio: { 
      musicMood: MusicMoodEnum.contemplative, 
      musicVolume: MusicVolumeEnum.low,
      voiceGender: 'male',
      voiceStyle: 'calm',
    },
    captions: { 
      position: 'bottom', 
      fontSize: 60,
      fontFamily: 'Inter',
      fontColor: '#FFFFFF',
      highlightCurrentWord: false,
      highlightColor: 'transparent',
      strokeWidth: 2,
      strokeColor: '#000000',
      textTransform: 'none',
      animationType: 'none',
    },
    background: {
      type: 'stock',
      source: 'pexels',
      examples: ['nature', 'technology', 'abstract'],
    },
    script: { 
      maxWords: 150, 
      tone: 'professional', 
      structure: 'listicle',
      hookDurationSeconds: 5,
    },
  },
  {
    id: 'reddit-story',
    name: 'Reddit Story / Narrative',
    targetDemographic: 'millennial',
    pacing: { 
      sceneDurationMs: 4000, 
      voiceRate: 1.0, 
      paddingBackMs: 1500,
      cutsPerMinute: 15,
    },
    audio: { 
      musicMood: MusicMoodEnum.uneasy, 
      musicVolume: MusicVolumeEnum.medium,
      voiceGender: 'male',
      voiceStyle: 'conversational',
    },
    captions: { 
      position: 'center', 
      fontSize: 100,
      fontFamily: 'LuckiestGuy-Regular.ttf',
      fontColor: 'white',
      highlightCurrentWord: true,
      highlightColor: 'blue',
      strokeWidth: 3,
      strokeColor: 'black',
      textTransform: 'uppercase',
      animationType: 'spring',
    },
    background: {
      type: 'gameplay',
      examples: ['minecraft_parkour', 'satisfying_cooking', 'satisfying_cleaning'],
    },
    script: { 
      maxWords: 140, 
      tone: 'casual', 
      structure: 'story',
      hookDurationSeconds: 3,
    },
  },
  {
    id: 'product-demo',
    name: 'Product Demo / Tech',
    targetDemographic: 'professional',
    pacing: { 
      sceneDurationMs: 5000, 
      voiceRate: 1.0, 
      paddingBackMs: 1000,
      cutsPerMinute: 12,
    },
    audio: { 
      musicMood: MusicMoodEnum.chill, 
      musicVolume: MusicVolumeEnum.low,
      voiceGender: 'female',
      voiceStyle: 'calm',
    },
    captions: { 
      position: 'bottom', 
      fontSize: 70,
      fontFamily: 'Inter',
      fontColor: '#FFFFFF',
      highlightCurrentWord: false,
      highlightColor: 'transparent',
      strokeWidth: 2,
      strokeColor: '#000000',
      textTransform: 'none',
      animationType: 'fade',
    },
    background: {
      type: 'product-capture',
      examples: ['screen_recording', 'ui_walkthrough'],
    },
    script: { 
      maxWords: 120, 
      tone: 'professional', 
      structure: 'hook-body-cta',
      hookDurationSeconds: 3,
    },
  },
];
```

---

## 13. Key Configuration Patterns Summary

| Parameter | Brainrot | Educational | Story | Product |
|-----------|----------|-------------|-------|---------|
| `sceneDurationMs` | 2000 | 6000 | 4000 | 5000 |
| `voiceRate` | 1.25 | 0.95 | 1.0 | 1.0 |
| `musicMood` | euphoric | contemplative | uneasy | chill |
| `musicVolume` | high (0.7) | low (0.2) | medium (0.45) | low (0.2) |
| `captionPosition` | center | bottom | center | bottom |
| `fontSize` | 130 | 60 | 100 | 70 |
| `highlightWord` | true | false | true | false |
| `backgroundType` | gameplay | stock | gameplay | product-capture |
| `cutsPerMinute` | 30 | 10 | 15 | 12 |

---

## 14. Implementation Recommendations

1. **Create archetype presets as JSON** - Loadable configuration files
2. **Use Zod schemas** for type-safe archetype validation
3. **Build MusicManager integration** from short-video-maker-gyori pattern
4. **Implement caption components** using Remotion with @remotion/captions
5. **Add voice selection** via EdgeTTS (70+ languages) or Kokoro (local)
6. **Scene duration control** via `video_clip_duration` parameter
7. **Split-screen** needs custom implementation (MoviePy CompositeVideoClip)

---

## 15. References

| File | Pattern |
|------|---------|
| [shorts.ts](../vendor/short-video-maker-gyori/src/types/shorts.ts) | Music moods, voice enums, render config |
| [music.ts](../vendor/short-video-maker-gyori/src/short-creator/music.ts) | Mood-based music library (30+ tracks) |
| [captacity/__init__.py](../vendor/captacity/captacity/__init__.py) | Caption styling API with word highlighting |
| [PortraitVideo.tsx](../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx) | Remotion caption component with active word styling |
| [Page.tsx](../vendor/templates/template-tiktok-base/src/CaptionedVideo/Page.tsx) | TikTok-style word highlighting |
| [schema.py](../vendor/MoneyPrinterTurbo/app/models/schema.py) | VideoParams with pacing controls |
| [video.py](../vendor/MoneyPrinterTurbo/app/services/video.py) | Video combination with clip duration |
| [content_short_engine.py](../vendor/ShortGPT/shortGPT/engine/content_short_engine.py) | 12-step content pipeline |
| [reddit_short_engine.py](../vendor/ShortGPT/shortGPT/engine/reddit_short_engine.py) | Reddit story generation |
| [template_asset_db.json](../vendor/ShortGPT/.database/template_asset_db.json) | Gameplay video assets |
| [languages.py](../vendor/ShortGPT/shortGPT/config/languages.py) | 70+ EdgeTTS voice mappings |
| [config.example.toml](../vendor/MoneyPrinterTurbo/config.example.toml) | Full configuration example |
| [index.js](../vendor/Viral-Faceless-Shorts-Generator/trendscraper/src/index.js) | Trending content + FFmpeg burn |

---

**Last Updated:** 2026-01-05
