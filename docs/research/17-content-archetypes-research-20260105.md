# Research: Content Styles & Archetypes in Vendored Short-Form Video Generators

**Date:** 2026-01-05  
**Researcher:** content-machine team  
**Status:** Complete  
**Scope:** Template/preset systems, pacing, audio profiles, caption styles, script prompts

---

## Executive Summary

Analysis of 8+ vendored short-form video generators reveals **no explicit "brainrot" vs "educational" archetype system** in any repo. Instead, differentiation happens through:

1. **Engine subclasses** (ShortGPT) - `FactsShortEngine`, `RedditShortEngine`
2. **Prompt templates** (ShortGPT, MoneyPrinterTurbo) - YAML/text prompts per content type
3. **Configuration parameters** (MoneyPrinterTurbo, short-video-maker-gyori) - video params, voice, music mood
4. **JSON scene configs** (vidosy) - declarative video-as-data

**Key Insight:** Content differentiation is primarily achieved through **prompt engineering + voice selection + music mood + caption styling**, not pre-built archetype systems.

---

## 1. Template/Preset Systems

### ShortGPT - Engine Inheritance Pattern

**Architecture:** Abstract `ContentShortEngine` base class with specialized subclasses per content type.

```python
# vendor/ShortGPT/shortGPT/engine/content_short_engine.py
class ContentShortEngine(AbstractContentEngine):
    def __init__(self, short_type: str, background_video_name: str, 
                 background_music_name: str, voiceModule: VoiceModule, ...):
        # 12-step pipeline:
        # 1: _generateScript
        # 2: _generateTempAudio  
        # 3: _speedUpAudio
        # 4: _timeCaptions
        # 5: _generateImageSearchTerms
        # 6: _generateImageUrls
        # 7: _chooseBackgroundMusic
        # 8: _chooseBackgroundVideo
        # 9: _prepareBackgroundAssets
        # 10: _prepareCustomAssets
        # 11: _editAndRenderShort
        # 12: _addYoutubeMetadata
```

**Content Types via Subclasses:**

```python
# vendor/ShortGPT/shortGPT/engine/facts_short_engine.py
class FactsShortEngine(ContentShortEngine):
    def __init__(self, voiceModule, facts_type: str, ...):
        super().__init__(short_type="facts_shorts", ...)
        self._db_facts_type = facts_type  # e.g., "Weird facts", "Science facts"
    
    def _generateScript(self):
        self._db_script = facts_gpt.generateFacts(self._db_facts_type)

# vendor/ShortGPT/shortGPT/engine/reddit_short_engine.py  
class RedditShortEngine(ContentShortEngine):
    def __init__(self, voiceModule, ...):
        super().__init__(short_type="reddit_shorts", ...)
    
    def _generateScript(self):
        # Generates entertaining AskReddit-style stories
        self._db_script, _ = self.__getRealisticStory(max_tries=1)
    
    def _prepareCustomAssets(self):
        # Generates Reddit thread image overlay
        self._db_reddit_thread_image = ...
```

**Pattern:** Each content type is a subclass that overrides `_generateScript()` and optionally `_prepareCustomAssets()` and `_editAndRenderShort()`.

---

### vidosy - JSON Scene Configuration

**Architecture:** Pure JSON video specification - no code, just data.

```json
// vendor/vidosy/demo-vidosy.json
{
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 14
  },
  "audio": {
    "background": "my-background-music.mp3",
    "volume": 0.4,
    "fadeIn": 2,
    "fadeOut": 3
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": {
        "type": "image",    // "image", "video", or "color"
        "value": "my-intro-background.png"
      },
      "text": {
        "content": "Welcome to Vidosy",
        "fontSize": 72,
        "color": "#ffffff",
        "position": "center"
      },
      "audio": {
        "file": "my-intro-narration.mp3",
        "volume": 0.9
      }
    }
  ]
}
```

**Pattern:** Content types would be different JSON templates with varying:
- Scene durations (short vs long cuts)
- Text styling (fontSize, color)
- Background types (fast video cuts vs static images)
- Audio volumes (music vs voiceover balance)

---

### short-video-maker-gyori - TypeScript Zod Schemas

**Architecture:** Strongly-typed configuration via Zod schemas with enum-based options.

```typescript
// vendor/short-video-maker-gyori/src/types/shorts.ts
export enum MusicMoodEnum {
  sad = "sad",
  melancholic = "melancholic",
  happy = "happy",
  euphoric = "euphoric/high",
  excited = "excited",
  chill = "chill",
  uneasy = "uneasy",
  angry = "angry",
  dark = "dark",
  hopeful = "hopeful",
  contemplative = "contemplative",
  funny = "funny/quirky",
}

export enum CaptionPositionEnum {
  top = "top",
  center = "center",
  bottom = "bottom",
}

export const renderConfig = z.object({
  paddingBack: z.number().optional(),
  music: z.nativeEnum(MusicMoodEnum).optional(),
  captionPosition: z.nativeEnum(CaptionPositionEnum).optional(),
  captionBackgroundColor: z.string().optional(),
  voice: z.nativeEnum(VoiceEnum).optional(),
  orientation: z.nativeEnum(OrientationEnum).optional(),
  musicVolume: z.nativeEnum(MusicVolumeEnum).optional(),
});
```

**Pattern:** Content archetypes would be pre-configured `RenderConfig` objects:
- **Brainrot:** `euphoric` music, fast cuts, center captions, bright colors
- **Educational:** `contemplative` music, longer scenes, bottom captions
- **Story:** `uneasy`/`dark` music, minimal captions

---

### MoneyPrinterTurbo - Flat VideoParams

**Architecture:** Pydantic model with all parameters in a single class.

```python
# vendor/MoneyPrinterTurbo/app/models/schema.py
class VideoParams(BaseModel):
    video_subject: str
    video_script: str = ""
    video_aspect: Optional[VideoAspect] = VideoAspect.portrait.value
    video_concat_mode: Optional[VideoConcatMode] = VideoConcatMode.random.value
    video_transition_mode: Optional[VideoTransitionMode] = None
    video_clip_duration: Optional[int] = 5  # ← PACING CONTROL
    video_count: Optional[int] = 1
    
    voice_name: Optional[str] = ""
    voice_volume: Optional[float] = 1.0
    voice_rate: Optional[float] = 1.0  # ← PACING CONTROL
    
    bgm_type: Optional[str] = "random"
    bgm_file: Optional[str] = ""
    bgm_volume: Optional[float] = 0.2
    
    subtitle_enabled: Optional[bool] = True
    subtitle_position: Optional[str] = "bottom"  # top, bottom, center
    font_name: Optional[str] = "STHeitiMedium.ttc"
    text_fore_color: Optional[str] = "#FFFFFF"
    text_background_color: Union[bool, str] = True
    font_size: int = 60
    stroke_color: Optional[str] = "#000000"
    stroke_width: float = 1.5
```

**Pattern:** No built-in archetypes - all configuration is manual per video.

---

## 2. Pacing Configuration

### Scene Duration / Cuts Per Second

| Repo | Parameter | Default | Notes |
|------|-----------|---------|-------|
| MoneyPrinterTurbo | `video_clip_duration` | 5 seconds | Max duration before scene change |
| short-video-maker-gyori | `paddingBack` | 1500ms | Extra time after speech ends |
| vidosy | `scene.duration` | Per-scene | Explicit duration per scene |
| ShortGPT | `background_video_duration` | From asset DB | Background video trimmed to voiceover length |

**Brainrot Pacing Pattern:**
```python
# Hypothetical brainrot config
video_clip_duration = 2  # Very short clips (cuts every 2s)
voice_rate = 1.3  # Faster speech
bgm_volume = 0.4  # Louder music
```

**Educational Pacing Pattern:**
```python
# Hypothetical educational config  
video_clip_duration = 8  # Longer clips
voice_rate = 0.9  # Slower speech
bgm_volume = 0.1  # Subtle background music
```

### Voice Rate Control

```python
# vendor/MoneyPrinterTurbo/app/models/schema.py
voice_rate: Optional[float] = 1.0  # 0.5 = slow, 1.0 = normal, 1.5 = fast

# vendor/ShortGPT/shortGPT/audio/audio_utils.py
def speedUpAudio(input_path, output_path, speed=1.0):
    # Uses ffmpeg to change audio speed
```

---

## 3. Audio/Music Profiles

### short-video-maker-gyori - Mood-Based Music System

```typescript
// vendor/short-video-maker-gyori/src/short-creator/music.ts
export class MusicManager {
  private static musicList: Music[] = [
    { file: "Sly Sky - Telecasted.mp3", mood: MusicMoodEnum.melancholic },
    { file: "Champion - Telecasted.mp3", mood: MusicMoodEnum.chill },
    { file: "Phantom - Density & Time.mp3", mood: MusicMoodEnum.uneasy },
    { file: "Like It Loud - Dyalla.mp3", mood: MusicMoodEnum.euphoric },
    { file: "Honey, I Dismembered The Kids.mp3", mood: MusicMoodEnum.dark },
    { file: "Hopeless - Jimena Contreras.mp3", mood: MusicMoodEnum.sad },
    { file: "Touch - Anno Domini Beats.mp3", mood: MusicMoodEnum.happy },
    { file: "Buckle Up - Jeremy Korpas.mp3", mood: MusicMoodEnum.angry },
    { file: "Hopeful - Nat Keefe.mp3", mood: MusicMoodEnum.hopeful },
    { file: "Crystaline - Quincas Moreira.mp3", mood: MusicMoodEnum.contemplative },
    { file: "Seagull - Telecasted.mp3", mood: MusicMoodEnum.funny },
  ];
}
```

**Music Volume Levels:**
```typescript
// vendor/short-video-maker-gyori/src/components/utils.ts
export function calculateVolume(level: MusicVolumeEnum): [number, boolean] {
  switch (level) {
    case "muted": return [0, true];
    case "low": return [0.2, false];     // Educational, story
    case "medium": return [0.45, false]; // Balanced
    case "high": return [0.7, false];    // Brainrot, meme
  }
}
```

### ShortGPT - EdgeTTS Voice Mapping

```python
# vendor/ShortGPT/shortGPT/config/languages.py
EDGE_TTS_VOICENAME_MAPPING = {
    Language.ENGLISH: {'male': 'en-AU-WilliamNeural', 'female': 'en-AU-NatashaNeural'},
    Language.SPANISH: {'male': 'es-AR-TomasNeural', 'female': 'es-AR-ElenaNeural'},
    # ... 70+ languages with male/female variants
}
```

### MoneyPrinterTurbo - 400+ Voices

```
# vendor/MoneyPrinterTurbo/docs/voice-list.txt
# 400+ EdgeTTS voices organized by language/region
en-US-AriaNeural (Female)
en-US-GuyNeural (Male)
en-US-JennyNeural (Female)
zh-CN-XiaoxiaoNeural (Female)  # Popular for Chinese content
zh-CN-YunxiNeural (Male)
# ... many more
```

---

## 4. Caption Style Variations

### captacity - Python Caption Styling

```python
# vendor/captacity/captacity/__init__.py
def add_captions(
    video_file,
    output_file = "with_transcript.mp4",
    
    # Font styling
    font = "Bangers-Regular.ttf",    # ← BRAINROT: Bold/fun fonts
    font_size = 130,                  # ← BRAINROT: Large text
    font_color = "yellow",            # ← BRAINROT: Bright colors
    
    # Stroke (outline)
    stroke_width = 3,
    stroke_color = "black",
    
    # Word highlighting (karaoke effect)
    highlight_current_word = True,    # ← BRAINROT: Active word highlight
    word_highlight_color = "red",     # ← BRAINROT: Contrasting highlight
    
    # Layout
    line_count = 2,                   # Max lines on screen
    padding = 50,                     # Edge padding
    position = ("center", "center"),  # ← BRAINROT: Center screen
    
    # Shadow
    shadow_strength = 1.0,
    shadow_blur = 0.1,
):
```

### ShortGPT - JSON Caption Templates

```json
// vendor/ShortGPT/shortGPT/editing_framework/editing_steps/make_caption.json
{
  "caption": {
    "type": "text",
    "z": 4,
    "parameters": {
      "text": null,
      "font_size": 100,
      "font": "fonts/LuckiestGuy-Regular.ttf",  // Playful font
      "color": "white",
      "stroke_width": 3,
      "stroke_color": "black",
      "method": "caption",
      "size": [900, 450]
    },
    "actions": [
      { "type": "screen_position", "param": { "pos": "center" } }
    ]
  }
}
```

### short-video-maker-gyori - Remotion Caption Component

```tsx
// vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx
<p style={{
  fontSize: "6em",                           // Large
  fontFamily: fontFamily,                    // Google Fonts (BarlowCondensed)
  fontWeight: "black",
  color: "white",
  WebkitTextStroke: "2px black",             // Outline
  WebkitTextFillColor: "white",
  textShadow: "0px 0px 10px black",          // Drop shadow
  textAlign: "center",
  textTransform: "uppercase",                // ALL CAPS
}}>
  {line.texts.map((text) => {
    const active = /* word timing check */;
    return (
      <span style={{
        fontWeight: "bold",
        ...(active ? {
          backgroundColor: captionBackgroundColor,  // Highlight box
          padding: "10px",
          borderRadius: "10px",
        } : {})
      }}>
        {text.text}
      </span>
    );
  })}
</p>
```

### AI-Youtube-Shorts-Generator - MoviePy Captions

```python
# vendor/AI-Youtube-Shorts-Generator/Components/Subtitles.py
# Dynamic font sizing based on video height
dynamic_fontsize = int(video.h * 0.065)  # 6.5% of video height

txt_clip = TextClip(
    text,
    fontsize=dynamic_fontsize,
    color='#2699ff',           # Blue text (unique style)
    stroke_color='black',
    stroke_width=2,
    font='Franklin-Gothic',    # Professional font
    method='caption',
    size=(video.w - 100, None)
)
# Position at bottom
txt_clip = txt_clip.set_position(('center', video.h - txt_clip.h - 100))
```

### Viral-Faceless-Shorts-Generator - ASS Subtitle Styling

```javascript
// vendor/Viral-Faceless-Shorts-Generator/trendscraper/src/index.js
// Uses FFmpeg to generate ASS subtitles with custom styling
await execPromise(`sed -i '/^Style:/c\\Style: Default,Montserrat ExtraBold,${fontsize},&H00FFFFFF,&H00000000,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,2,${outline},2,10,10,10,1' "${assPath}"`);
```

---

## 5. Script Prompt Variations

### ShortGPT - Facts Content Prompt

```yaml
# vendor/ShortGPT/shortGPT/prompt_templates/facts_generator.yaml
system_prompt: >
  You are an expert content writer of a YouTube shorts channel. 
  You specialize in `facts` shorts.
  Your facts shorts are less than 50 seconds verbally (around 140 words maximum). 
  They are extremely captivating, and original.
  
  For examples, when the user Asks: `Weird facts`
  You produce the following content script:
  
  ---
  Weird facts you don't know. 
  A swarm of 20,000 bees followed a car for two days because their queen was stuck inside.
  If you tickle a rat day after day, it will start laughing whenever it sees you.
  ...
  ---
  
  Only give the first `hook`, like "Weird facts you don't know." in the example. 
  Then the facts.
  Keep it short, extremely interesting and original.
```

### ShortGPT - Reddit Story Prompt

```yaml
# vendor/ShortGPT/shortGPT/prompt_templates/reddit_generate_script.yaml
system_prompt: |
  You are a YouTube shorts content creator who makes extremely good YouTube shorts 
  over answers from AskReddit questions.
  
  I'm going to give you a question, and you will give an anecdote as if you are 
  a redditor that answered that question (narrated with 'I' in the first person).
  
  1- The story must be between 120 and 140 words MAXIMUM.
  2- DO NOT end the story with a moral conclusion or any sort of conclusion.
  3- Make sure that the story is very SPICY, very unusual, HIGHLY entertaining.
  4- Make sure that the new short's content is totally captivating.
  5- Make sure that the story directly answers the title.
  6- Make the question sound like an r/AskReddit question.
  7- The language used must be familiar, casual, even youthful.
  8- The story must be narrated as if you're a friend of the viewer.
  9- Start the the story with 'I'
```

### MoneyPrinterTurbo - Generic Script Prompt

```python
# vendor/MoneyPrinterTurbo/app/services/llm.py
def generate_script(video_subject: str, language: str = "", paragraph_number: int = 1):
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
6. do not include "voiceover", "narrator" or similar indicators.
7. you must not mention the prompt, or anything about the script itself.
8. respond in the same language as the video subject.

# Initialization:
- video subject: {video_subject}
- number of paragraphs: {paragraph_number}
"""
```

### Viral-Faceless-Shorts-Generator - Trend-Based Viral Prompt

```javascript
// vendor/Viral-Faceless-Shorts-Generator/trendscraper/src/index.js
let prompt = `You are a professional content strategist and scriptwriter 
with over 10 years of experience in creating viral short-form videos, 
especially for YouTube Shorts.

Your responsibilities:
- Research the most up-to-date information about the trend.
- Identify the most viral content angle based on the trend, volume, and breakdown.
- Create a video plan with three elements:

Output a JSON object with exactly these fields:
- "title": A catchy title for the video (must be less than 100 characters). Hashtags are encouraged.
- "description": A short, engaging description with relevant hashtags.
- "body": The full speech script of the video subtitles. 
  The script must be natural, fast-paced, and highly engaging for a YouTube Short 
  between 15 and 60 seconds. Must be between 250 and 300 words.
  
Additional important instructions:
- Maximize emotional pull, curiosity, or value delivery.
- Keep the tone professional, engaging, and tailored for virality.
`;
```

### shortrocity - Image-Based Narration

```python
# vendor/shortrocity/main.py
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{
        "role": "system",
        "content": """You are a YouTube short narration generator. 
        You generate 30 seconds to 1 minute of narration.
        
        The shorts you create have a background that fades from image to image 
        as the narration is going on.

        You will need to generate descriptions of images for each of the sentences.
        DO NOT use names of celebrities in the image descriptions.
        
        Note that the narration will be fed into a text-to-speech engine, 
        so don't use special characters.

        Respond with a pair of an image description in square brackets 
        and a narration below it:

        [Description of a background image]
        Narrator: "One sentence of narration"
        
        The short should be 6 sentences maximum.
        """
    }]
)
```

---

## 6. Content Archetype Recommendations

Based on this research, here's how content-machine should implement archetypes:

### Proposed Archetype Schema

```typescript
// src/types/content-archetype.ts
export interface ContentArchetype {
  id: string;
  name: string;
  description: string;
  
  // Pacing
  pacing: {
    sceneDurationMs: number;      // 2000 (brainrot) to 8000 (educational)
    voiceRate: number;            // 0.8 (slow) to 1.3 (fast)
    paddingBackMs: number;        // Extra time after speech
  };
  
  // Audio
  audio: {
    musicMood: MusicMoodEnum;
    musicVolume: MusicVolumeEnum;
    voiceStyle: 'energetic' | 'calm' | 'conversational' | 'dramatic';
  };
  
  // Captions
  captions: {
    position: 'top' | 'center' | 'bottom';
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    fontFamily: string;
    highlightCurrentWord: boolean;
    backgroundColor: string;
    textColor: string;
    strokeWidth: number;
  };
  
  // Script generation
  prompt: {
    systemPrompt: string;
    maxWords: number;
    tone: 'casual' | 'professional' | 'dramatic' | 'humorous';
    structure: 'hook-body-cta' | 'story' | 'listicle' | 'question-answer';
  };
}
```

### Example Archetypes

```typescript
const ARCHETYPES: ContentArchetype[] = [
  {
    id: 'brainrot',
    name: 'Brainrot / Gen-Z Meme',
    pacing: { sceneDurationMs: 2000, voiceRate: 1.2, paddingBackMs: 500 },
    audio: { musicMood: 'euphoric', musicVolume: 'high', voiceStyle: 'energetic' },
    captions: { 
      position: 'center', 
      fontSize: 'xlarge',
      fontFamily: 'BarlowCondensed',
      highlightCurrentWord: true,
      backgroundColor: '#FF0000',
      textColor: '#FFFFFF',
      strokeWidth: 3
    },
    prompt: { 
      tone: 'humorous', 
      structure: 'hook-body-cta',
      maxWords: 80 
    }
  },
  {
    id: 'educational',
    name: 'Educational / Explainer',
    pacing: { sceneDurationMs: 6000, voiceRate: 0.95, paddingBackMs: 2000 },
    audio: { musicMood: 'contemplative', musicVolume: 'low', voiceStyle: 'calm' },
    captions: { 
      position: 'bottom', 
      fontSize: 'medium',
      fontFamily: 'Inter',
      highlightCurrentWord: false,
      backgroundColor: 'transparent',
      textColor: '#FFFFFF',
      strokeWidth: 2
    },
    prompt: { 
      tone: 'professional', 
      structure: 'listicle',
      maxWords: 150 
    }
  },
  {
    id: 'story',
    name: 'Story / Reddit',
    pacing: { sceneDurationMs: 4000, voiceRate: 1.0, paddingBackMs: 1500 },
    audio: { musicMood: 'uneasy', musicVolume: 'medium', voiceStyle: 'conversational' },
    captions: { 
      position: 'center', 
      fontSize: 'large',
      fontFamily: 'LuckiestGuy',
      highlightCurrentWord: true,
      backgroundColor: '#0066FF',
      textColor: '#FFFFFF',
      strokeWidth: 2
    },
    prompt: { 
      tone: 'casual', 
      structure: 'story',
      maxWords: 140 
    }
  }
];
```

---

## 7. Key Takeaways

1. **No repo has explicit archetype presets** - All use flat configuration
2. **ShortGPT's engine inheritance is cleanest** - Subclass per content type
3. **vidosy's JSON config is most declarative** - Video-as-data pattern
4. **Caption styling varies significantly** - Font, color, position, highlight
5. **Prompt templates are content-type-specific** - Different for facts, story, viral
6. **Music mood selection is powerful** - 12+ moods in short-video-maker-gyori
7. **Voice selection is per-language** - EdgeTTS has 400+ voices

---

## 8. References

| File | Pattern |
|------|---------|
| [shorts.ts](../vendor/short-video-maker-gyori/src/types/shorts.ts) | Music moods, voice enums, render config |
| [content_short_engine.py](../vendor/ShortGPT/shortGPT/engine/content_short_engine.py) | Engine pipeline |
| [schema.py](../vendor/MoneyPrinterTurbo/app/models/schema.py) | VideoParams flat config |
| [captacity/__init__.py](../vendor/captacity/captacity/__init__.py) | Caption styling API |
| [PortraitVideo.tsx](../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx) | Remotion caption component |
| [music.ts](../vendor/short-video-maker-gyori/src/short-creator/music.ts) | Mood-based music library |
| [facts_generator.yaml](../vendor/ShortGPT/shortGPT/prompt_templates/facts_generator.yaml) | Facts prompt template |
| [reddit_generate_script.yaml](../vendor/ShortGPT/shortGPT/prompt_templates/reddit_generate_script.yaml) | Reddit story prompt |

---

**Next Steps:**
1. Design `ContentArchetype` Zod schema for content-machine
2. Create preset JSON files for each archetype
3. Build prompt template system with archetype-specific prompts
4. Implement music mood selection from static library
5. Add caption style presets to Remotion components
