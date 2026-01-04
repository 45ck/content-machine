# Deep Dive: vidosy - Configuration-Driven Video Generation

**Date:** 2026-01-02  
**Repo:** `templates/vidosy/`  
**Priority:** ⭐ CRITICAL - JSON → Video Pattern

---

## Executive Summary

**vidosy** demonstrates a configuration-driven approach to video generation where videos are defined as JSON specifications. This "video as data" pattern is fundamental for programmatic video creation.

### Why This Matters

- ✅ JSON configuration → video
- ✅ Scene-based composition
- ✅ Audio layering (background music + narration)
- ✅ Multiple background types (video, image, color)
- ✅ Text overlays with positioning
- ✅ CLI for rendering

---

## Core Concept: Video as JSON

Instead of imperative code, videos are defined declaratively:

```json
{
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 14
  },
  "audio": {
    "background": "background-music.mp3",
    "volume": 0.4,
    "fadeIn": 2,
    "fadeOut": 3
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": {
        "type": "image",
        "value": "intro-background.png"
      },
      "text": {
        "content": "Welcome to Vidosy",
        "fontSize": 72,
        "color": "#ffffff",
        "position": "center"
      },
      "audio": {
        "file": "intro-narration.mp3",
        "volume": 0.9
      }
    }
  ]
}
```

---

## Configuration Schema

### Video Settings

| Property | Type | Description |
|----------|------|-------------|
| `width` | number | Video width in pixels |
| `height` | number | Video height in pixels |
| `fps` | number | Frames per second |
| `duration` | number | Total duration in seconds |

### Scene Configuration

#### Background Types

**Color:**
```json
{ "type": "color", "value": "#000000" }
```

**Image:**
```json
{ "type": "image", "value": "path/to/image.png" }
```

**Video:**
```json
{ "type": "video", "value": "path/to/video.mp4" }
```

#### Text Overlays

```json
{
  "text": {
    "content": "Your text here",
    "fontSize": 64,
    "color": "#ffffff",
    "position": "center"  // top, center, bottom, left, right
  }
}
```

#### Scene Audio

```json
{
  "audio": {
    "file": "narration.mp3",
    "volume": 0.8,
    "startTime": 0
  }
}
```

### Background Music

```json
{
  "audio": {
    "background": "music.mp3",
    "volume": 0.4,
    "fadeIn": 2,
    "fadeOut": 3
  }
}
```

---

## Architecture

```
vidosy/
├── src/
│   ├── cli/                 # Command-line interface
│   │   ├── commands/        # render, preview commands
│   │   └── utils/          
│   ├── remotion/            # Video composition engine
│   │   ├── components/      # React components
│   │   ├── hooks/          
│   │   └── utils/          
│   └── shared/             # Shared types
│       ├── constants.ts
│       └── zod-schema.ts   # Validation schemas
├── bin/                     # CLI executable
└── examples/               
```

### CLI Usage

```bash
# Basic render
vidosy render

# Custom config file
vidosy render my-video.json

# Custom output and quality
vidosy render -o output.mp4 -q high
```

### Quality Presets

| Quality | Resolution | FPS |
|---------|------------|-----|
| low | 1280x720 | 24 |
| medium | 1920x1080 | 30 |
| high | 1920x1080 | 60 |

---

## Key Patterns

### 1. Schema-First Design

Everything is validated with Zod:

```typescript
// src/shared/zod-schema.ts
const sceneSchema = z.object({
  id: z.string(),
  duration: z.number(),
  background: backgroundSchema,
  text: textSchema.optional(),
  audio: sceneAudioSchema.optional(),
});

const videoConfigSchema = z.object({
  video: videoSettingsSchema,
  audio: backgroundAudioSchema.optional(),
  scenes: z.array(sceneSchema),
});
```

### 2. Remotion Composition

```typescript
// src/remotion/VidosyComposition.tsx
export const VidosyComposition: React.FC<Props> = ({ config }) => {
  return (
    <AbsoluteFill>
      {config.scenes.map((scene, index) => (
        <Scene key={scene.id} scene={scene} startFrame={calculateStart(index)} />
      ))}
      {config.audio?.background && (
        <Audio src={config.audio.background} volume={config.audio.volume} />
      )}
    </AbsoluteFill>
  );
};
```

### 3. Scene Rendering

Each scene is a React component:
- Fade in/out animations
- Background rendering (video/image/color)
- Text overlay with positioning
- Audio synchronization

---

## What We Can Adopt

### Direct Adoption ✅

1. **JSON config pattern** - Video as data
2. **Scene abstraction** - Modular composition
3. **Audio layering** - Background + per-scene audio
4. **Quality presets** - Easy configuration
5. **CLI pattern** - Render from command line

### Extension Needed 🔧

1. **Captions** - Add word-level caption support
2. **Transitions** - Add scene transitions
3. **Templates** - Pre-built scene templates
4. **Asset sourcing** - Integrate Pexels, TTS

---

## Integration with short-video-maker-gyori

The vidosy pattern can enhance short-video-maker-gyori:

```typescript
// Current short-video-maker-gyori approach
const scenes: Scene[] = [
  {
    captions: [...],
    video: "http://...",
    audio: { url: "...", duration: 5 }
  }
];

// Enhanced with vidosy pattern
const videoConfig = {
  video: { width: 1080, height: 1920, fps: 30 },
  scenes: [
    {
      id: "scene-1",
      duration: 5,
      background: { type: "video", value: "..." },
      text: { content: "...", position: "bottom" },
      audio: { file: "...", volume: 0.9 },
      captions: [...] // Add caption support
    }
  ],
  audio: {
    background: "music.mp3",
    volume: 0.3
  }
};
```

---

## Lessons Learned

1. **Configuration-driven is powerful** - Enables AI to generate video specs
2. **Scene abstraction scales** - Easy to add more scenes
3. **Audio layering is essential** - Background music + narration
4. **Zod validation is critical** - Catch errors before rendering
5. **CLI interface enables automation** - Batch processing

---

## Next Steps

1. [ ] Extract Zod schemas
2. [ ] Study Remotion composition implementation
3. [ ] Design enhanced schema with captions
4. [ ] Plan integration with pipeline

---

**Status:** Research complete. Pattern validated for adoption.
