# Nano Banana Pro → Video Pipeline Guide

**Date:** 2026-01-07  
**Version:** 1.0  
**Audience:** Content Machine Developers

---

## Overview

This guide documents three production-ready workflows for turning Nano Banana Pro images into motion video suitable for TikTok, Reels, and YouTube Shorts.

## Prerequisites

```bash
# Required API Key
export GOOGLE_AI_API_KEY="your-key-here"

# Optional: Local tools for fallback workflows
pip install depthflow  # For 2.5D parallax
brew install ffmpeg    # For Ken Burns effects
```

---

## Workflow 1: Veo Image-to-Video (Highest Quality)

Best for: Hero shots, character animation, complex motion

### Step 1: Generate Keyframe with Nano Banana Pro

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function generateKeyframe(scenePrompt: string): Promise<Buffer> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
  });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: scenePrompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['image'],
      // 9:16 for shorts
      aspectRatio: 'PORTRAIT',
    },
  });

  const imageData = result.response.candidates[0].content.parts[0].inlineData;
  return Buffer.from(imageData.data, 'base64');
}
```

### Step 2: Animate with Veo

```typescript
async function animateKeyframe(keyframe: Buffer, motionPrompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'veo-3' });

  // Start generation operation
  const operation = await model.generateVideo({
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: keyframe.toString('base64') } },
          { text: motionPrompt },
        ],
      },
    ],
    generationConfig: {
      videoDuration: 8,
      aspectRatio: '9:16',
    },
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, 5000));
    await operation.refresh();
  }

  return operation.response.video.uri;
}
```

### Step 3: Download and Composite

```typescript
async function downloadAndComposite(videoUri: string, outputPath: string): Promise<void> {
  const response = await fetch(videoUri);
  const videoBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(videoBuffer));
}
```

### Full Pipeline Example

```typescript
async function generateVideoFromScene(scene: Scene): Promise<string> {
  // 1. Generate consistent keyframe
  const keyframePrompt = `
    ${scene.visualDescription}
    Style: cinematic, 9:16 portrait orientation
    Lighting: ${scene.lighting || 'soft natural light'}
    Camera: ${scene.cameraAngle || 'eye level, centered'}
  `;

  const keyframe = await generateKeyframe(keyframePrompt);

  // 2. Animate with motion
  const motionPrompt = `
    ${scene.motionDescription || 'subtle camera push-in'}
    Duration: 8 seconds
    Smooth, cinematic motion
  `;

  const videoUri = await animateKeyframe(keyframe, motionPrompt);

  // 3. Download
  const clipPath = `./output/clips/${scene.id}.mp4`;
  await downloadAndComposite(videoUri, clipPath);

  return clipPath;
}
```

---

## Workflow 2: DepthFlow 2.5D Parallax (Free, Local)

Best for: Landscapes, architecture, still portraits with depth

### Step 1: Generate Image

```typescript
const keyframe = await generateKeyframe(`
  A beautiful mountain landscape at sunset
  Style: photorealistic, 9:16 portrait
  Depth layers: foreground trees, midground lake, background mountains
`);

await fs.writeFile('./temp/keyframe.png', keyframe);
```

### Step 2: Estimate Depth Map (Automatic)

DepthFlow automatically estimates depth, or you can provide your own:

```bash
# DepthFlow handles depth estimation automatically
depthflow render ./temp/keyframe.png \
  --output ./output/parallax.mp4 \
  --duration 8 \
  --preset orbit \
  --resolution 1080x1920
```

### Step 3: TypeScript Wrapper

```typescript
import { spawn } from 'child_process';

interface DepthFlowConfig {
  input: string;
  output: string;
  duration: number;
  preset: 'orbit' | 'dolly' | 'zoom' | 'horizontal' | 'vertical';
  resolution?: string;
}

async function applyDepthFlow(config: DepthFlowConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      'render',
      config.input,
      '--output',
      config.output,
      '--duration',
      config.duration.toString(),
      '--preset',
      config.preset,
      '--resolution',
      config.resolution || '1080x1920',
    ];

    const process = spawn('depthflow', args);

    process.on('close', (code) => {
      if (code === 0) resolve(config.output);
      else reject(new Error(`DepthFlow exited with code ${code}`));
    });
  });
}
```

### Preset Reference

| Preset       | Motion             | Best For            |
| ------------ | ------------------ | ------------------- |
| `orbit`      | Subtle 3D rotation | Portraits, products |
| `dolly`      | Push in/out        | Landscapes, reveals |
| `zoom`       | Smooth zoom        | Focus attention     |
| `horizontal` | Left-right pan     | Wide scenes         |
| `vertical`   | Up-down tilt       | Tall subjects       |

---

## Workflow 3: Ken Burns with FFmpeg (Fastest, Free)

Best for: Rapid b-roll, simple slideshows, narrated content

### FFmpeg Command Pattern

```bash
# Zoom in from center
ffmpeg -loop 1 -i input.png -vf \
  "scale=8000:-1,zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=300:s=1080x1920" \
  -t 10 -pix_fmt yuv420p output.mp4

# Pan left to right
ffmpeg -loop 1 -i input.png -vf \
  "scale=2000:-1,crop=1080:1920:n*2:0" \
  -t 10 -pix_fmt yuv420p output.mp4
```

### TypeScript Wrapper

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type KenBurnsEffect = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';

interface KenBurnsConfig {
  input: string;
  output: string;
  duration: number;
  effect: KenBurnsEffect;
  fps?: number;
}

async function applyKenBurns(config: KenBurnsConfig): Promise<string> {
  const fps = config.fps || 30;
  const frames = config.duration * fps;

  const filters: Record<KenBurnsEffect, string> = {
    'zoom-in': `scale=8000:-1,zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`,
    'zoom-out': `scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`,
    'pan-left': `scale=-1:2160,crop=1080:1920:(in_w-1080)*n/${frames}:0`,
    'pan-right': `scale=-1:2160,crop=1080:1920:(in_w-1080)*(1-n/${frames}):0`,
    'pan-up': `scale=1080:-1,crop=1080:1920:0:(in_h-1920)*n/${frames}`,
    'pan-down': `scale=1080:-1,crop=1080:1920:0:(in_h-1920)*(1-n/${frames})`,
  };

  await execFileAsync('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-i',
    config.input,
    '-vf',
    filters[config.effect],
    '-t',
    config.duration.toString(),
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '18',
    config.output,
  ]);

  return config.output;
}
```

---

## Workflow Comparison

| Aspect                  | Veo         | DepthFlow  | Ken Burns |
| ----------------------- | ----------- | ---------- | --------- |
| **Quality**             | Highest     | High       | Medium    |
| **True Motion**         | ✅ Yes      | ❌ No      | ❌ No     |
| **Cost**                | ~$0.50/clip | Free       | Free      |
| **Speed**               | 30-60s      | 5-10s      | 2-5s      |
| **Character Animation** | ✅ Yes      | ❌ No      | ❌ No     |
| **Self-Hosted**         | ❌ API only | ✅ Yes     | ✅ Yes    |
| **Best Use Case**       | Hero shots  | Landscapes | B-roll    |

---

## Combining Workflows

For a complete video, use different workflows for different scenes:

```typescript
async function selectWorkflow(scene: Scene): Promise<WorkflowType> {
  // Hero shots → Veo
  if (scene.type === 'hero' || scene.requiresMotion) {
    return 'veo';
  }

  // Landscapes, architecture → DepthFlow
  if (scene.hasDepthLayers || scene.type === 'landscape') {
    return 'depthflow';
  }

  // Simple b-roll → Ken Burns
  return 'kenburns';
}

async function generateAllClips(scenes: Scene[]): Promise<string[]> {
  return Promise.all(
    scenes.map(async (scene) => {
      const keyframe = await generateKeyframe(scene.prompt);
      const keyframePath = `./temp/${scene.id}.png`;
      await fs.writeFile(keyframePath, keyframe);

      const workflow = await selectWorkflow(scene);
      const outputPath = `./output/clips/${scene.id}.mp4`;

      switch (workflow) {
        case 'veo':
          return animateWithVeo(keyframePath, scene.motionPrompt, outputPath);
        case 'depthflow':
          return applyDepthFlow({
            input: keyframePath,
            output: outputPath,
            duration: 8,
            preset: 'orbit',
          });
        case 'kenburns':
          return applyKenBurns({
            input: keyframePath,
            output: outputPath,
            duration: 8,
            effect: 'zoom-in',
          });
      }
    })
  );
}
```

---

## Character Consistency Tips

When generating multiple scenes with the same character:

### 1. Create a Character Sheet First

```typescript
const characterSheet = await generateKeyframe(`
  Character reference sheet for a professional style guide.
  Subject: [CHARACTER DESCRIPTION]
  Layout: Front view, 3/4 view, side profile
  Style: Clean studio lighting, white background
  Purpose: Reference for maintaining consistency across scenes
`);
```

### 2. Use Reference in Each Scene

```typescript
async function generateSceneWithCharacter(scene: Scene, characterRef: Buffer): Promise<Buffer> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: characterRef.toString('base64') } },
          {
            text: `
          Keep the facial features of the person in the reference image exactly consistent.
          Scene: ${scene.description}
          Preserve: face, hair color, clothing style
          Change only: pose, expression, environment
        `,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['image'],
      aspectRatio: 'PORTRAIT',
    },
  });

  return Buffer.from(result.response.candidates[0].content.parts[0].inlineData.data, 'base64');
}
```

---

## Error Handling

```typescript
async function generateWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const keyframe = await generateWithRetry(() => generateKeyframe(scenePrompt));
```

---

## Integration with Content Machine

### CLI Extension

```bash
# Generate visuals with Nano Banana Pro
cm visuals --provider nanobanana --input timestamps.json --output visuals.json

# Render with motion effect selection
cm render --input visuals.json --motion-strategy adaptive --output video.mp4
```

### Configuration

```toml
# .content-machine.toml
[visuals]
provider = "nanobanana"  # or "pexels" (default)

[visuals.nanobanana]
model = "gemini-2.5-flash-image"
style_consistency = true
character_ref = "./assets/character-ref.png"  # optional

[render]
motion_strategy = "adaptive"  # veo | depthflow | kenburns | adaptive

[render.motion]
hero_workflow = "veo"
landscape_workflow = "depthflow"
broll_workflow = "kenburns"
```

---

## Related Documentation

- [RQ-35: Nano Banana Pro Integration](./RQ-35-NANOBANANA-PRO-INTEGRATION-20260107.md)
- [Vendored: Google Gemini Cookbook](../../../vendor/gemini/cookbook/)
- [Vendored: DepthFlow](../../../vendor/video-effects/DepthFlow/)
- [Vendored: Prompt Libraries](../../../vendor/prompt-libraries/)
