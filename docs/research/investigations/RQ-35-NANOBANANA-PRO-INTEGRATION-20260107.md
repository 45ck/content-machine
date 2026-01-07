# RQ-35: Nano Banana Pro Integration for Content Machine

**Date:** 2026-01-07  
**Status:** Research Complete  
**Category:** Image/Video Generation Integration  
**Priority:** High

---

## Executive Summary

This investigation analyzes how to integrate Google's **Nano Banana Pro** (Gemini 2.5 Flash Image / Gemini 3 Pro Image) into the Content Machine pipeline for generating consistent, high-quality visuals for short-form videos. Nano Banana Pro offers native image generation with "thinking" capabilities, superior text rendering, and seamless integration with Veo for image-to-video workflows.

## What is Nano Banana Pro?

**Nano Banana Pro** is the codename for Google's native image generation capability within the Gemini API:

| Model ID                     | Capabilities                    | Best For                                    |
| ---------------------------- | ------------------------------- | ------------------------------------------- |
| `gemini-2.5-flash-image`     | Fast image gen/edit             | Rapid iteration, simple edits               |
| `gemini-3-pro-image-preview` | "Thinking" mode, text rendering | Complex compositions, character consistency |

### Key Advantages Over Competitors

1. **Native Text Rendering** — Legible text in images (great for title cards, captions, infographics)
2. **Thinking Mode** — Multi-step reasoning for complex compositions
3. **Search Grounding** — Can ground images in real-world references
4. **4K Output** — High resolution suitable for 1080p video
5. **Seamless Veo Integration** — Direct image→video pipeline (same API)

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Content Machine + Nano Banana Pro                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │  cm script   │───▶│   cm visuals    │───▶│       cm render         │ │
│  │              │    │                 │    │                         │ │
│  │ Topic → JSON │    │ Nano Banana Pro │    │ Veo Image-to-Video      │ │
│  │   (LLM)      │    │ + Veo Pipeline  │    │ OR DepthFlow Parallax   │ │
│  └──────────────┘    └─────────────────┘    └─────────────────────────┘ │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐                                  │
│                    │ Visual Outputs  │                                  │
│                    │ • Keyframes     │                                  │
│                    │ • Character     │                                  │
│                    │   Sheets        │                                  │
│                    │ • Title Cards   │                                  │
│                    │ • Infographics  │                                  │
│                    └─────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflow Options

### Workflow A: Image-First (Recommended for Consistency)

Best for: Character consistency, branded content, product videos

1. **Generate Style Bible** — Use Nano Banana Pro to create consistent character/style reference
2. **Create Keyframes** — Generate one image per scene in 9:16 aspect ratio
3. **Animate with Veo** — Use Veo's image-to-video capability for each keyframe
4. **Stitch & Render** — Combine clips with Remotion for final output

```typescript
// Proposed interface
interface NanoBananaVisualProvider extends VisualProvider {
  generateKeyframe(scene: Scene, styleRef?: Buffer): Promise<KeyframeResult>;
  generateStyleSheet(character: CharacterDescription): Promise<StyleSheet>;
  generateTitleCard(text: string, style: TitleStyle): Promise<Buffer>;
  animateKeyframe(keyframe: Buffer, motion: MotionConfig): Promise<VideoClip>;
}
```

### Workflow B: Hybrid (Stock + Generated)

Best for: Fast iteration, mixed content

1. **Use Pexels** for b-roll and backgrounds (current pipeline)
2. **Use Nano Banana Pro** for title cards, infographics, overlays
3. **Use DepthFlow** for parallax motion on generated stills
4. **Composite in Remotion**

### Workflow C: Ken Burns + Parallax (No Veo Needed)

Best for: Budget-conscious, self-hosted

1. **Generate stills** with Nano Banana Pro
2. **Apply DepthFlow** for 2.5D parallax (depth-based motion)
3. **Apply Ken Burns** zoom/pan for additional motion
4. **Composite in Remotion**

## Vendored Resources

### Prompt Libraries (8 repos in `vendor/prompt-libraries/`)

| Repository                        | Content                   | Use Case              |
| --------------------------------- | ------------------------- | --------------------- |
| `awesome-nanobanana-pro`          | 150+ curated prompts      | Master reference      |
| `awesome-nano-banana-pro-prompts` | 1000+ prompts with images | Bulk inspiration      |
| `Awesome-Nano-Banana-images`      | Case library with results | Quality benchmarking  |
| `nanoBananaPrompts`               | Seed/input/output gallery | Reproducible examples |
| `awesome-nano-banana-supermaker`  | Playbook + tutorials      | Best practices        |
| `awesome-gemini-ai`               | Broader Gemini patterns   | Cross-model patterns  |

### Gemini/Veo Tools (3 repos in `vendor/gemini/`)

| Repository                  | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `cookbook`                  | Official Google notebooks (Veo, Nano Banana, image-to-video) |
| `veo-nanobanana-quickstart` | Next.js UI for Veo + Nano Banana (reference implementation)  |
| `GeminiGenerator`           | Python script for batch generation                           |

### Video Effects (5 repos in `vendor/video-effects/`)

| Repository                | Effect Type     | Use Case                     |
| ------------------------- | --------------- | ---------------------------- |
| `DepthFlow`               | 2.5D parallax   | Landscape/architecture shots |
| `kburns-slideshow`        | Ken Burns       | Narrated explainers          |
| `ffmpeg_video_generation` | Zoom/pan        | Fast b-roll motion           |
| `ffmpeg-cheatsheet`       | FFmpeg patterns | Automation reference         |
| `ComfyUI-Depthflow-Nodes` | Workflow-based  | ComfyUI integration          |

### Frame Interpolation (2 repos in `vendor/frame-interpolation/`)

| Repository | Model          | Use Case                   |
| ---------- | -------------- | -------------------------- |
| `FILM`     | Google FILM    | High-quality interpolation |
| `RIFE`     | Real-time RIFE | Fast processing            |

## Implementation Recommendations

### Phase 1: Title Cards & Infographics (Low Risk)

Add Nano Banana Pro for generating:

- Video title cards with legible text
- Infographics for "listicle" archetype
- Comparison graphics for "versus" archetype

```typescript
// src/visuals/providers/nanobanana.ts
export class NanoBananaProvider implements VisualProvider {
  async generateTitleCard(config: TitleCardConfig): Promise<Buffer> {
    const prompt = this.buildTitlePrompt(config);
    const result = await this.client.generateImage({
      model: 'gemini-2.5-flash-image',
      prompt,
      aspectRatio: '9:16',
    });
    return result.image;
  }
}
```

### Phase 2: Keyframe Generation (Medium Risk)

Generate consistent keyframes for each scene:

```typescript
// Scene → Keyframe pipeline
async function generateSceneKeyframes(
  script: ScriptOutput,
  styleRef: StyleReference
): Promise<Keyframe[]> {
  return Promise.all(
    script.scenes.map(async (scene) => {
      const prompt = buildScenePrompt(scene, styleRef);
      const image = await nanoBanana.generate(prompt);
      return { scene, image, timestamp: scene.startTime };
    })
  );
}
```

### Phase 3: Image-to-Video with Veo (Higher Cost)

Animate keyframes using Veo:

```typescript
// Keyframe → Video clip
async function animateKeyframe(keyframe: Keyframe, motion: MotionConfig): Promise<VideoClip> {
  const result = await veo.generateVideo({
    image: keyframe.image,
    prompt: motion.description,
    duration: 8, // Veo generates ~8 second clips
  });
  return result.video;
}
```

### Phase 4: Fallback with DepthFlow (No API Cost)

For cost-sensitive deployments:

```typescript
// Use DepthFlow for 2.5D motion
async function addParallaxMotion(
  image: Buffer,
  depth: DepthMap,
  config: ParallaxConfig
): Promise<VideoClip> {
  return depthflow.render({
    image,
    depthMap: depth,
    duration: config.duration,
    motion: config.motion, // orbit, dolly, zoom, etc.
  });
}
```

## Prompt Engineering Patterns

### Character Consistency Pattern

```text
Keep the facial features of the person in the uploaded image exactly consistent.
[Preserve: face, hair, clothing, accessories]
[Change only: pose, expression, environment]
```

### Style Bible Pattern

```json
{
  "character": {
    "face_features": "preserve_100%",
    "hair": { "style": "...", "color": "..." },
    "clothing": { "type": "...", "colors": [...] }
  },
  "environment": {
    "lighting": "soft studio",
    "background": "consistent across scenes"
  },
  "photography": {
    "camera_style": "cinematic",
    "lens": "35mm",
    "depth_of_field": "moderate"
  }
}
```

### Title Card Pattern

```text
Design a viral video thumbnail for a [ARCHETYPE] video.
Title: "[TITLE]" in bold, pop-style text with white outline and drop shadow.
Style: Clean, modern, high-contrast.
Aspect ratio: 9:16.
Background: [THEME-APPROPRIATE] gradient or subtle pattern.
```

## Cost Considerations

| Operation                   | Model                      | Approximate Cost |
| --------------------------- | -------------------------- | ---------------- |
| Image generation            | gemini-2.5-flash-image     | ~$0.01/image     |
| Image generation (thinking) | gemini-3-pro-image-preview | ~$0.03/image     |
| Video generation (8s)       | Veo 3                      | ~$0.50/clip      |
| Parallax motion             | DepthFlow                  | Free (local)     |
| Ken Burns                   | FFmpeg                     | Free (local)     |

**Recommendation:** Use Nano Banana Pro for keyframes, DepthFlow for motion when budget is constrained. Use Veo only for hero shots or when true motion is critical.

## API Configuration

```typescript
// Environment variables
GOOGLE_AI_API_KEY = your - gemini - api - key;

// Configuration
const nanoBananaConfig = {
  model: 'gemini-2.5-flash-image',
  defaultAspectRatio: '9:16', // Portrait for shorts
  maxRetries: 3,
  timeout: 60000,
};

const veoConfig = {
  model: 'veo-3',
  defaultDuration: 8,
  resolution: '1080p',
};
```

## Quality Benchmarks

Based on vendored prompt libraries:

| Metric                | Target | Measurement                  |
| --------------------- | ------ | ---------------------------- |
| Character consistency | ≥0.90  | Face embedding similarity    |
| Text legibility       | 100%   | OCR accuracy on title cards  |
| Style adherence       | ≥0.85  | CLIP similarity to style ref |
| Visual relevance      | ≥0.80  | LLM-as-judge scoring         |

## Next Steps

1. **Create Zod schemas** for Nano Banana visual outputs
2. **Implement NanoBananaProvider** in `src/visuals/providers/`
3. **Add DepthFlow wrapper** in `src/render/effects/`
4. **Create integration tests** with sample prompts from vendored repos
5. **Update `cm visuals`** to support `--provider nanobanana` flag

## References

- [Gemini API Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Veo 3 Video Generation Docs](https://ai.google.dev/gemini-api/docs/video)
- [Nano Banana Pro Blog Post](https://blog.google/technology/ai/nano-banana-pro/)
- Vendored repos in `vendor/prompt-libraries/`, `vendor/gemini/`, `vendor/video-effects/`
