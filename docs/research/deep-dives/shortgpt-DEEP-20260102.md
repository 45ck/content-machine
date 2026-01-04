# Deep Dive: ShortGPT - Multi-Engine Video Generation Framework

**Date:** 2026-01-02  
**Repo:** `vendor/ShortGPT/`  
**Priority:** ⭐ CRITICAL - EdgeTTS, Multi-Language, Engine Architecture

---

## Executive Summary

**ShortGPT** is a Python-based short video generation framework featuring modular content engines, EdgeTTS for free multi-language TTS, and a step-based workflow pattern. Key adoption opportunities include the EdgeTTS integration (30+ languages, free) and the abstract engine architecture.

### Why This Matters

- ✅ **EdgeTTS integration** - Free TTS with 30+ languages, high quality
- ✅ **Abstract content engine pattern** - Reusable step-based workflow
- ✅ **Multi-language support** - Built-in translation pipeline
- ✅ **Image/video search integration** - LLM-driven asset sourcing
- ✅ **Whisper integration** - Caption generation from audio
- ⚠️ **Python-only** - Need to extract patterns for TypeScript

---

## Architecture Overview

```
ShortGPT/
├── shortGPT/
│   ├── engine/                  # Content generation engines
│   │   ├── abstract_content_engine.py   # Base class for all engines
│   │   ├── content_short_engine.py      # Main short video engine
│   │   ├── content_translation_engine.py # Multi-language dubbing
│   │   ├── facts_short_engine.py        # Facts-based content
│   │   └── reddit_short_engine.py       # Reddit content engine
│   ├── audio/
│   │   ├── edge_voice_module.py  # EdgeTTS wrapper (FREE)
│   │   ├── eleven_voice_module.py # ElevenLabs (paid)
│   │   └── voice_module.py       # Abstract voice interface
│   ├── gpt/
│   │   ├── gpt_editing.py        # LLM-driven image/video queries
│   │   ├── gpt_translate.py      # Translation with LLM
│   │   └── gpt_yt.py             # YouTube metadata generation
│   ├── editing_framework/
│   │   └── editing_engine.py     # Video editing pipeline
│   ├── editing_utils/
│   │   └── captions.py           # Caption generation
│   ├── config/
│   │   └── languages.py          # Language definitions + TTS mapping
│   └── prompt_templates/
│       ├── editing_generate_images.yaml
│       └── editing_generate_videos.yaml
```

---

## Key Pattern: Abstract Content Engine

The `AbstractContentEngine` provides a step-based workflow pattern:

```python
class AbstractContentEngine:
    def __init__(self, short_id, short_type, language, voiceModule):
        self.stepDict = {}  # Override in subclass
        
    def makeContent(self):
        """Execute all steps in order"""
        for step_num in self.stepDict:
            step_function = self.stepDict[step_num]
            step_function()
        return self._db_video_path
```

### ContentShortEngine Steps

```python
self.stepDict = {
    1:  self._generateScript,
    2:  self._generateTempAudio,
    3:  self._speedUpAudio,
    4:  self._timeCaptions,
    5:  self._generateImageSearchTerms,
    6:  self._generateImageUrls,
    7:  self._chooseBackgroundMusic,
    8:  self._chooseBackgroundVideo,
    9:  self._prepareBackgroundAssets,
    10: self._prepareCustomAssets,
    11: self._editAndRenderShort,
    12: self._addYoutubeMetadata
}
```

This pattern enables:
- Clear separation of concerns
- Step resumption on failure
- Progress tracking per step
- Persistence of intermediate state

---

## EdgeTTS Integration

### Voice Module Interface

```python
class VoiceModule(ABC):
    @abstractmethod
    def generate_voice(self, text: str, outputfile: str) -> str:
        """Generate audio file from text"""
        pass
    
    @abstractmethod
    def get_remaining_characters(self) -> int:
        """Return remaining quota (for paid services)"""
        pass
```

### EdgeTTS Implementation

```python
class EdgeTTSVoiceModule(VoiceModule):
    def __init__(self, voiceName):
        self.voiceName = voiceName  # e.g., "en-US-GuyNeural"
        
    def get_remaining_characters(self):
        return 999999999999  # FREE!
        
    async def async_generate_voice(self, text, outputfile):
        communicate = edge_tts.Communicate(text, self.voiceName)
        with open(outputfile, "wb") as file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    file.write(chunk["data"])
        return outputfile
```

### Language → Voice Mapping

```python
EDGE_TTS_VOICENAME_MAPPING = {
    Language.ENGLISH: "en-US-GuyNeural",
    Language.SPANISH: "es-ES-AlvaroNeural",
    Language.FRENCH: "fr-FR-HenriNeural",
    Language.GERMAN: "de-DE-ConradNeural",
    Language.JAPANESE: "ja-JP-KeitaNeural",
    Language.CHINESE: "zh-CN-YunxiNeural",
    Language.KOREAN: "ko-KR-InJoonNeural",
    Language.PORTUGUESE: "pt-BR-AntonioNeural",
    Language.RUSSIAN: "ru-RU-DmitryNeural",
    Language.ARABIC: "ar-EG-ShakirNeural",
    # ... 30+ languages supported
}
```

---

## LLM-Driven Asset Sourcing

### Image Search Query Generation

```python
def getImageQueryPairs(captions, n=15, maxTime=2):
    """Generate image search queries from captions"""
    
    prompt = load_prompt('editing_generate_images.yaml')
    prompt = prompt.replace('<<CAPTIONS TIMED>>', f"{captions}")
    prompt = prompt.replace("<<NUMBER>>", f"{n}")
    
    res = llm_completion(prompt)
    data = extractJsonFromString(res)
    
    # Convert to timed pairs: [(time_range, query), ...]
    pairs = []
    for item in data["image_queries"]:
        time = item["timestamp"]
        query = item["query"]
        pairs.append(((time, end), query + " image"))
    
    return pairs
```

### Video Search Query Generation

```python
def getVideoSearchQueriesTimed(captions_timed):
    """Generate video search queries from captions"""
    
    prompt = load_prompt('editing_generate_videos.yaml')
    prompt = prompt.replace("<<TIMED_CAPTIONS>>", f"{captions_timed}")
    
    res = llm_completion(prompt)
    data = extractJsonFromString(res)
    
    # Returns: [[time_range, [query1, query2, query3]], ...]
    return formatted_queries
```

---

## Caption Generation with Whisper

```python
def _timeCaptions(self):
    """Generate word-timed captions from audio"""
    whisper_analysis = audio_utils.audioToText(self._db_audio_path)
    self._db_timed_captions = captions.getCaptionsWithTime(whisper_analysis)
```

### Caption Format

```python
# captions_timed structure:
[
    ((0.0, 2.5), "Welcome to this video"),
    ((2.5, 5.0), "about content creation"),
    ((5.0, 8.0), "using AI tools"),
]
```

---

## Translation Pipeline

```python
def _generateTempAudio(self):
    script = self._db_script
    
    if self._db_language != Language.ENGLISH.value:
        # Translate script using LLM
        self._db_translated_script = gpt_translate.translateContent(
            script, 
            self._db_language
        )
        script = self._db_translated_script
    
    # Generate audio in target language
    self._db_temp_audio_path = self.voiceModule.generate_voice(
        script, 
        self.dynamicAssetDir + "temp_audio_path.wav"
    )
```

---

## Editing Engine Pattern

```python
class EditingEngine:
    def addEditingStep(self, step_type: EditingStep, params: dict):
        """Add an editing step to the pipeline"""
        self.steps.append((step_type, params))
    
    def renderVideo(self, outputPath, logger=None):
        """Execute all editing steps and render"""
        # ... process each step
        pass

# Usage:
videoEditor = EditingEngine()
videoEditor.addEditingStep(EditingStep.ADD_VOICEOVER_AUDIO, {'url': audio_path})
videoEditor.addEditingStep(EditingStep.ADD_BACKGROUND_MUSIC, {
    'url': music_url,
    'loop_background_music': duration,
    'volume_percentage': 0.11
})
videoEditor.addEditingStep(EditingStep.CROP_1920x1080, {'url': background_video})

# Add captions
for timing, text in timed_captions:
    videoEditor.addEditingStep(EditingStep.ADD_CAPTION_SHORT, {
        'text': text.upper(),
        'set_time_start': timing[0],
        'set_time_end': timing[1]
    })

videoEditor.dumpEditingSchema()  # For debugging
videoEditor.renderVideo(outputPath)
```

---

## YouTube Metadata Generation

```python
def _addYoutubeMetadata(self):
    # Generate title and description using LLM
    self._db_yt_title, self._db_yt_description = gpt_yt.generate_title_description_dict(
        self._db_script
    )
    
    # Save with timestamped filename
    date_str = now.strftime("%Y-%m-%d_%H-%M-%S")
    newFileName = f"videos/{date_str} - {sanitize(self._db_yt_title)}"
    
    shutil.move(self._db_video_path, newFileName + ".mp4")
    
    # Save metadata separately
    with open(newFileName + ".txt", "w") as f:
        f.write(f"---Youtube title---\n{self._db_yt_title}\n")
        f.write(f"---Youtube description---\n{self._db_yt_description}")
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **EdgeTTS voice module pattern** - Wrap `edge-tts` npm package
2. **Language → Voice mapping** - Use their 30+ language mappings
3. **Step-based engine architecture** - Adapt for TypeScript
4. **LLM-driven asset sourcing prompts** - Use their prompt templates

### TypeScript Adaptation 🔧

```typescript
// Proposed EdgeTTS wrapper for TypeScript
interface VoiceModule {
  generateVoice(text: string, outputFile: string): Promise<string>;
  getRemainingCharacters(): number;
}

class EdgeTTSVoice implements VoiceModule {
  constructor(private voiceName: string) {}
  
  async generateVoice(text: string, outputFile: string): Promise<string> {
    // Use edge-tts npm package
    const { EdgeTTS } = await import('edge-tts');
    const tts = new EdgeTTS();
    await tts.synthesize(text, this.voiceName, outputFile);
    return outputFile;
  }
  
  getRemainingCharacters(): number {
    return Number.MAX_SAFE_INTEGER; // FREE!
  }
}

// Voice mapping
const EDGE_TTS_VOICES: Record<Language, string> = {
  english: "en-US-GuyNeural",
  spanish: "es-ES-AlvaroNeural",
  french: "fr-FR-HenriNeural",
  german: "de-DE-ConradNeural",
  japanese: "ja-JP-KeitaNeural",
  chinese: "zh-CN-YunxiNeural",
  // ... more languages
};
```

### Extract Prompts 📋

The prompt templates in `prompt_templates/` are valuable:

1. `editing_generate_images.yaml` - Image search query generation
2. `editing_generate_videos.yaml` - Video search query generation
3. YouTube metadata generation prompts

---

## Integration with Our Pipeline

### TTS Layer

```typescript
// src/audio/tts/index.ts
export interface TTSProvider {
  synthesize(text: string, voice: string): Promise<Buffer>;
  listVoices(language?: string): Promise<Voice[]>;
  getCreditsRemaining(): number;
}

export class EdgeTTSProvider implements TTSProvider {
  // Free, 30+ languages
}

export class KokoroProvider implements TTSProvider {
  // Local, fast, English-only
}

export class ElevenLabsProvider implements TTSProvider {
  // Premium quality, paid
}

// Factory
export function getTTSProvider(config: TTSConfig): TTSProvider {
  switch (config.provider) {
    case 'edge': return new EdgeTTSProvider();
    case 'kokoro': return new KokoroProvider();
    case 'elevenlabs': return new ElevenLabsProvider(config.apiKey);
  }
}
```

### Content Engine Pattern

```typescript
// src/engine/ContentEngine.ts
abstract class ContentEngine {
  protected steps: Map<number, () => Promise<void>>;
  protected state: EngineState;
  
  async run(): Promise<VideoOutput> {
    for (const [stepNum, stepFn] of this.steps) {
      this.state.currentStep = stepNum;
      await stepFn();
      await this.saveState(); // Enable resume on failure
    }
    return this.state.output;
  }
}

class ShortVideoEngine extends ContentEngine {
  constructor() {
    super();
    this.steps = new Map([
      [1, this.generateScript],
      [2, this.generateAudio],
      [3, this.generateCaptions],
      [4, this.sourceAssets],
      [5, this.render],
      [6, this.generateMetadata],
    ]);
  }
}
```

---

## Lessons Learned

1. **Free TTS is possible** - EdgeTTS provides production-quality voices at no cost
2. **Step-based engines enable resumption** - Critical for long-running pipelines
3. **LLM-driven asset sourcing works** - Generate search queries from content
4. **Translation is straightforward** - LLM translation + matched TTS voice
5. **Separate engine types for different content** - Reddit, Facts, Custom scripts

---

## Next Steps

1. [ ] Extract EdgeTTS voice mappings (all 30+ languages)
2. [ ] Port step-based engine pattern to TypeScript
3. [ ] Extract and adapt prompt templates
4. [ ] Integrate with Kokoro for local English TTS

---

**Status:** Research complete. EdgeTTS and engine patterns validated for adoption.
