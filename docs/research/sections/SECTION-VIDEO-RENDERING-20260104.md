# Section Research: Video Rendering (Remotion)

**Research Date:** 2026-01-04  
**Section:** System Design Section 6.4 - `cm render` Command  
**Status:** Complete

---

## 1. Research Questions

This document investigates Remotion video rendering patterns across vendored repositories to inform content-machine's `cm render` command design.

**Key Questions:**

1. How are Remotion compositions structured?
2. How are captions/subtitles rendered and styled?
3. How is audio integrated with video?
4. What is the rendering pipeline (bundling → rendering)?
5. How do props/schemas flow from JSON to Remotion components?

---

## 2. Vendor Evidence Summary

| Repo                    | Composition Structure         | Caption Style                    | Audio Handling                 |
| ----------------------- | ----------------------------- | -------------------------------- | ------------------------------ |
| short-video-maker-gyori | Scene-based Sequences         | TikTok-style (stroke, uppercase) | Audio per scene + global music |
| vidosy                  | Scene array with timing hooks | Text component per scene         | Global + scene-specific audio  |
| template-tiktok-base    | Official Remotion template    | Standard captions                | Audio overlay                  |

---

## 3. Evidence: Composition Registration

**Source:** [vendor/short-video-maker-gyori/src/components/root/Root.tsx](../../../vendor/short-video-maker-gyori/src/components/root/Root.tsx)

### 3.1 Root Component with Multiple Compositions

```tsx
import { CalculateMetadataFunction, Composition } from "remotion";
import { shortVideoSchema } from "../utils";
import { PortraitVideo } from "../videos/PortraitVideo";
import { LandscapeVideo } from "../videos/LandscapeVideo";

const FPS = 25;

export const calculateMetadata: CalculateMetadataFunction<
  z.infer<typeof shortVideoSchema>
> = async ({ props }) => {
  const durationInFrames = Math.floor((props.config.durationMs / 1000) * FPS);
  return {
    ...props,
    durationInFrames,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PortraitVideo"
        component={PortraitVideo}
        durationInFrames={30}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{...}}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="LandscapeVideo"
        component={LandscapeVideo}
        durationInFrames={30}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{...}}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
```

**Pattern:**

- **Multiple compositions** for orientation variants (portrait/landscape)
- **`calculateMetadata`** for dynamic duration based on props
- **Schema validation** via Zod (`shortVideoSchema`)
- **FPS constant** defined at module level (25 fps typical for shorts)
- **Resolution presets**: 1080×1920 (portrait), 1920×1080 (landscape)

### 3.2 registerRoot Entry Point

```typescript
// src/components/root/index.ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

**Pattern:** Single entry point for all compositions.

---

## 4. Evidence: Scene-Based Video Composition

**Source:** [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx)

### 4.1 Scene Sequencing with Cumulative Frames

```tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  OffthreadVideo,
} from 'remotion';

export const PortraitVideo: React.FC<z.infer<typeof shortVideoSchema>> = ({
  scenes,
  music,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: 'white' }}>
      <Audio
        loop
        src={music.url}
        startFrom={music.start * fps}
        endAt={music.end * fps}
        volume={() => musicVolume}
        muted={musicMuted}
      />

      {scenes.map((scene, i) => {
        const { captions, audio, video } = scene;

        // Calculate cumulative start frame
        const startFrame =
          scenes.slice(0, i).reduce((acc, curr) => {
            return acc + curr.audio.duration;
          }, 0) * fps;

        // Calculate end frame with optional padding
        let durationInFrames =
          scenes.slice(0, i + 1).reduce((acc, curr) => {
            return acc + curr.audio.duration;
          }, 0) * fps;
        if (config.paddingBack && i === scenes.length - 1) {
          durationInFrames += (config.paddingBack / 1000) * fps;
        }

        return (
          <Sequence from={startFrame} durationInFrames={durationInFrames} key={`scene-${i}`}>
            <OffthreadVideo src={video} muted />
            <Audio src={audio.url} />
            {/* Caption rendering... */}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

**Pattern:**

- **Cumulative frame calculation**: Each scene starts after previous scenes' durations
- **`OffthreadVideo`** for memory-efficient video playback
- **Separate Audio components** for music and narration
- **Padding at end**: Optional extra time after last scene
- **Muted video**: Background video audio is muted; narration takes precedence

### 4.2 TikTok-Style Caption Rendering

```tsx
// Caption styling
<p
  style={{
    fontSize: '6em',
    fontFamily: fontFamily, // Barlow Condensed
    fontWeight: 'black',
    color: 'white',
    WebkitTextStroke: '2px black',
    WebkitTextFillColor: 'white',
    textShadow: '0px 0px 10px black',
    textAlign: 'center',
    width: '100%',
    textTransform: 'uppercase',
  }}
>
  {line.texts.map((text, l) => {
    // Word-level highlighting
    const active =
      frame >= startFrame + (text.startMs / 1000) * fps &&
      frame <= startFrame + (text.endMs / 1000) * fps;

    return (
      <span
        style={{
          fontWeight: 'bold',
          ...(active ? activeStyle : {}),
        }}
        key={`text-${l}`}
      >
        {text.text}
      </span>
    );
  })}
</p>
```

**Pattern:**

- **Outline stroke**: `WebkitTextStroke` for text visibility
- **Shadow**: Drop shadow for depth
- **Uppercase**: Common for TikTok captions
- **Word-level highlighting**: Compare current frame to word timestamps
- **Active style**: Background color on current word

### 4.3 Caption Position Styles

```tsx
const captionPosition = config.captionPosition ?? 'center';
let captionStyle = {};
if (captionPosition === 'top') {
  captionStyle = { top: 100 };
}
if (captionPosition === 'center') {
  captionStyle = { top: '50%', transform: 'translateY(-50%)' };
}
if (captionPosition === 'bottom') {
  captionStyle = { bottom: 100 };
}
```

**Pattern:** Position offset from edges (100px) or centered with transform.

---

## 5. Evidence: Caption Pagination Algorithm

**Source:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

### 5.1 createCaptionPages Function

```typescript
export function createCaptionPages({
  captions,
  lineMaxLength,
  lineCount,
  maxDistanceMs,
}: {
  captions: Caption[];
  lineMaxLength: number; // e.g., 20 characters
  lineCount: number; // e.g., 1 line
  maxDistanceMs: number; // e.g., 1000ms gap triggers new page
}) {
  const pages = [];
  let currentPage: CaptionPage = { startMs: 0, endMs: 0, lines: [] };
  let currentLine: CaptionLine = { texts: [] };

  captions.forEach((caption, i) => {
    // New page if time gap > maxDistanceMs
    if (i > 0 && caption.startMs - currentPage.endMs > maxDistanceMs) {
      if (currentLine.texts.length > 0) {
        currentPage.lines.push(currentLine);
      }
      if (currentPage.lines.length > 0) {
        pages.push(currentPage);
      }
      currentPage = { startMs: caption.startMs, endMs: caption.endMs, lines: [] };
      currentLine = { texts: [] };
    }

    // New line if exceeds max length
    const currentLineText = currentLine.texts.map((t) => t.text).join(' ');
    if (
      currentLine.texts.length > 0 &&
      currentLineText.length + 1 + caption.text.length > lineMaxLength
    ) {
      currentPage.lines.push(currentLine);
      currentLine = { texts: [] };

      // New page if exceeds line count
      if (currentPage.lines.length >= lineCount) {
        pages.push(currentPage);
        currentPage = { startMs: caption.startMs, endMs: caption.endMs, lines: [] };
      }
    }

    currentLine.texts.push({
      text: caption.text,
      startMs: caption.startMs,
      endMs: caption.endMs,
    });
    currentPage.endMs = caption.endMs;
  });

  // Flush remaining
  if (currentLine.texts.length > 0) currentPage.lines.push(currentLine);
  if (currentPage.lines.length > 0) pages.push(currentPage);

  return pages;
}
```

**Pattern:**

- **Page break on time gap**: >1000ms gap = new page
- **Line break on length**: >20 chars = new line
- **Page break on line count**: >1 line = new page
- **Tracks timing**: Each page has `startMs`/`endMs`

---

## 6. Evidence: Rendering Pipeline

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts)

### 6.1 Complete Rendering Flow

```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ensureBrowser } from '@remotion/renderer';

export class Remotion {
  constructor(
    private bundled: string,
    private config: Config
  ) {}

  static async init(config: Config): Promise<Remotion> {
    // Step 1: Ensure browser is available
    await ensureBrowser();

    // Step 2: Bundle the Remotion project
    const bundled = await bundle({
      entryPoint: path.join(config.packageDirPath, 'src/components/root/index.ts'),
    });

    return new Remotion(bundled, config);
  }

  async render(data: z.infer<typeof shortVideoSchema>, id: string, orientation: OrientationEnum) {
    const { component } = getOrientationConfig(orientation);

    // Step 3: Select composition by ID
    const composition = await selectComposition({
      serveUrl: this.bundled,
      id: component, // "PortraitVideo" or "LandscapeVideo"
      inputProps: data,
    });

    const outputLocation = path.join(this.config.videosDirPath, `${id}.mp4`);

    // Step 4: Render to MP4
    await renderMedia({
      codec: 'h264',
      composition,
      serveUrl: this.bundled,
      outputLocation,
      inputProps: data,
      onProgress: ({ progress }) => {
        logger.debug(`Rendering ${id} ${Math.floor(progress * 100)}% complete`);
      },
      concurrency: this.config.concurrency,
      offthreadVideoCacheSizeInBytes: this.config.videoCacheSizeInBytes,
    });
  }
}
```

**Pattern:**

1. **`ensureBrowser()`**: Ensure headless browser for rendering
2. **`bundle()`**: Bundle React components into servable URL
3. **`selectComposition()`**: Choose composition by ID with input props
4. **`renderMedia()`**: Render to MP4 with h264 codec

### 6.2 Rendering Options

```typescript
await renderMedia({
  codec: 'h264', // H.264 for MP4
  composition, // Selected composition
  serveUrl: this.bundled, // Bundle URL
  outputLocation, // Output path
  inputProps: data, // Props for composition
  concurrency: this.config.concurrency, // Parallel rendering
  offthreadVideoCacheSizeInBytes: 1024 * 1024 * 512, // 512MB cache
});
```

**Pattern:** Memory management via cache size for Docker/cloud environments.

---

## 7. Evidence: Vidosy Composition Pattern

**Source:** [templates/vidosy/src/remotion/VidosyComposition.tsx](../../../templates/vidosy/src/remotion/VidosyComposition.tsx)

### 7.1 Config-Driven Composition

```tsx
import { AbsoluteFill, Sequence, getInputProps } from 'remotion';
import { VidosyConfig } from '../shared/zod-schema';

export const VidosyComposition: React.FC = () => {
  // Get config from Remotion's inputProps
  const config = getInputProps().config as VidosyConfig;

  const { sceneTimings } = useCalculation(config);

  return (
    <AbsoluteFill>
      {/* Background Audio */}
      {config.audio?.background && (
        <AudioComponent
          audio={config.audio}
          startFrame={0}
          durationFrames={config.video.fps * config.video.duration}
        />
      )}

      {/* Scenes */}
      {config.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={sceneTimings[index].start}
          durationInFrames={sceneTimings[index].duration}
        >
          <Scene scene={scene} />
          {scene.audio && (
            <AudioComponent
              sceneAudio={scene.audio}
              startFrame={sceneTimings[index].start}
              durationFrames={sceneTimings[index].duration}
            />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

**Pattern:**

- **`getInputProps()`** for accessing render-time props
- **Scene timing hook** for calculating frame positions
- **Separate audio layers**: Global background + per-scene audio

---

## 8. Evidence: Props Schema

**Source:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

### 8.1 Zod Schema for Video Props

```typescript
export const shortVideoSchema = z.object({
  scenes: z.array(
    z.object({
      captions: z.custom<Caption[]>(),
      audio: z.object({
        url: z.string(),
        duration: z.number(),
      }),
      video: z.string(),
    })
  ),
  config: z.object({
    paddingBack: z.number().optional(),
    captionPosition: z.enum(['top', 'center', 'bottom']).optional(),
    captionBackgroundColor: z.string().optional(),
    durationMs: z.number(),
    musicVolume: z.nativeEnum(MusicVolumeEnum).optional(),
  }),
  music: z.object({
    file: z.string(),
    url: z.string(),
    start: z.number(),
    end: z.number(),
  }),
});
```

**Pattern:**

- **Scene array**: Ordered scenes with captions, audio, video
- **Config object**: Rendering settings (position, padding, volume)
- **Music object**: Background music with loop points
- **Type safety**: `z.infer<typeof shortVideoSchema>` for component props

---

## 9. Synthesis: Recommended Patterns for content-machine

### 9.1 Composition Architecture

```typescript
// src/render/remotion/Root.tsx
import { Composition } from "remotion";
import { RenderPropsSchema } from "./schema";
import { VideoComposition } from "./VideoComposition";

const FPS = 25;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="VideoPortrait"
      component={VideoComposition}
      fps={FPS}
      width={1080}
      height={1920}
      calculateMetadata={calculateDuration}
      schema={RenderPropsSchema}
    />
    <Composition
      id="VideoLandscape"
      component={VideoComposition}
      fps={FPS}
      width={1920}
      height={1080}
      calculateMetadata={calculateDuration}
      schema={RenderPropsSchema}
    />
  </>
);
```

### 9.2 Rendering Service

```typescript
// src/render/service.ts
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, ensureBrowser } from '@remotion/renderer';

export class RenderService {
  private bundledUrl: string | null = null;

  async init() {
    await ensureBrowser();
    this.bundledUrl = await bundle({
      entryPoint: path.resolve(__dirname, 'remotion/index.ts'),
    });
  }

  async render(props: RenderProps, outputPath: string): Promise<void> {
    const compositionId = props.orientation === 'portrait' ? 'VideoPortrait' : 'VideoLandscape';

    const composition = await selectComposition({
      serveUrl: this.bundledUrl!,
      id: compositionId,
      inputProps: props,
    });

    await renderMedia({
      codec: 'h264',
      composition,
      serveUrl: this.bundledUrl!,
      outputLocation: outputPath,
      inputProps: props,
      onProgress: ({ progress }) => {
        console.log(`Rendering: ${Math.floor(progress * 100)}%`);
      },
    });
  }
}
```

### 9.3 Render Props Schema

```typescript
// src/render/schema.ts
import { z } from 'zod';

export const CaptionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
});

export const SceneSchema = z.object({
  videoUrl: z.string().url(),
  audioUrl: z.string().url(),
  audioDurationSec: z.number().positive(),
  captions: z.array(CaptionSchema),
});

export const RenderPropsSchema = z.object({
  scenes: z.array(SceneSchema).min(1),
  config: z.object({
    totalDurationMs: z.number().positive(),
    captionPosition: z.enum(['top', 'center', 'bottom']).default('bottom'),
    captionBackgroundColor: z.string().default('blue'),
    paddingBackMs: z.number().nonnegative().default(1500),
  }),
  music: z
    .object({
      url: z.string().url(),
      startSec: z.number().nonnegative(),
      endSec: z.number().positive(),
      volume: z.enum(['muted', 'low', 'medium', 'high']).default('medium'),
    })
    .optional(),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
});

export type RenderProps = z.infer<typeof RenderPropsSchema>;
```

### 9.4 Caption Component

```tsx
// src/render/remotion/components/Captions.tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface CaptionsProps {
  captions: Caption[];
  sceneStartFrame: number;
  position: 'top' | 'center' | 'bottom';
  backgroundColor: string;
}

export const Captions: React.FC<CaptionsProps> = ({
  captions,
  sceneStartFrame,
  position,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pages = createCaptionPages({
    captions,
    lineMaxLength: 20,
    lineCount: 1,
    maxDistanceMs: 1000,
  });

  return (
    <>
      {pages.map((page, i) => (
        <Sequence
          key={i}
          from={Math.round((page.startMs / 1000) * fps)}
          durationInFrames={Math.round(((page.endMs - page.startMs) / 1000) * fps)}
        >
          <CaptionPage
            page={page}
            currentFrame={frame}
            sceneStartFrame={sceneStartFrame}
            fps={fps}
            position={position}
            backgroundColor={backgroundColor}
          />
        </Sequence>
      ))}
    </>
  );
};
```

---

## 10. Key Takeaways

| Pattern                                              | Source                          | Adoption Priority |
| ---------------------------------------------------- | ------------------------------- | ----------------- |
| `registerRoot` + `Composition` structure             | short-video-maker-gyori         | **Must have**     |
| `calculateMetadata` for dynamic duration             | short-video-maker-gyori         | **Must have**     |
| Zod schema for props validation                      | short-video-maker-gyori, vidosy | **Must have**     |
| `OffthreadVideo` for memory efficiency               | short-video-maker-gyori         | **Must have**     |
| Word-level caption highlighting                      | short-video-maker-gyori         | **Should have**   |
| Caption pagination algorithm                         | short-video-maker-gyori         | **Should have**   |
| TikTok caption styling (stroke, shadow)              | short-video-maker-gyori         | **Should have**   |
| `bundle()` → `selectComposition()` → `renderMedia()` | short-video-maker-gyori         | **Must have**     |
| Memory management (`offthreadVideoCacheSizeInBytes`) | short-video-maker-gyori         | Nice to have      |

---

## 11. References to Existing Research

- [00-SUMMARY-20260102.md](../00-SUMMARY-20260102.md) - Architecture overview
- [10-short-video-maker-gyori-20260102.md](../10-short-video-maker-gyori-20260102.md) - Remotion integration
- [12-vidosy-20260102.md](../12-vidosy-20260102.md) - JSON config → video
- [SECTION-AUDIO-PIPELINE-20260104.md](SECTION-AUDIO-PIPELINE-20260104.md) - Audio handling
- [SECTION-SCHEMAS-VALIDATION-20260104.md](SECTION-SCHEMAS-VALIDATION-20260104.md) - Zod patterns

---

## 12. Next Steps

1. Create Remotion project structure under `src/render/remotion/`
2. Define `RenderPropsSchema` with Zod
3. Implement `VideoComposition` with scene sequences
4. Add TikTok-style caption component
5. Create `RenderService` with bundle/render pipeline
6. Add CLI integration for `cm render` command
7. Add progress reporting via callback
