# Remotion Video Rendering Patterns Research

**Date:** 2026-01-04  
**Scope:** Vendored repos (short-video-maker-gyori, vidosy, template-tiktok-base, template-audiogram, template-overlay, captacity)  
**Status:** Complete

---

## Table of Contents

1. [Composition Structure](#1-composition-structure)
2. [Caption/Subtitle Rendering](#2-captionsubtitle-rendering)
3. [Video/Audio Integration](#3-videoaudio-integration)
4. [Rendering Pipeline](#4-rendering-pipeline)
5. [Input Data Handling](#5-input-data-handling)
6. [Key Code Snippets](#6-key-code-snippets)

---

## 1. Composition Structure

### 1.1 Root Component Pattern

All Remotion projects follow a consistent pattern: a `Root.tsx` file that registers compositions via `<Composition>` components.

**File:** [vendor/short-video-maker-gyori/src/components/root/Root.tsx](../../../vendor/short-video-maker-gyori/src/components/root/Root.tsx)

```tsx
import { CalculateMetadataFunction, Composition } from "remotion";

const FPS = 25;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={AvailableComponentsEnum.PortraitVideo}
        component={PortraitVideo}
        durationInFrames={30}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{...}}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id={AvailableComponentsEnum.LandscapeVideo}
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

### 1.2 Orientation Configurations

**File:** [vendor/short-video-maker-gyori/src/components/types.ts](../../../vendor/short-video-maker-gyori/src/components/types.ts)

```typescript
export enum AvailableComponentsEnum {
  PortraitVideo = 'ShortVideo',
  LandscapeVideo = 'LandscapeVideo',
}

export type OrientationConfig = {
  width: number;
  height: number;
  component: AvailableComponentsEnum;
};
```

**File:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

```typescript
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

### 1.3 Dynamic Duration Calculation

**Pattern:** Use `calculateMetadata` to compute duration from props.

**File:** [vendor/short-video-maker-gyori/src/components/root/Root.tsx](../../../vendor/short-video-maker-gyori/src/components/root/Root.tsx)

```typescript
export const calculateMetadata: CalculateMetadataFunction<
  z.infer<typeof shortVideoSchema>
> = async ({ props }) => {
  const durationInFrames = Math.floor((props.config.durationMs / 1000) * FPS);
  return {
    ...props,
    durationInFrames,
  };
};
```

**File:** [templates/template-tiktok-base/src/CaptionedVideo/index.tsx](../../../templates/template-tiktok-base/src/CaptionedVideo/index.tsx)

```typescript
export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<
  z.infer<typeof captionedVideoSchema>
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);
  return {
    fps,
    durationInFrames: Math.floor(metadata.durationInSeconds * fps),
  };
};
```

### 1.4 Scene/Segment Organization

**Pattern:** Scenes are organized as arrays with timing calculated cumulatively.

**File:** [templates/vidosy/src/remotion/VidosyComposition.tsx](../../../templates/vidosy/src/remotion/VidosyComposition.tsx)

```tsx
export const VidosyComposition: React.FC = () => {
  const config = getInputProps().config as VidosyConfig;
  const { sceneTimings } = useCalculation(config);

  return (
    <AbsoluteFill>
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

### 1.5 Scene Timing Calculation Hook

**File:** [templates/vidosy/src/remotion/hooks/useCalculation.ts](../../../templates/vidosy/src/remotion/hooks/useCalculation.ts)

```typescript
export function useCalculation(config: VidosyConfig) {
  const sceneTimings = useMemo(() => {
    const timings: SceneTiming[] = [];
    let currentFrame = 0;

    for (const scene of config.scenes) {
      const durationInFrames = Math.floor(scene.duration * config.video.fps);

      timings.push({
        start: currentFrame,
        duration: durationInFrames,
        end: currentFrame + durationInFrames,
      });

      currentFrame += durationInFrames;
    }

    return timings;
  }, [config.scenes, config.video.fps]);

  return { sceneTimings, totalDuration, totalDurationInSeconds };
}
```

---

## 2. Caption/Subtitle Rendering

### 2.1 Word-Level Highlighting (Active Word Pattern)

**File:** [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx)

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const activeStyle = {
  backgroundColor: captionBackgroundColor,
  padding: '10px',
  marginLeft: '-10px',
  marginRight: '-10px',
  borderRadius: '10px',
};

// Word-level highlighting based on frame timing
{
  line.texts.map((text, l) => {
    const active =
      frame >= startFrame + (text.startMs / 1000) * fps &&
      frame <= startFrame + (text.endMs / 1000) * fps;
    return (
      <span
        style={{
          fontWeight: 'bold',
          ...(active ? activeStyle : {}),
        }}
        key={`scene-${i}-page-${j}-line-${k}-text-${l}`}
      >
        {text.text}
      </span>
    );
  });
}
```

### 2.2 TikTok-Style Captions (Official @remotion/captions)

**File:** [templates/template-tiktok-base/src/CaptionedVideo/Page.tsx](../../../templates/template-tiktok-base/src/CaptionedVideo/Page.tsx)

```tsx
import { TikTokPage } from '@remotion/captions';
import { fitText } from '@remotion/layout-utils';
import { makeTransform, scale, translateY } from '@remotion/animation-utils';

const HIGHLIGHT_COLOR = '#39E508';

export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
}> = ({ enterProgress, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const fittedText = fitText({
    fontFamily,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: 'uppercase',
  });

  return (
    <AbsoluteFill style={container}>
      <div
        style={{
          fontSize: Math.min(DESIRED_FONT_SIZE, fittedText.fontSize),
          color: 'white',
          WebkitTextStroke: '20px black',
          paintOrder: 'stroke',
          transform: makeTransform([
            scale(interpolate(enterProgress, [0, 1], [0.8, 1])),
            translateY(interpolate(enterProgress, [0, 1], [50, 0])),
          ]),
          textTransform: 'uppercase',
        }}
      >
        {page.tokens.map((t) => {
          const active = t.fromMs - page.startMs <= timeInMs && t.toMs - page.startMs > timeInMs;
          return (
            <span
              key={t.fromMs}
              style={{
                display: 'inline',
                whiteSpace: 'pre',
                color: active ? HIGHLIGHT_COLOR : 'white',
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

### 2.3 Caption Pagination Algorithm

**File:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

```typescript
export function createCaptionPages({
  captions,
  lineMaxLength,
  lineCount,
  maxDistanceMs,
}: {
  captions: Caption[];
  lineMaxLength: number; // Max chars per line (20 for portrait, 30 for landscape)
  lineCount: number; // Lines per page (usually 1)
  maxDistanceMs: number; // Max gap before new page (1000ms)
}) {
  const pages = [];
  let currentPage: CaptionPage = { startMs: 0, endMs: 0, lines: [] };
  let currentLine: CaptionLine = { texts: [] };

  captions.forEach((caption, i) => {
    // Start new page if time gap too large
    if (i > 0 && caption.startMs - currentPage.endMs > maxDistanceMs) {
      if (currentLine.texts.length > 0) currentPage.lines.push(currentLine);
      if (currentPage.lines.length > 0) pages.push(currentPage);
      currentPage = { startMs: caption.startMs, endMs: caption.endMs, lines: [] };
      currentLine = { texts: [] };
    }

    // Start new line if exceeds length
    const currentLineText = currentLine.texts.map((t) => t.text).join(' ');
    if (currentLineText.length + 1 + caption.text.length > lineMaxLength) {
      currentPage.lines.push(currentLine);
      currentLine = { texts: [] };

      // Start new page if lines full
      if (currentPage.lines.length >= lineCount) {
        pages.push(currentPage);
        currentPage = { startMs: caption.startMs, endMs: caption.endMs, lines: [] };
      }
    }

    currentLine.texts.push(caption);
    currentPage.endMs = caption.endMs;
    currentPage.startMs = Math.min(currentPage.startMs || caption.startMs, caption.startMs);
  });

  // Add remaining content
  if (currentLine.texts.length > 0) currentPage.lines.push(currentLine);
  if (currentPage.lines.length > 0) pages.push(currentPage);

  return pages;
}
```

### 2.4 Caption Positioning Options

**File:** [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx)

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

**File:** [templates/vidosy/src/remotion/components/Subtitles.tsx](../../../templates/vidosy/src/remotion/components/Subtitles.tsx)

```tsx
const getPositionStyle = (position: string) => {
  switch (position) {
    case 'top':
      return { top: '10%', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom':
      return { bottom: '10%', left: '50%', transform: 'translateX(-50%)' };
    case 'left':
      return { left: '10%', top: '50%', transform: 'translateY(-50%)' };
    case 'right':
      return { right: '10%', top: '50%', transform: 'translateY(-50%)' };
    case 'center':
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
};
```

### 2.5 Caption Styling Patterns

**TikTok-style (bold, stroke, shadow):**

```tsx
style={{
  fontSize: "6em",
  fontFamily: fontFamily,
  fontWeight: "black",
  color: "white",
  WebkitTextStroke: "2px black",
  WebkitTextFillColor: "white",
  textShadow: "0px 0px 10px black",
  textAlign: "center",
  textTransform: "uppercase",
}}
```

### 2.6 Word Animation with Easing

**File:** [templates/template-audiogram/src/Audiogram/Word.tsx](../../../templates/template-audiogram/src/Audiogram/Word.tsx)

```tsx
const opacity = interpolate(
  frame,
  [msToFrame(item.startMs), msToFrame(item.startMs) + 15],
  [0, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);

const translateY = interpolate(
  frame,
  [msToFrame(item.startMs), msToFrame(item.startMs) + 10],
  [0.25, 0],
  {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }
);
```

### 2.7 Spring Animation for Captions

**File:** [templates/template-tiktok-base/src/CaptionedVideo/SubtitlePage.tsx](../../../templates/template-tiktok-base/src/CaptionedVideo/SubtitlePage.tsx)

```tsx
const enter = spring({
  frame,
  fps,
  config: { damping: 200 },
  durationInFrames: 5,
});
```

---

## 3. Video/Audio Integration

### 3.1 Background Video with Muted Audio

**File:** [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx)

```tsx
import { OffthreadVideo, Audio, Sequence } from 'remotion';

// Background video (muted) + separate audio track
<Sequence from={startFrame} durationInFrames={durationInFrames}>
  <OffthreadVideo src={video} muted />
  <Audio src={audio.url} />
</Sequence>;
```

### 3.2 Background Music with Volume Control

```tsx
import { Audio } from 'remotion';

const [musicVolume, musicMuted] = calculateVolume(config.musicVolume);

<Audio
  loop
  src={music.url}
  startFrom={music.start * fps}
  endAt={music.end * fps}
  volume={() => musicVolume}
  muted={musicMuted}
/>;
```

### 3.3 Volume Level Calculation

**File:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

```typescript
export function calculateVolume(level: MusicVolumeEnum = MusicVolumeEnum.high): [number, boolean] {
  switch (level) {
    case 'muted':
      return [0, true];
    case 'low':
      return [0.2, false];
    case 'medium':
      return [0.45, false];
    case 'high':
      return [0.7, false];
    default:
      return [0.7, false];
  }
}
```

### 3.4 Audio Fade In/Out

**File:** [templates/vidosy/src/remotion/components/Audio.tsx](../../../templates/vidosy/src/remotion/components/Audio.tsx)

```tsx
const backgroundVolume = audio?.volume || 1;
const fadeInDuration = (audio?.fadeIn || 0) * 30; // Convert seconds to frames
const fadeOutDuration = (audio?.fadeOut || 0) * 30;

const backgroundVolumeMultiplier = interpolate(
  frame,
  [
    startFrame,
    startFrame + fadeInDuration,
    startFrame + durationFrames - fadeOutDuration,
    startFrame + durationFrames,
  ],
  [0, backgroundVolume, backgroundVolume, 0],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);

<Audio src={resolveAssetUrl(audio.background)} volume={backgroundVolumeMultiplier} />;
```

### 3.5 Scene-Based Audio Layering

**File:** [templates/vidosy/src/remotion/VidosyComposition.tsx](../../../templates/vidosy/src/remotion/VidosyComposition.tsx)

```tsx
<AbsoluteFill>
  {/* Global background audio - plays throughout */}
  {config.audio?.background && (
    <AudioComponent
      audio={config.audio}
      startFrame={0}
      durationFrames={config.video.fps * config.video.duration}
    />
  )}

  {/* Scene-specific audio */}
  {config.scenes.map((scene, index) => (
    <Sequence key={scene.id} from={sceneTimings[index].start} durationInFrames={sceneTimings[index].duration}>
      <Scene scene={scene} />
      {scene.audio && (
        <AudioComponent sceneAudio={scene.audio} ... />
      )}
    </Sequence>
  ))}
</AbsoluteFill>
```

### 3.6 Frame-Based Timing Calculations

```typescript
// Convert ms to frames
const startFrame = Math.round((page.startMs / 1000) * fps);
const durationInFrames = Math.round(((page.endMs - page.startMs) / 1000) * fps);

// Scene cumulative timing
const startFrame =
  scenes.slice(0, i).reduce((acc, curr) => {
    return acc + curr.audio.duration;
  }, 0) * fps;
```

---

## 4. Rendering Pipeline

### 4.1 Complete Rendering Class

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts)

```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, ensureBrowser } from '@remotion/renderer';

export class Remotion {
  constructor(
    private bundled: string,
    private config: Config
  ) {}

  static async init(config: Config): Promise<Remotion> {
    await ensureBrowser();

    const bundled = await bundle({
      entryPoint: path.join(
        config.packageDirPath,
        config.devMode ? 'src' : 'dist',
        'components',
        'root',
        `index.${config.devMode ? 'ts' : 'js'}`
      ),
    });

    return new Remotion(bundled, config);
  }

  async render(data: z.infer<typeof shortVideoSchema>, id: string, orientation: OrientationEnum) {
    const { component } = getOrientationConfig(orientation);

    const composition = await selectComposition({
      serveUrl: this.bundled,
      id: component,
      inputProps: data,
    });

    const outputLocation = path.join(this.config.videosDirPath, `${id}.mp4`);

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

### 4.2 CLI Rendering Pattern

**File:** [templates/vidosy/src/cli/commands/render.ts](../../../templates/vidosy/src/cli/commands/render.ts)

```typescript
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';

export async function render(configPath: string, options: RenderOptions): Promise<void> {
  // 1. Load and validate configuration
  const config = await loadConfig(configPath);

  // 2. Create dynamic entry point with config embedded
  const tempEntryPoint = path.join(process.cwd(), '.temp-entry.js');
  const entryContent = `
    import { registerRoot } from 'remotion';
    import { Root } from '${path.resolve(__dirname, '../../remotion/Root.js')}';
    const config = ${JSON.stringify(config, null, 2)};
    registerRoot(() => Root({ config }));
  `;
  fs.writeFileSync(tempEntryPoint, entryContent);

  // 3. Bundle the composition
  const bundled = await bundle({
    entryPoint: tempEntryPoint,
    webpackOverride: (config) => config,
  });

  // 4. Get and select composition
  const compositions = await getCompositions(bundled);
  const composition = compositions.find((c) => c.id === 'VidosyComposition');

  // 5. Render video
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: fullOutputPath,
    inputProps: { config },
    ...qualitySettings,
  });

  // 6. Cleanup
  fs.unlinkSync(tempEntryPoint);
}
```

### 4.3 Quality Settings

```typescript
function getQualitySettings(quality: string) {
  switch (quality) {
    case 'low':
      return { width: 1280, height: 720, fps: 24 };
    case 'medium':
      return { width: 1920, height: 1080, fps: 30 };
    case 'high':
      return { width: 1920, height: 1080, fps: 60 };
    default:
      return { width: 1920, height: 1080, fps: 30 };
  }
}
```

### 4.4 Remotion Config File

**File:** [templates/template-tiktok-base/remotion.config.ts](../../../templates/template-tiktok-base/remotion.config.ts)

```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

---

## 5. Input Data Handling

### 5.1 Zod Schema for Video Props

**File:** [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)

```typescript
import { z } from 'zod';

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

### 5.2 Vidosy Full Schema

**File:** [templates/vidosy/src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts)

```typescript
import { z } from 'zod';

export const backgroundSchema = z.object({
  type: z.enum(['color', 'image', 'video']),
  value: z.string(),
});

export const textSchema = z.object({
  content: z.string(),
  fontSize: z.number().min(12).max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  position: z.enum(['top', 'center', 'bottom', 'left', 'right']).optional(),
});

export const sceneSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  background: backgroundSchema.optional(),
  text: textSchema.optional(),
  audio: z
    .object({
      file: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      startTime: z.number().min(0).optional(),
    })
    .optional(),
});

export const videoSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
});

export const audioSchema = z.object({
  background: z.string().optional(),
  volume: z.number().min(0).max(1).optional(),
  fadeIn: z.number().min(0).optional(),
  fadeOut: z.number().min(0).optional(),
});

export const outputSchema = z.object({
  format: z.enum(['mp4', 'mov', 'avi']).optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  filename: z.string().optional(),
});

export const vidosyConfigSchema = z.object({
  video: videoSchema,
  scenes: z.array(sceneSchema).min(1),
  audio: audioSchema.optional(),
  output: outputSchema.optional(),
});
```

### 5.3 Audiogram Schema with zColor

**File:** [templates/template-audiogram/src/Audiogram/schema.ts](../../../templates/template-audiogram/src/Audiogram/schema.ts)

```typescript
import { zColor } from '@remotion/zod-types';
import { z } from 'zod';
import { Caption } from '@remotion/captions';

const visualizerSchema = z.discriminatedUnion('type', [
  spectrumVisualizerSchema,
  oscilloscopeVisualizerSchema,
]);

export const audiogramSchema = z.object({
  visualizer: visualizerSchema,
  coverImageUrl: z.string(),
  titleText: z.string(),
  titleColor: zColor(),
  captionsFileName: z.string().refine((s) => s.endsWith('.srt') || s.endsWith('.json'), {
    message: 'Subtitles file must be a .srt or .json file',
  }),
  captionsTextColor: zColor(),
  onlyDisplayCurrentSentence: z.boolean(),
  audioFileUrl: z.string(),
  audioOffsetInSeconds: z.number().min(0),
});
```

### 5.4 JSON Config Example

**File:** [templates/vidosy/demo-vidosy.json](../../../templates/vidosy/demo-vidosy.json)

```json
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
      "background": { "type": "image", "value": "my-intro-background.png" },
      "text": {
        "content": "Welcome to Vidosy",
        "fontSize": 72,
        "color": "#ffffff",
        "position": "center"
      },
      "audio": { "file": "my-intro-narration.mp3", "volume": 0.9 }
    }
  ]
}
```

### 5.5 Asset URL Resolution

**File:** [templates/vidosy/src/remotion/utils/asset-resolver.ts](../../../templates/vidosy/src/remotion/utils/asset-resolver.ts)

```typescript
import { staticFile } from 'remotion';

export function resolveAssetUrl(assetPath: string): string {
  // Remote URLs pass through
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  // Local files use staticFile
  return staticFile(assetPath);
}
```

### 5.6 Getting Input Props in Composition

```tsx
// Pattern 1: Via component props (schema-validated)
export const PortraitVideo: React.FC<z.infer<typeof shortVideoSchema>> = ({
  scenes,
  music,
  config,
}) => {
  // ...
};

// Pattern 2: Via getInputProps() hook
import { getInputProps } from 'remotion';
export const VidosyComposition: React.FC = () => {
  const config = getInputProps().config as VidosyConfig;
  // ...
};
```

---

## 6. Key Code Snippets

### 6.1 Complete Video Component Structure

```tsx
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  OffthreadVideo,
} from 'remotion';

export const PortraitVideo: React.FC<Props> = ({ scenes, music, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: 'white' }}>
      {/* Background music layer */}
      <Audio loop src={music.url} startFrom={music.start * fps} volume={() => 0.7} />

      {/* Scene sequences */}
      {scenes.map((scene, i) => {
        const startFrame = calculateSceneStart(scenes, i, fps);
        const durationInFrames = calculateSceneDuration(scene, fps);

        return (
          <Sequence from={startFrame} durationInFrames={durationInFrames} key={i}>
            <OffthreadVideo src={scene.video} muted />
            <Audio src={scene.audio.url} />
            <Captions captions={scene.captions} frame={frame} startFrame={startFrame} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

### 6.2 Caption Types

```typescript
// Word-level caption with timing
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
};

// Line containing multiple words
export type CaptionLine = {
  texts: Caption[];
};

// Page containing multiple lines
export type CaptionPage = {
  startMs: number;
  endMs: number;
  lines: CaptionLine[];
};
```

---

## Summary of Key Patterns

| Pattern                      | Implementation                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| **Composition Registration** | `<Composition>` in Root.tsx with schema, calculateMetadata     |
| **Dynamic Duration**         | `calculateMetadata` async function computing frames from props |
| **Scene Organization**       | Array of scenes with cumulative timing via `<Sequence>`        |
| **Word Highlighting**        | Compare frame to word timing, apply conditional styles         |
| **Caption Pagination**       | Group words by line length and time gaps                       |
| **Video Backgrounds**        | `<OffthreadVideo muted />` for memory efficiency               |
| **Audio Layering**           | Separate `<Audio>` for music, narration, effects               |
| **Volume Control**           | `volume={() => number}` or `interpolate()` for fades           |
| **Rendering**                | `bundle()` → `selectComposition()` → `renderMedia()`           |
| **Props Validation**         | Zod schemas with `z.infer<typeof schema>`                      |
| **Asset Resolution**         | `staticFile()` for local, passthrough for URLs                 |

---

## Files Referenced

| File                                                                                                                                                      | Purpose                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| [vendor/short-video-maker-gyori/src/components/root/Root.tsx](../../../vendor/short-video-maker-gyori/src/components/root/Root.tsx)                       | Composition registration   |
| [vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx](../../../vendor/short-video-maker-gyori/src/components/videos/PortraitVideo.tsx) | Main video component       |
| [vendor/short-video-maker-gyori/src/components/utils.ts](../../../vendor/short-video-maker-gyori/src/components/utils.ts)                                 | Caption pagination, schema |
| [vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts) | Rendering pipeline         |
| [templates/vidosy/src/remotion/VidosyComposition.tsx](../../../templates/vidosy/src/remotion/VidosyComposition.tsx)                                       | Scene-based composition    |
| [templates/vidosy/src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts)                                                           | Full video schema          |
| [templates/template-tiktok-base/src/CaptionedVideo/Page.tsx](../../../templates/template-tiktok-base/src/CaptionedVideo/Page.tsx)                         | TikTok-style captions      |
| [templates/template-audiogram/src/Audiogram/Captions.tsx](../../../templates/template-audiogram/src/Audiogram/Captions.tsx)                               | Paginated captions         |
| [templates/template-audiogram/src/Audiogram/Word.tsx](../../../templates/template-audiogram/src/Audiogram/Word.tsx)                                       | Animated word rendering    |
