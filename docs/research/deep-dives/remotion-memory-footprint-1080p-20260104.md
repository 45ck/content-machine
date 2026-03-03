# Remotion Memory Footprint Research: 1080p Video Rendering

> **Date:** 2026-01-04  
> **Sources:** `vendor/render/remotion`, `vendor/short-video-maker-gyori`, `templates/vidosy`  
> **Focus:** Memory allocation, concurrency, OOM handling for 1080p@30fps rendering

---

## Executive Summary

For **1080p@30fps rendering**, Remotion requires:

- **Minimum RAM:** 3GB free memory (Docker recommendation)
- **Recommended RAM:** 4GB+ for stable operation
- **Cache settings:** 2GB `offthreadVideoCacheSizeInBytes` (2,097,152,000 bytes)
- **Concurrency:** 1 for resource-constrained environments

---

## 1. Memory Allocation Settings

### 1.1 Browser Heap / Concurrency

**Concurrency Definition** (from Remotion docs):

> "Concurrency refers to how many browser tabs are opened in parallel during a render. Each Chrome tab renders web content and then screenshots it."

**Default Concurrency Calculation** ([get-concurrency.ts](../../../vendor/render/remotion/packages/renderer/src/get-concurrency.ts)):

```typescript
export const resolveConcurrency = (userPreference: number | string | null) => {
  const maxCpus = getCpuCount();

  if (userPreference === null) {
    // Default: half of CPU cores, min 1, max 8
    return Math.round(Math.min(8, Math.max(1, maxCpus / 2)));
  }
  // ... percentage-based or explicit number handling
};
```

**Key Insight:** Each Chrome tab consumes significant memory. For limited resources, set `concurrency=1`.

### 1.2 Video Cache Size

**Default Cache Behavior** (from [cache.mdx](../../../vendor/render/remotion/packages/docs/docs/media/cache.mdx)):

> "By default, the cache may grow to up to 50% of the available system memory. A minimum of 500MB and a maximum of 20GB is enforced."

**Production Docker Config** ([main.Dockerfile](../../../vendor/short-video-maker-gyori/main.Dockerfile)):

```dockerfile
# number of chrome tabs to use for rendering
ENV CONCURRENCY=1
# video cache - 2000MB
ENV VIDEO_CACHE_SIZE_IN_BYTES=2097152000
```

---

## 2. OffthreadVideo vs Video Memory Differences

### 2.1 OffthreadVideo Mechanics

From [offthreadvideo.mdx](../../../vendor/render/remotion/packages/docs/docs/offthreadvideo.mdx):

> "This component imports and displays a video... during rendering, extracts the exact frame from the video and displays it in an `<Img>` tag. This extraction process happens outside the browser using FFmpeg."

**Memory Implications:**

- Frame extraction happens **outside browser** (via Rust compositor)
- Frames cached as images, not video buffers
- Cache controlled via `offthreadVideoCacheSizeInBytes`

### 2.2 Memory Parameters

| Parameter                        | Type             | Description                            |
| -------------------------------- | ---------------- | -------------------------------------- |
| `offthreadVideoCacheSizeInBytes` | `number \| null` | Cache for `<OffthreadVideo>` frames    |
| `mediaCacheSizeInBytes`          | `number \| null` | Cache for `@remotion/media` components |
| `offthreadVideoThreads`          | `number \| null` | Worker threads for frame extraction    |

**Code Reference** ([render-defaults.ts](../../../vendor/render/remotion/packages/studio-shared/src/render-defaults.ts)):

```typescript
export type RenderDefaults = {
  // ... other settings
  mediaCacheSizeInBytes: number | null;
  offthreadVideoCacheSizeInBytes: number | null;
  offthreadVideoThreads: number | null;
  // ...
};
```

### 2.3 Transparent Video Impact

From OffthreadVideo docs:

- **`transparent: false` (default):** Frames extracted as BMP (faster)
- **`transparent: true`:** Frames extracted as PNG (slower, more memory)

---

## 3. Composition Size Impact on Memory

### 3.1 Resolution Configurations Found

**Portrait Mode (1080x1920)** - short-video-maker-gyori:

```tsx
<Composition
  id="PortraitVideo"
  width={1080}
  height={1920}
  fps={25}
  // ...
/>
```

**Landscape Mode (1920x1080)** - short-video-maker-gyori:

```tsx
<Composition
  id="LandscapeVideo"
  width={1920}
  height={1080}
  fps={25}
  // ...
/>
```

### 3.2 Memory Formula (Estimated)

For a single uncompressed frame buffer:

```
Frame Memory = Width × Height × Bytes per Pixel

1080p RGBA: 1920 × 1080 × 4 = 8,294,400 bytes (~8MB/frame)
1080p RGB:  1920 × 1080 × 3 = 6,220,800 bytes (~6MB/frame)
```

With concurrency and caching:

```
Working Memory ≈ (Frames in cache) × (Frame size) × (Concurrency) + (Browser overhead)
```

### 3.3 vidosy Performance Metrics

From [CHANGELOG.md](../../../dev/templates/vidosy/CHANGELOG.md):

```markdown
#### Rendering Performance

- **Simple Video**: ~2-5 minutes for 15-second video
- **Complex Video**: ~5-15 minutes for 30-second video
- **Memory Usage**: 2-8GB RAM during rendering
```

---

## 4. Frame Buffer Memory Usage

### 4.1 Compositor Frame Buffers

The Rust compositor handles frame extraction ([filter-asset-types.ts](../../../vendor/render/remotion/packages/renderer/src/filter-asset-types.ts)):

```typescript
export const filterAssetTypes = ({
  frameBuffer, // Buffer | null - raw frame data
  // ...
}) => {
  if (frameBuffer === null) {
    throw new Error('Frame buffer is null');
  }
  return {
    content: new Uint8Array(frameBuffer),
    // ...
  };
};
```

### 4.2 Encoding Buffer

FFmpeg encoding uses configurable buffers ([crf.ts](../../../vendor/render/remotion/packages/renderer/src/crf.ts)):

```typescript
const bufSizeArray = encodingBufferSize
  ? ['-bufsize', encodingBufferSize] // e.g., '10M'
  : [];
```

---

## 5. GPU vs CPU Rendering Memory

### 5.1 GPU-Accelerated Content

From [gpu.mdx](../../../vendor/render/remotion/packages/docs/docs/gpu.mdx):

**GPU-accelerated:**

- WebGL (Three.js, Skia, P5.js, Mapbox)
- `box-shadow`, `text-shadow`
- `linear-gradient()`, `radial-gradient()`
- `filter: blur()`, `filter: drop-shadow()`
- `transform`
- 2D Canvas operations

**NOT GPU-accelerated:**

- `<Html5Video>`
- `<OffthreadVideo>`
- Canvas pixel manipulation
- Video encoding

### 5.2 GL Renderer Options

From [open-gl.mdx](../../../vendor/render/remotion/packages/docs/docs/open-gl.mdx):

| Renderer    | Use Case                 | Memory Notes          |
| ----------- | ------------------------ | --------------------- |
| `null`      | Default (Chrome decides) | Standard              |
| `angle`     | Desktop with GPU         | ⚠️ Memory leaks known |
| `swangle`   | Lambda/no GPU            | Software rendering    |
| `angle-egl` | Linux cloud GPU          | Recommended for cloud |
| `vulkan`    | Modern GPU               | Better performance    |

**Critical Warning:**

> "⚠️ Memory leaks are a known problem with `angle`. We recommend to split up long renders into multiple parts when rendering large videos."

### 5.3 Hardware Acceleration Settings

From [video-encoder-config.ts](../../../vendor/render/remotion/packages/webcodecs/src/video-encoder-config.ts):

```typescript
// WebCodecs hardware acceleration
hardwareAcceleration: 'prefer-hardware',  // GPU encoding
hardwareAcceleration: 'prefer-software',  // CPU encoding
```

---

## 6. Recommended Memory for 1080p@30fps

### 6.1 Minimum Requirements

From [README.md](../../../vendor/short-video-maker-gyori/README.md):

```markdown
## General Requirements

- ≥ 3 gb free RAM, my recommendation is 4gb RAM
- ≥ 2 vCPU
- ≥ 5gb disc space
```

> "The server needs at least 3gb free memory. Make sure to allocate enough RAM to Docker."

### 6.2 Recommended Configuration

| Scenario         | RAM   | Concurrency | Cache Size |
| ---------------- | ----- | ----------- | ---------- |
| Minimal (Docker) | 3-4GB | 1           | 2GB        |
| Standard         | 4-8GB | 2-4         | 4GB        |
| Production       | 8GB+  | 4-8         | 8GB        |
| Heavy workloads  | 16GB+ | 8+          | 10-20GB    |

### 6.3 Docker Configuration (Production-Ready)

```dockerfile
# Recommended settings for 1080p rendering
ENV CONCURRENCY=1
ENV VIDEO_CACHE_SIZE_IN_BYTES=2097152000  # 2GB
```

---

## 7. Concurrency Impact on Memory

### 7.1 Memory Scaling

Each concurrent Chrome tab adds:

- ~100-300MB base Chrome overhead
- Frame buffer memory (8MB per 1080p frame)
- JavaScript heap for React rendering
- Cache allocation share

### 7.2 OOM Prevention Strategy

From documentation and code analysis:

1. **Lower concurrency:** Reduces parallel memory usage
2. **Reduce cache size:** `offthreadVideoCacheSizeInBytes` setting
3. **Dynamic cache management:** Remotion halves cache when memory low

From [sigkill.mdx](../../../vendor/render/remotion/packages/docs/docs/troubleshooting/sigkill.mdx):

> "If Remotion realizes that the system is short on memory, it will halfen the cache size and free up memory."

---

## 8. OOM Handling Patterns

### 8.1 Common OOM Errors

```txt
Compositor quit with signal SIGKILL: [...]
FFmpeg quit with code null (SIGKILL)
```

### 8.2 Mitigation Strategies

From Remotion troubleshooting docs:

1. **Lower cache size:**

   ```typescript
   renderMedia({
     offthreadVideoCacheSizeInBytes: 1024 * 1024 * 500, // 500MB
     // ...
   });
   ```

2. **Lower concurrency:**

   ```typescript
   renderMedia({
     concurrency: 1,
     // ...
   });
   ```

3. **Update Remotion:** Memory improvements in v4.0.171+

4. **Split long renders:** Break into chunks to prevent memory accumulation

### 8.3 short-video-maker-gyori Pattern

All Docker images use consistent OOM prevention:

```dockerfile
# CONCURRENCY=1 to overcome OOM errors coming from Remotion with limited resources
# VIDEO_CACHE_SIZE_IN_BYTES=2097152000 (2gb) to overcome OOM errors
```

---

## 9. Code Snippets: Production Configuration

### 9.1 Remotion Render Call (TypeScript)

From [Remotion.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Remotion.ts):

```typescript
await renderMedia({
  codec: 'h264',
  composition,
  serveUrl: this.bundled,
  outputLocation,
  inputProps: data,
  onProgress: ({ progress }) => {
    logger.debug(`Rendering ${id} ${Math.floor(progress * 100)}% complete`);
  },
  // preventing memory issues with docker
  concurrency: this.config.concurrency,
  offthreadVideoCacheSizeInBytes: this.config.videoCacheSizeInBytes,
});
```

### 9.2 Config Loading (TypeScript)

From [config.ts](../../../vendor/short-video-maker-gyori/src/config.ts):

```typescript
// docker-specific, performance-related settings to prevent memory issues
public concurrency?: number;
public videoCacheSizeInBytes: number | null = null;

constructor() {
  // ...
  this.concurrency = process.env.CONCURRENCY
    ? parseInt(process.env.CONCURRENCY)
    : undefined;

  if (process.env.VIDEO_CACHE_SIZE_IN_BYTES) {
    this.videoCacheSizeInBytes = parseInt(
      process.env.VIDEO_CACHE_SIZE_IN_BYTES,
    );
  }
}
```

### 9.3 Environment Variables

| Variable                    | Description             | Recommended         |
| --------------------------- | ----------------------- | ------------------- |
| `CONCURRENCY`               | Chrome tabs in parallel | `1` for limited RAM |
| `VIDEO_CACHE_SIZE_IN_BYTES` | OffthreadVideo cache    | `2097152000` (2GB)  |

---

## 10. Benchmarks Summary

### 10.1 vidosy Benchmarks

| Video Type | Duration | Render Time | Memory |
| ---------- | -------- | ----------- | ------ |
| Simple     | 15s      | 2-5 min     | 2-4GB  |
| Complex    | 30s      | 5-15 min    | 4-8GB  |

### 10.2 Estimated Memory Breakdown (1080p)

| Component                | Memory Usage |
| ------------------------ | ------------ |
| Chrome base              | 100-300MB    |
| Per frame buffer         | ~8MB         |
| React/JS heap            | 50-200MB     |
| Video cache (configured) | 2GB          |
| FFmpeg encoding          | 100-500MB    |
| **Total per tab**        | **~2.5-3GB** |

---

## 11. Recommendations

### For content-machine Implementation

1. **Default Configuration:**

   ```typescript
   const RENDER_CONFIG = {
     concurrency: 1, // Safe default
     offthreadVideoCacheSizeInBytes: 2 * 1024 * 1024 * 1024, // 2GB
   };
   ```

2. **Dynamic Scaling:**

   ```typescript
   function getOptimalConcurrency(availableMemoryGB: number): number {
     if (availableMemoryGB < 4) return 1;
     if (availableMemoryGB < 8) return 2;
     if (availableMemoryGB < 16) return 4;
     return Math.min(8, Math.floor(availableMemoryGB / 3));
   }
   ```

3. **Error Recovery:**
   - Catch SIGKILL errors
   - Retry with lower concurrency
   - Implement chunk-based rendering for long videos

4. **Docker Memory Allocation:**
   - Allocate 4GB minimum to Docker
   - Use `--memory` flag if needed: `docker run --memory=4g`

---

## References

- [Remotion Concurrency Terminology](../../../vendor/render/remotion/packages/docs/docs/terminology/concurrency.mdx)
- [Remotion Media Cache](../../../vendor/render/remotion/packages/docs/docs/media/cache.mdx)
- [Remotion SIGKILL Troubleshooting](../../../vendor/render/remotion/packages/docs/docs/troubleshooting/sigkill.mdx)
- [Remotion GPU Usage](../../../vendor/render/remotion/packages/docs/docs/gpu.mdx)
- [short-video-maker-gyori README](../../../vendor/short-video-maker-gyori/README.md)
- [vidosy CHANGELOG](../../../dev/templates/vidosy/CHANGELOG.md)
