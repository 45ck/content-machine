# RQ-21: Content Archetypes for Multi-Demographic Support

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we support multiple content styles (brainrot, meme, educational, story) for different demographics?

---

## 1. Problem Statement

The original system design focused on "product demos" — a narrow use case. To serve:
- **Gen Z (16-25):** Brainrot, meme-style, fast-paced chaos
- **Broader demographics:** Educational, story-driven, motivational
- **Multiple platforms:** TikTok, YouTube Shorts, Instagram Reels

We need a **content archetype system** that configures:
- Pacing (scene duration, cuts per minute)
- Audio (music mood, voice rate, volume levels)
- Captions (font, size, position, animation)
- Visuals (background type, split-screen, effects)
- Script generation (prompt style, word count, tone)

---

## 2. Vendor Evidence

### 2.1 Existing Differentiation Patterns

| Repo | Pattern | Limitation |
|------|---------|------------|
| MoneyPrinterTurbo | 25+ flat config params | No archetype grouping |
| ShortGPT | Engine class inheritance | Hardcoded per engine |
| short-video-maker-gyori | Zod enum configs | Mood only, not full archetype |
| vidosy | JSON scene config | Per-scene, not per-video |

**Key Finding:** No vendored repo has explicit archetype presets. Differentiation happens through manual configuration composition.

### 2.2 Pacing Patterns

```python
# MoneyPrinterTurbo - per-scene duration
video_clip_duration = 5  # seconds

# Recommendation by content type:
# Brainrot:    1.5-2.5 seconds (30+ cuts/minute)
# Meme:        2-4 seconds (15-25 cuts/minute)
# Educational: 5-8 seconds (8-12 cuts/minute)
# Story:       4-6 seconds (10-15 cuts/minute)
```

### 2.3 Voice Rate Configuration

```python
# MoneyPrinterTurbo
voice_rate = 1.0  # 0.8-1.4 range

# Recommendation:
# Brainrot:    1.2-1.4x (fast, energetic)
# Meme:        1.0-1.2x (natural, punchy)
# Educational: 0.9-1.0x (clear, deliberate)
# Story:       1.0-1.1x (engaging, dramatic)
```

### 2.4 Music Mood System

```typescript
// short-video-maker-gyori - 12 mood categories
type MusicMood = 
  | 'sad' | 'melancholic'     // Story drama
  | 'happy' | 'euphoric'      // Brainrot energy
  | 'excited' | 'chill'       // Meme vibes
  | 'uneasy' | 'angry'        // Story tension
  | 'dark' | 'hopeful'        // Motivational
  | 'contemplative' | 'funny'; // Educational, comedy
```

### 2.5 Music Volume Levels

```typescript
// short-video-maker-gyori
enum MusicVolumeEnum {
  off = 0,
  low = 0.2,      // Educational (voice priority)
  medium = 0.45,  // Story (balanced)
  high = 0.7,     // Brainrot (music-forward)
}
```

### 2.6 Caption Styling Patterns

| Archetype | Font | Size | Position | Highlight | Colors |
|-----------|------|------|----------|-----------|--------|
| **Brainrot** | Bangers, BarlowCondensed | 130px | center | Yes | Yellow text, red highlight |
| **Meme** | Impact, LuckiestGuy | 100px | center | Optional | White text, black stroke |
| **Educational** | Inter, Roboto | 60px | bottom | No | White text, subtle shadow |
| **Story** | LuckiestGuy | 100px | center | Yes | White text, blue highlight |
| **Product** | SF Pro, Inter | 48px | bottom | No | Brand colors |

### 2.7 Background Video Types

| Archetype | Primary Source | Examples |
|-----------|----------------|----------|
| **Brainrot** | Gameplay footage | Minecraft parkour, Subway Surfers, car racing |
| **Meme** | Reaction clips, stock | Shocked face, nodding, ironic clips |
| **Educational** | Stock footage | Pexels/Pixabay matching topic |
| **Story** | Abstract/moody | Dark streets, rain, cinematic b-roll |
| **Product** | Screen capture | Actual product UI |

---

## 3. Proposed Archetype Schema

```typescript
import { z } from 'zod';

// ============================================
// Content Archetype Schema
// ============================================

const PacingConfigSchema = z.object({
  sceneDurationMs: z.object({
    min: z.number(),
    max: z.number(),
  }),
  cutsPerMinute: z.object({
    target: z.number(),
    tolerance: z.number(),
  }),
  transitionStyle: z.enum(['cut', 'fade', 'zoom', 'glitch']),
});

const AudioConfigSchema = z.object({
  voiceRate: z.number().min(0.5).max(2.0),
  voicePitch: z.number().optional(),
  musicMood: z.enum([
    'happy', 'euphoric', 'excited', 'chill', 'funny',
    'sad', 'melancholic', 'uneasy', 'dark', 'angry',
    'hopeful', 'contemplative',
  ]),
  musicVolume: z.enum(['off', 'low', 'medium', 'high']),
  musicVolumeValue: z.number().min(0).max(1).optional(),
  useMemeAudio: z.boolean().optional(),
});

const CaptionConfigSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.enum(['normal', 'bold', 'black']),
  position: z.enum(['top', 'center', 'bottom']),
  textColor: z.string(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  highlightCurrentWord: z.boolean(),
  highlightColor: z.string().optional(),
  animation: z.enum(['none', 'bounce', 'scale', 'typewriter', 'karaoke']),
  wordsPerCaption: z.number().min(1).max(8),
});

const VisualConfigSchema = z.object({
  backgroundType: z.enum([
    'stock-footage',      // Pexels/Pixabay semantic match
    'gameplay',           // Minecraft, Subway Surfers, etc.
    'screen-capture',     // Product demos
    'split-screen',       // Content + gameplay
    'abstract',           // Gradients, particles
    'user-footage',       // User-provided clips
  ]),
  gameplayStyle: z.enum([
    'minecraft-parkour',
    'subway-surfers',
    'car-racing',
    'ski-runner',
    'satisfying-asmr',
  ]).optional(),
  splitScreenRatio: z.number().min(0.3).max(0.7).optional(),
  useEffects: z.boolean(),
  effectTypes: z.array(z.enum([
    'zoom', 'shake', 'glitch', 'flash', 'emoji-overlay',
  ])).optional(),
  colorGrading: z.enum(['none', 'vibrant', 'muted', 'dark', 'retro']).optional(),
});

const ScriptConfigSchema = z.object({
  wordCountRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  tone: z.enum([
    'casual', 'energetic', 'serious', 'humorous', 'dramatic',
    'informative', 'conversational', 'provocative',
  ]),
  structure: z.enum([
    'hook-body-cta',      // Standard
    'question-answer',    // Educational
    'story-arc',          // Narrative
    'listicle',           // "5 things..."
    'hot-take',           // Opinion/commentary
    'meme-format',        // Setup-punchline
  ]),
  language: z.enum(['formal', 'informal', 'slang', 'gen-z']).optional(),
  useHook: z.boolean(),
  useCTA: z.boolean(),
});

const PlatformConfigSchema = z.object({
  platform: z.enum(['tiktok', 'youtube-shorts', 'instagram-reels', 'all']),
  resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  maxDurationSeconds: z.number(),
  aspectRatio: z.string(),
});

// Main Archetype Schema
export const ContentArchetypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  targetDemographic: z.object({
    ageRange: z.object({ min: z.number(), max: z.number() }).optional(),
    interests: z.array(z.string()).optional(),
  }).optional(),
  pacing: PacingConfigSchema,
  audio: AudioConfigSchema,
  captions: CaptionConfigSchema,
  visuals: VisualConfigSchema,
  script: ScriptConfigSchema,
  platform: PlatformConfigSchema,
});

export type ContentArchetype = z.infer<typeof ContentArchetypeSchema>;
```

---

## 4. Preset Archetypes

### 4.1 Gen Z Brainrot

```typescript
const brainrotArchetype: ContentArchetype = {
  id: 'gen-z-brainrot',
  name: 'Gen Z Brainrot',
  description: 'Fast-paced, chaotic, gameplay background, meme energy',
  targetDemographic: {
    ageRange: { min: 13, max: 24 },
    interests: ['gaming', 'memes', 'tiktok'],
  },
  pacing: {
    sceneDurationMs: { min: 1500, max: 2500 },
    cutsPerMinute: { target: 30, tolerance: 5 },
    transitionStyle: 'cut',
  },
  audio: {
    voiceRate: 1.3,
    musicMood: 'euphoric',
    musicVolume: 'high',
    useMemeAudio: true,
  },
  captions: {
    fontFamily: 'Bangers',
    fontSize: 130,
    fontWeight: 'black',
    position: 'center',
    textColor: '#FFFF00',
    strokeColor: '#000000',
    strokeWidth: 8,
    highlightCurrentWord: true,
    highlightColor: '#FF0000',
    animation: 'bounce',
    wordsPerCaption: 2,
  },
  visuals: {
    backgroundType: 'split-screen',
    gameplayStyle: 'minecraft-parkour',
    splitScreenRatio: 0.5,
    useEffects: true,
    effectTypes: ['zoom', 'shake'],
    colorGrading: 'vibrant',
  },
  script: {
    wordCountRange: { min: 80, max: 120 },
    tone: 'energetic',
    structure: 'hook-body-cta',
    language: 'gen-z',
    useHook: true,
    useCTA: false,
  },
  platform: {
    platform: 'tiktok',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 30,
    aspectRatio: '9:16',
  },
};
```

### 4.2 Meme / Comedy

```typescript
const memeArchetype: ContentArchetype = {
  id: 'meme-comedy',
  name: 'Meme / Comedy',
  description: 'Punchy, ironic, reaction-based, relatable humor',
  targetDemographic: {
    ageRange: { min: 16, max: 35 },
    interests: ['comedy', 'memes', 'pop-culture'],
  },
  pacing: {
    sceneDurationMs: { min: 2000, max: 4000 },
    cutsPerMinute: { target: 20, tolerance: 5 },
    transitionStyle: 'cut',
  },
  audio: {
    voiceRate: 1.1,
    musicMood: 'funny',
    musicVolume: 'medium',
    useMemeAudio: true,
  },
  captions: {
    fontFamily: 'Impact',
    fontSize: 100,
    fontWeight: 'bold',
    position: 'center',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 6,
    highlightCurrentWord: false,
    animation: 'scale',
    wordsPerCaption: 3,
  },
  visuals: {
    backgroundType: 'stock-footage',
    useEffects: true,
    effectTypes: ['zoom', 'emoji-overlay'],
    colorGrading: 'vibrant',
  },
  script: {
    wordCountRange: { min: 60, max: 100 },
    tone: 'humorous',
    structure: 'meme-format',
    language: 'informal',
    useHook: true,
    useCTA: false,
  },
  platform: {
    platform: 'all',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 30,
    aspectRatio: '9:16',
  },
};
```

### 4.3 Educational / Informative

```typescript
const educationalArchetype: ContentArchetype = {
  id: 'educational',
  name: 'Educational / Informative',
  description: 'Clear, well-paced, informative, professional feel',
  targetDemographic: {
    ageRange: { min: 18, max: 55 },
    interests: ['learning', 'self-improvement', 'facts'],
  },
  pacing: {
    sceneDurationMs: { min: 5000, max: 8000 },
    cutsPerMinute: { target: 10, tolerance: 3 },
    transitionStyle: 'fade',
  },
  audio: {
    voiceRate: 0.95,
    musicMood: 'contemplative',
    musicVolume: 'low',
    useMemeAudio: false,
  },
  captions: {
    fontFamily: 'Inter',
    fontSize: 60,
    fontWeight: 'normal',
    position: 'bottom',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    highlightCurrentWord: false,
    animation: 'none',
    wordsPerCaption: 5,
  },
  visuals: {
    backgroundType: 'stock-footage',
    useEffects: false,
    colorGrading: 'none',
  },
  script: {
    wordCountRange: { min: 120, max: 180 },
    tone: 'informative',
    structure: 'question-answer',
    language: 'formal',
    useHook: true,
    useCTA: true,
  },
  platform: {
    platform: 'youtube-shorts',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 60,
    aspectRatio: '9:16',
  },
};
```

### 4.4 Reddit Story / Narrative

```typescript
const storyArchetype: ContentArchetype = {
  id: 'reddit-story',
  name: 'Reddit Story / Narrative',
  description: 'Dramatic, suspenseful, story-driven, emotional',
  targetDemographic: {
    ageRange: { min: 16, max: 40 },
    interests: ['stories', 'drama', 'reddit'],
  },
  pacing: {
    sceneDurationMs: { min: 4000, max: 6000 },
    cutsPerMinute: { target: 12, tolerance: 3 },
    transitionStyle: 'fade',
  },
  audio: {
    voiceRate: 1.05,
    musicMood: 'uneasy',
    musicVolume: 'medium',
    useMemeAudio: false,
  },
  captions: {
    fontFamily: 'LuckiestGuy',
    fontSize: 100,
    fontWeight: 'bold',
    position: 'center',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 6,
    highlightCurrentWord: true,
    highlightColor: '#3B82F6',
    animation: 'karaoke',
    wordsPerCaption: 3,
  },
  visuals: {
    backgroundType: 'abstract',
    useEffects: false,
    colorGrading: 'dark',
  },
  script: {
    wordCountRange: { min: 150, max: 250 },
    tone: 'dramatic',
    structure: 'story-arc',
    language: 'informal',
    useHook: true,
    useCTA: false,
  },
  platform: {
    platform: 'all',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 60,
    aspectRatio: '9:16',
  },
};
```

### 4.5 Product Demo / Tech

```typescript
const productArchetype: ContentArchetype = {
  id: 'product-demo',
  name: 'Product Demo / Tech',
  description: 'Clean, focused, professional, product-truthful',
  targetDemographic: {
    ageRange: { min: 20, max: 45 },
    interests: ['technology', 'saas', 'productivity'],
  },
  pacing: {
    sceneDurationMs: { min: 3000, max: 5000 },
    cutsPerMinute: { target: 15, tolerance: 3 },
    transitionStyle: 'fade',
  },
  audio: {
    voiceRate: 1.0,
    musicMood: 'chill',
    musicVolume: 'low',
    useMemeAudio: false,
  },
  captions: {
    fontFamily: 'SF Pro Display',
    fontSize: 48,
    fontWeight: 'normal',
    position: 'bottom',
    textColor: '#FFFFFF',
    strokeColor: 'transparent',
    strokeWidth: 0,
    highlightCurrentWord: false,
    animation: 'none',
    wordsPerCaption: 6,
  },
  visuals: {
    backgroundType: 'screen-capture',
    useEffects: false,
    colorGrading: 'none',
  },
  script: {
    wordCountRange: { min: 80, max: 140 },
    tone: 'conversational',
    structure: 'hook-body-cta',
    language: 'informal',
    useHook: true,
    useCTA: true,
  },
  platform: {
    platform: 'all',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 45,
    aspectRatio: '9:16',
  },
};
```

### 4.6 Motivational / Hustle

```typescript
const motivationalArchetype: ContentArchetype = {
  id: 'motivational',
  name: 'Motivational / Hustle',
  description: 'Inspiring, quote-driven, aspirational',
  targetDemographic: {
    ageRange: { min: 18, max: 40 },
    interests: ['motivation', 'entrepreneurship', 'self-improvement'],
  },
  pacing: {
    sceneDurationMs: { min: 3000, max: 5000 },
    cutsPerMinute: { target: 15, tolerance: 3 },
    transitionStyle: 'fade',
  },
  audio: {
    voiceRate: 1.0,
    musicMood: 'hopeful',
    musicVolume: 'medium',
    useMemeAudio: false,
  },
  captions: {
    fontFamily: 'Montserrat',
    fontSize: 80,
    fontWeight: 'bold',
    position: 'center',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4,
    highlightCurrentWord: false,
    animation: 'scale',
    wordsPerCaption: 4,
  },
  visuals: {
    backgroundType: 'stock-footage',
    useEffects: true,
    effectTypes: ['zoom'],
    colorGrading: 'vibrant',
  },
  script: {
    wordCountRange: { min: 60, max: 100 },
    tone: 'provocative',
    structure: 'hot-take',
    language: 'informal',
    useHook: true,
    useCTA: true,
  },
  platform: {
    platform: 'instagram-reels',
    resolution: { width: 1080, height: 1920 },
    maxDurationSeconds: 30,
    aspectRatio: '9:16',
  },
};
```

---

## 5. Implementation Recommendations

### 5.1 Archetype Selection Flow

```typescript
// CLI usage
cm script research.json --archetype brainrot
cm script research.json --archetype educational
cm script research.json --archetype reddit-story

// Or with full customization
cm script research.json --archetype custom --config ./my-archetype.json
```

### 5.2 Archetype Inheritance

```typescript
// User can extend preset archetypes
const myArchetype = extendArchetype('gen-z-brainrot', {
  captions: {
    fontFamily: 'Comic Sans MS',  // Override specific fields
  },
});
```

### 5.3 Archetype-Specific Prompts

Each archetype should have a corresponding prompt template:

```markdown
---
name: script-gen-z-brainrot
archetype: gen-z-brainrot
version: 1.0.0
---

# System
You are a Gen Z content creator making viral TikToks. 
Use slang, be chaotic, be unhinged but relatable.

# Rules
- HOOK in first 2 seconds (question or shocking statement)
- SHORT sentences (3-5 words max)
- Use filler words like "bro", "literally", "lowkey"
- Be dramatic and exaggerated
- No formal language, no CTAs
- Target: 80-120 words total

# Topic
{{topic}}
```

### 5.4 Visual Matching by Archetype

The `cm visuals` command should adjust matching based on archetype:

```typescript
// Different footage sources per archetype
const footageSources: Record<string, FootageSource[]> = {
  'gen-z-brainrot': ['gameplay-library', 'user-footage'],
  'meme-comedy': ['reaction-clips', 'stock-footage', 'user-footage'],
  'educational': ['pexels', 'pixabay', 'user-footage'],
  'reddit-story': ['abstract-loops', 'moody-stock', 'user-footage'],
  'product-demo': ['screen-capture', 'user-footage'],
};
```

---

## 6. Split-Screen Implementation

For brainrot content, split-screen with gameplay is essential:

```typescript
// Remotion composition for split-screen
const SplitScreenComposition = ({ 
  mainContent, 
  gameplayFootage, 
  ratio 
}: SplitScreenProps) => {
  const topHeight = VIDEO_HEIGHT * ratio;
  const bottomHeight = VIDEO_HEIGHT * (1 - ratio);
  
  return (
    <AbsoluteFill>
      {/* Main content (top) */}
      <AbsoluteFill style={{ height: topHeight }}>
        <OffthreadVideo src={mainContent} />
      </AbsoluteFill>
      
      {/* Gameplay (bottom) */}
      <AbsoluteFill style={{ top: topHeight, height: bottomHeight }}>
        <OffthreadVideo src={gameplayFootage} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## 7. Gameplay Asset Management

Brainrot content requires a library of gameplay footage:

```
assets/gameplay/
├── minecraft-parkour/
│   ├── clip-001.mp4
│   ├── clip-002.mp4
│   └── ...
├── subway-surfers/
│   └── ...
├── car-racing/
│   └── ...
└── satisfying-asmr/
    └── ...
```

**Acquisition strategy:**
1. Users provide their own gameplay clips (recommended)
2. Creative Commons gameplay from YouTube (with attribution)
3. Community-contributed clips (future)

---

## 8. References

- [MoneyPrinterTurbo config](../../../vendor/MoneyPrinterTurbo) — Pacing/voice parameters
- [short-video-maker-gyori](../../../vendor/short-video-maker-gyori) — Music mood system
- [captacity](../../../vendor/captacity) — Caption styling patterns
- [ShortGPT](../../../vendor/ShortGPT) — Gameplay asset categories
