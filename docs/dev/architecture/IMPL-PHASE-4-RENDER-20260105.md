# Implementation Phase 4: cm render — Video Rendering

**Phase:** 4  
**Duration:** Weeks 5-7  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-4-RENDER-20260105  
**Prerequisites:** Phases 1-3 complete (all artifacts available)

---

## 1. Overview

Phase 4 implements the `cm render` command, which combines all pipeline artifacts into the final MP4 video using Remotion. This is the final content-producing stage.

### 1.1 Goals

- ✅ `cm render` produces 1080×1920 vertical MP4
- ✅ TikTok-style word-by-word captions
- ✅ Stock footage compositing with Ken Burns
- ✅ 30 FPS, H.264 codec, < 50MB
- ✅ Smooth audio-visual synchronization

### 1.2 Non-Goals

- ❌ Real-time preview — Post-MVP
- ❌ Background music — Post-MVP
- ❌ Multiple export formats — Post-MVP

---

## 2. Deliverables

### 2.1 File Structure

```
src/render/
├── service.ts            # Main render service
├── schema.ts             # RenderProps Zod schema
├── remotion/
│   ├── Root.tsx          # Remotion composition root
│   ├── Video.tsx         # Main video component
│   ├── components/
│   │   ├── Scene.tsx     # Scene wrapper
│   │   ├── Caption.tsx   # Word-highlight captions
│   │   ├── Background.tsx # Stock footage with Ken Burns
│   │   └── Overlay.tsx   # Progress bars, branding
│   ├── hooks/
│   │   └── useAudioSync.ts # Audio timing hooks
│   └── styles/
│       └── caption.css   # Caption styling
├── bundle.ts             # Remotion bundle helper
└── __tests__/
    ├── service.test.ts
    ├── schema.test.ts
    └── components/
        ├── Caption.test.tsx
        └── Scene.test.tsx
```

### 2.2 Component Matrix

| Component  | File                                            | Interface                      | Test Coverage |
| ---------- | ----------------------------------------------- | ------------------------------ | ------------- |
| Schema     | `src/render/schema.ts`                          | `RenderProps`, `RenderOptions` | 100%          |
| Service    | `src/render/service.ts`                         | `RenderService`                | 85%           |
| Bundle     | `src/render/bundle.ts`                          | `bundleRemotionProject()`      | 80%           |
| Root       | `src/render/remotion/Root.tsx`                  | Remotion root                  | N/A           |
| Video      | `src/render/remotion/Video.tsx`                 | Main composition               | E2E           |
| Caption    | `src/render/remotion/components/Caption.tsx`    | `<Caption>`                    | 90%           |
| Scene      | `src/render/remotion/components/Scene.tsx`      | `<Scene>`                      | 85%           |
| Background | `src/render/remotion/components/Background.tsx` | `<Background>`                 | 80%           |
| CLI        | `src/cli/commands/render.ts`                    | `cm render` command            | 80%           |

---

## 3. Implementation Details

### 3.1 Schema Definition

**Pattern from:** [SECTION-VIDEO-RENDERING-20260104.md](../research/sections/SECTION-VIDEO-RENDERING-20260104.md)

```typescript
// src/render/schema.ts
import { z } from 'zod';
import { ScriptOutputSchema } from '../script/schema.js';
import { AudioOutputSchema } from '../audio/schema.js';
import { VisualsOutputSchema } from '../visuals/schema.js';

export const RenderOptionsSchema = z.object({
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().min(24).max(60).default(30),
  codec: z.enum(['h264', 'h265', 'vp9']).default('h264'),
  crf: z.number().int().min(0).max(51).default(23),
  outputPath: z.string(),
});

export const CaptionStyleSchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().int().positive().default(48),
  fontWeight: z.enum(['normal', 'bold', '700', '800', '900']).default('bold'),
  color: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FFE135'),
  strokeColor: z.string().default('#000000'),
  strokeWidth: z.number().nonnegative().default(2),
  position: z.enum(['top', 'center', 'bottom']).default('center'),
  wordsPerLine: z.number().int().min(1).max(5).default(3),
});

export const RenderPropsSchema = z.object({
  script: ScriptOutputSchema,
  audio: AudioOutputSchema,
  visuals: VisualsOutputSchema,
  audioUrl: z.string(), // Path to audio file
  captionStyle: CaptionStyleSchema.optional(),
});

export type RenderOptions = z.infer<typeof RenderOptionsSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
export type RenderProps = z.infer<typeof RenderPropsSchema>;

export function validateRenderProps(data: unknown): RenderProps {
  return RenderPropsSchema.parse(data);
}
```

### 3.2 Remotion Root

```typescript
// src/render/remotion/Root.tsx
import { Composition } from 'remotion';
import { Video } from './Video';
import { RenderProps } from '../schema';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ContentMachineVideo"
        component={Video}
        durationInFrames={1800}  // 60 seconds at 30fps, will be overridden
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{} as RenderProps}
      />
    </>
  );
};
```

### 3.3 Main Video Component

**Pattern from:** [RQ-10-REMOTION-ARCHITECTURE-20260104.md](../research/investigations/RQ-10-REMOTION-ARCHITECTURE-20260104.md)

```typescript
// src/render/remotion/Video.tsx
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from './components/Scene';
import { Caption } from './components/Caption';
import { RenderProps, CaptionStyle } from '../schema';

const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#FFFFFF',
  highlightColor: '#FFE135',
  strokeColor: '#000000',
  strokeWidth: 2,
  position: 'center',
  wordsPerLine: 3,
};

export const Video: React.FC<RenderProps> = ({
  script,
  audio,
  visuals,
  audioUrl,
  captionStyle = defaultCaptionStyle,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Calculate current time in seconds
  const currentTime = frame / fps;

  // Find current scene based on audio timing
  const currentSceneIndex = audio.scenes.findIndex(
    s => currentTime >= s.audioStart && currentTime < s.audioEnd
  );

  // Get current word for highlighting
  const currentScene = audio.scenes[currentSceneIndex];
  const currentWord = currentScene?.words.find(
    w => currentTime >= w.start && currentTime < w.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background video layers */}
      {visuals.scenes.map((visual, index) => {
        const audioScene = audio.scenes[index];
        if (!audioScene) return null;

        const startFrame = Math.floor(audioScene.audioStart * fps);
        const durationFrames = Math.floor(
          (audioScene.audioEnd - audioScene.audioStart) * fps
        );

        return (
          <Sequence
            key={visual.sceneId}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <Scene
              visual={visual}
              duration={durationFrames}
            />
          </Sequence>
        );
      })}

      {/* Caption layer */}
      <Caption
        scenes={audio.scenes}
        currentTime={currentTime}
        style={captionStyle}
      />

      {/* Audio layer */}
      <Audio src={audioUrl} />
    </AbsoluteFill>
  );
};
```

### 3.4 Scene Component with Ken Burns

**Pattern from:** [RQ-11-REMOTION-STOCK-FOOTAGE-20260104.md](../research/investigations/RQ-11-REMOTION-STOCK-FOOTAGE-20260104.md)

```typescript
// src/render/remotion/components/Scene.tsx
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, interpolate } from 'remotion';
import { SceneVisual } from '../../visuals/schema';

interface SceneProps {
  visual: SceneVisual;
  duration: number;
}

export const Scene: React.FC<SceneProps> = ({ visual, duration }) => {
  const frame = useCurrentFrame();

  // Ken Burns effect: subtle zoom and pan
  const scale = interpolate(
    frame,
    [0, duration],
    [1.0, 1.15],  // 15% zoom over scene
    { extrapolateRight: 'clamp' }
  );

  const translateX = interpolate(
    frame,
    [0, duration],
    [0, -20],  // Slight pan
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={visual.selectedAsset.url}
        startFrom={visual.clipStart * 30}  // Assuming 30fps
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      />

      {/* Slight vignette overlay for depth */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
```

### 3.5 Caption Component (TikTok-Style)

**Pattern from:** [RQ-13-CAPTION-SYSTEM-20260104.md](../research/investigations/RQ-13-CAPTION-SYSTEM-20260104.md)

```typescript
// src/render/remotion/components/Caption.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SceneAudio, WordTimestamp } from '../../audio/schema';
import { CaptionStyle } from '../../schema';

interface CaptionProps {
  scenes: SceneAudio[];
  currentTime: number;
  style: CaptionStyle;
}

export const Caption: React.FC<CaptionProps> = ({
  scenes,
  currentTime,
  style,
}) => {
  // Find current word across all scenes
  const allWords = scenes.flatMap(s => s.words);
  const currentWordIndex = allWords.findIndex(
    w => currentTime >= w.start && currentTime < w.end
  );

  if (currentWordIndex === -1) return null;

  // Get words to display (current + context)
  const displayStart = Math.max(0, currentWordIndex - 1);
  const displayEnd = Math.min(allWords.length, currentWordIndex + style.wordsPerLine);
  const displayWords = allWords.slice(displayStart, displayEnd);

  // Position based on style
  const positionStyle = {
    top: style.position === 'top' ? '15%' : undefined,
    bottom: style.position === 'bottom' ? '15%' : undefined,
  };

  if (style.position === 'center') {
    positionStyle.top = '50%';
  }

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: style.position === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        ...positionStyle,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '90%',
          gap: '8px',
        }}
      >
        {displayWords.map((word, index) => {
          const isHighlighted = displayStart + index === currentWordIndex;

          return (
            <Word
              key={`${word.word}-${word.start}`}
              word={word}
              isHighlighted={isHighlighted}
              style={style}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

interface WordProps {
  word: WordTimestamp;
  isHighlighted: boolean;
  style: CaptionStyle;
}

const Word: React.FC<WordProps> = ({ word, isHighlighted, style }) => {
  return (
    <span
      style={{
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: isHighlighted ? style.highlightColor : style.color,
        textShadow: `
          -${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
          ${style.strokeWidth}px -${style.strokeWidth}px 0 ${style.strokeColor},
          -${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor},
          ${style.strokeWidth}px ${style.strokeWidth}px 0 ${style.strokeColor}
        `,
        transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.1s ease-out, color 0.1s ease-out',
        textTransform: 'uppercase',
      }}
    >
      {word.word}
    </span>
  );
};
```

### 3.6 Render Service

```typescript
// src/render/service.ts
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { RenderOptions, RenderProps, validateRenderProps } from './schema';
import { validateScript } from '../script/schema';
import { validateAudioOutput } from '../audio/schema';
import { validateVisualsOutput } from '../visuals/schema';
import { logger } from '../core/logger';

export interface RenderInput {
  scriptPath: string;
  timestampsPath: string;
  visualsPath: string;
  audioPath: string;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
  fileSize: number;
  renderTime: number;
}

export class RenderService {
  private bundlePath: string | null = null;

  async ensureBundled(): Promise<string> {
    if (this.bundlePath && existsSync(this.bundlePath)) {
      return this.bundlePath;
    }

    logger.info('Bundling Remotion project...');

    this.bundlePath = await bundle({
      entryPoint: resolve(__dirname, 'remotion/index.ts'),
      onProgress: (progress) => {
        logger.debug({ progress }, 'Bundle progress');
      },
    });

    logger.info({ path: this.bundlePath }, 'Bundle complete');
    return this.bundlePath;
  }

  async render(input: RenderInput, options: Partial<RenderOptions> = {}): Promise<RenderResult> {
    const startTime = Date.now();

    // Load and validate all inputs
    const script = validateScript(JSON.parse(readFileSync(input.scriptPath, 'utf-8')));
    const audio = validateAudioOutput(JSON.parse(readFileSync(input.timestampsPath, 'utf-8')));
    const visuals = validateVisualsOutput(JSON.parse(readFileSync(input.visualsPath, 'utf-8')));

    const renderOptions: RenderOptions = {
      width: options.width ?? 1080,
      height: options.height ?? 1920,
      fps: options.fps ?? 30,
      codec: options.codec ?? 'h264',
      crf: options.crf ?? 23,
      outputPath: options.outputPath ?? 'output.mp4',
    };

    // Build props
    const props: RenderProps = {
      script,
      audio,
      visuals,
      audioUrl: resolve(input.audioPath),
    };

    // Ensure output directory exists
    const outputDir = dirname(renderOptions.outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Bundle if needed
    const bundlePath = await this.ensureBundled();

    // Calculate duration
    const durationInSeconds = audio.duration;
    const durationInFrames = Math.ceil(durationInSeconds * renderOptions.fps);

    logger.info(
      {
        duration: durationInSeconds,
        frames: durationInFrames,
        output: renderOptions.outputPath,
      },
      'Starting render'
    );

    // Get composition
    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: 'ContentMachineVideo',
      inputProps: props,
    });

    // Render
    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        width: renderOptions.width,
        height: renderOptions.height,
        fps: renderOptions.fps,
      },
      serveUrl: bundlePath,
      codec: renderOptions.codec as 'h264',
      outputLocation: renderOptions.outputPath,
      inputProps: props,
      crf: renderOptions.crf,
      onProgress: ({ progress }) => {
        logger.debug({ progress: Math.round(progress * 100) }, 'Render progress');
      },
    });

    // Get file size
    const stats = await import('fs').then((fs) => fs.statSync(renderOptions.outputPath));

    const result: RenderResult = {
      outputPath: renderOptions.outputPath,
      duration: durationInSeconds,
      fileSize: stats.size,
      renderTime: (Date.now() - startTime) / 1000,
    };

    logger.info(
      {
        output: result.outputPath,
        duration: result.duration,
        size: `${(result.fileSize / 1024 / 1024).toFixed(1)}MB`,
        renderTime: `${result.renderTime.toFixed(1)}s`,
      },
      'Render complete'
    );

    return result;
  }
}
```

### 3.7 CLI Command

```typescript
// src/cli/commands/render.ts
import { Command } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { RenderService } from '../../render/service';
import { logger } from '../../core/logger';
import ora from 'ora';

export function createRenderCommand(): Command {
  return new Command('render')
    .description('Render final video from all artifacts')
    .option('-s, --script <path>', 'Input script.json', 'script.json')
    .option('-t, --timestamps <path>', 'Input timestamps.json', 'timestamps.json')
    .option('-v, --visuals <path>', 'Input visuals.json', 'visuals.json')
    .option('-a, --audio <path>', 'Input audio.wav', 'audio.wav')
    .option('-o, --output <path>', 'Output video path', 'output.mp4')
    .option('--width <number>', 'Video width', parseInt, 1080)
    .option('--height <number>', 'Video height', parseInt, 1920)
    .option('--fps <number>', 'Frames per second', parseInt, 30)
    .option('--crf <number>', 'Compression quality (0-51, lower = better)', parseInt, 23)
    .action(async (options) => {
      // Validate inputs
      const inputs = [
        ['script', options.script],
        ['timestamps', options.timestamps],
        ['visuals', options.visuals],
        ['audio', options.audio],
      ] as const;

      for (const [name, path] of inputs) {
        if (!existsSync(path)) {
          console.error(`${name} file not found: ${path}`);
          process.exit(1);
        }
      }

      const spinner = ora('Rendering video...').start();

      try {
        const service = new RenderService();

        const result = await service.render(
          {
            scriptPath: resolve(options.script),
            timestampsPath: resolve(options.timestamps),
            visualsPath: resolve(options.visuals),
            audioPath: resolve(options.audio),
          },
          {
            outputPath: resolve(options.output),
            width: options.width,
            height: options.height,
            fps: options.fps,
            crf: options.crf,
          }
        );

        spinner.succeed(
          `Video rendered (${result.duration.toFixed(1)}s, ${(result.fileSize / 1024 / 1024).toFixed(1)}MB)`
        );
        console.log(`Output: ${result.outputPath}`);
        console.log(`Render time: ${result.renderTime.toFixed(1)}s`);
      } catch (error) {
        spinner.fail('Render failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

---

## 4. Tests to Write First (TDD)

### 4.1 Schema Tests

```typescript
// src/render/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { RenderOptionsSchema, CaptionStyleSchema } from '../schema';

describe('RenderOptionsSchema', () => {
  it('should use default values', () => {
    const result = RenderOptionsSchema.parse({ outputPath: 'out.mp4' });

    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.fps).toBe(30);
    expect(result.codec).toBe('h264');
  });

  it('should reject invalid FPS', () => {
    expect(() =>
      RenderOptionsSchema.parse({
        outputPath: 'out.mp4',
        fps: 10,
      })
    ).toThrow();
  });
});

describe('CaptionStyleSchema', () => {
  it('should use default values', () => {
    const result = CaptionStyleSchema.parse({});

    expect(result.fontFamily).toBe('Inter');
    expect(result.fontSize).toBe(48);
    expect(result.highlightColor).toBe('#FFE135');
  });
});
```

### 4.2 Caption Component Tests

```typescript
// src/render/__tests__/components/Caption.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Caption } from '../../remotion/components/Caption';

const mockScenes = [
  {
    sceneId: 1,
    text: 'Hello world',
    audioStart: 0,
    audioEnd: 2,
    words: [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.0 },
    ],
  },
];

const defaultStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'bold' as const,
  color: '#FFFFFF',
  highlightColor: '#FFE135',
  strokeColor: '#000000',
  strokeWidth: 2,
  position: 'center' as const,
  wordsPerLine: 3,
};

describe('Caption', () => {
  it('should highlight current word', () => {
    const { container } = render(
      <Caption
        scenes={mockScenes}
        currentTime={0.3}
        style={defaultStyle}
      />
    );

    const words = container.querySelectorAll('span');
    // First word should be highlighted (yellow)
    expect(words[0]).toHaveStyle({ color: '#FFE135' });
  });

  it('should show no captions between words', () => {
    const { container } = render(
      <Caption
        scenes={mockScenes}
        currentTime={5}  // After all words
        style={defaultStyle}
      />
    );

    expect(container.textContent).toBe('');
  });
});
```

### 4.3 Render Service Tests

```typescript
// src/render/__tests__/service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { RenderService } from '../service';

// Mock Remotion
vi.mock('@remotion/bundler', () => ({
  bundle: vi.fn().mockResolvedValue('/tmp/bundle'),
}));

vi.mock('@remotion/renderer', () => ({
  renderMedia: vi.fn().mockResolvedValue(undefined),
  selectComposition: vi.fn().mockResolvedValue({
    id: 'ContentMachineVideo',
    durationInFrames: 900,
    fps: 30,
    width: 1080,
    height: 1920,
  }),
}));

describe('RenderService', () => {
  it('should bundle once and reuse', async () => {
    const service = new RenderService();

    await service.ensureBundled();
    await service.ensureBundled();

    // Bundle should only be called once
    const { bundle } = await import('@remotion/bundler');
    expect(bundle).toHaveBeenCalledTimes(1);
  });
});
```

---

## 5. Validation Checklist

### 5.1 Layer 1: Schema Validation

- [ ] `RenderPropsSchema` validates all inputs
- [ ] Caption style defaults work
- [ ] Render options have sensible limits

### 5.2 Layer 2: Programmatic Checks

- [ ] Output file is valid MP4
- [ ] Resolution is 1080×1920
- [ ] FPS is 30
- [ ] Duration matches audio
- [ ] File size < 50MB for 60s

### 5.3 Layer 3: Video Quality

- [ ] PSNR ≥ 35dB (if comparing to reference)
- [ ] No visible compression artifacts
- [ ] Smooth transitions between scenes
- [ ] Captions sync with audio (within 50ms)

### 5.4 Layer 4: Manual Review

- [ ] Watch 3 complete renders
- [ ] Captions are readable
- [ ] Ken Burns effect is subtle
- [ ] Overall polish is TikTok-quality

---

## 6. Research References

| Topic                        | Document                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Video rendering architecture | [SECTION-VIDEO-RENDERING-20260104.md](../research/sections/SECTION-VIDEO-RENDERING-20260104.md)                 |
| Remotion architecture        | [RQ-10-REMOTION-ARCHITECTURE-20260104.md](../research/investigations/RQ-10-REMOTION-ARCHITECTURE-20260104.md)   |
| Stock footage integration    | [RQ-11-REMOTION-STOCK-FOOTAGE-20260104.md](../research/investigations/RQ-11-REMOTION-STOCK-FOOTAGE-20260104.md) |
| Caption system               | [RQ-13-CAPTION-SYSTEM-20260104.md](../research/investigations/RQ-13-CAPTION-SYSTEM-20260104.md)                 |
| short-video-maker patterns   | [10-short-video-maker-gyori-20260102.md](../research/10-short-video-maker-gyori-20260102.md)                    |
| vidosy JSON-to-video         | [12-vidosy-20260102.md](../research/12-vidosy-20260102.md)                                                      |

---

## 7. Remotion Licensing Note

**CRITICAL:** Remotion requires a company license for commercial use. The open-source license only covers:

- Personal projects
- Open-source projects
- Evaluation

Before commercial deployment, obtain license at: https://www.remotion.dev/license

---

## 8. Definition of Done

Phase 4 is complete when:

- [ ] `cm render` produces valid MP4 output
- [ ] Video is 1080×1920, 30 FPS, H.264
- [ ] Captions sync with audio
- [ ] Ken Burns effect works
- [ ] Unit tests pass with >80% coverage
- [ ] Video quality review passed

---

**Previous Phase:** [IMPL-PHASE-3-VISUALS-20260105.md](IMPL-PHASE-3-VISUALS-20260105.md)  
**Next Phase:** [IMPL-PHASE-5-INTEGRATION-20260105.md](IMPL-PHASE-5-INTEGRATION-20260105.md)
