# RQ-11: Remotion Memory Footprint Management

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** What's the expected memory footprint for Remotion rendering?

---

## 1. Problem Statement

Remotion spawns Chromium instances for rendering. Memory consumption affects:
- Container sizing for Docker/Kubernetes
- Concurrency limits
- Long render stability (memory leaks)
- Cost optimization (right-sizing instances)

---

## 2. Vendor Evidence

### 2.1 Remotion Default Concurrency

**Source:** [vendor/remotion/packages/renderer/src/get-concurrency.ts](../../../vendor/remotion/packages/renderer/src/get-concurrency.ts)

```typescript
function getActualConcurrency(concurrency: number | null): number {
  const cpuCount = os.cpus().length;
  
  if (concurrency !== null) {
    return concurrency;
  }
  
  // Default: half of CPUs, minimum 1, maximum 8
  return Math.min(8, Math.max(1, Math.floor(cpuCount / 2)));
}
```

### 2.2 Minimum Memory Requirements

**From Remotion documentation and community guidance:**

| Configuration | Minimum RAM | Recommended RAM |
|---------------|-------------|-----------------|
| Single-threaded | 2GB | 4GB |
| Concurrency 2 | 3-4GB | 6GB |
| Concurrency 4 | 6GB | 8GB |
| Concurrency 8 | 10GB | 16GB |

**Per-browser overhead:** ~500MB-1GB per Chromium instance.

### 2.3 Docker Configuration

**Source:** [vendor/short-video-maker-gyori/docker-compose.yml](../../../vendor/short-video-maker-gyori/docker-compose.yml)

```yaml
services:
  app:
    image: short-video-maker
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
    environment:
      - CONCURRENCY=2
```

### 2.4 OffthreadVideo Cache Control

**Source:** [vendor/remotion/packages/renderer/src/options/offthread-video-cache-size.tsx](../../../vendor/remotion/packages/renderer/src/options/offthread-video-cache-size.tsx)

```typescript
// Control video frame cache size
const renderMedia = await RenderMedia({
  composition: comp,
  outputLocation: "output.mp4",
  offthreadVideoCacheSizeInBytes: 1024 * 1024 * 512, // 512MB cache
});
```

**Memory impact:**
- Default cache: Unlimited (can grow to gigabytes)
- Recommended: Set explicit limit (256MB-1GB depending on RAM)
- Trade-off: Smaller cache = more re-decoding = slower

### 2.5 Angle Memory Leaks

**Source:** Remotion GitHub issues and documentation warnings.

```typescript
// ⚠️ WARNING: --gl=angle has known memory leaks
// For long renders (>100 scenes), split into chunks

const options = {
  gl: "angle",  // Required on Windows for GPU acceleration
  // Memory grows over time with angle
};

// Mitigation: Split long videos into chunks
async function renderLongVideo(scenes: Scene[]): Promise<string[]> {
  const CHUNK_SIZE = 20; // Scenes per render
  const chunks = chunkArray(scenes, CHUNK_SIZE);
  const outputs: string[] = [];
  
  for (const chunk of chunks) {
    const output = await renderChunk(chunk);
    outputs.push(output);
    
    // Force garbage collection between chunks
    if (global.gc) global.gc();
  }
  
  // Concatenate chunks
  return concatenateVideos(outputs);
}
```

### 2.6 Lambda Memory Sizing

**Source:** [vendor/remotion/packages/lambda](../../../vendor/remotion/packages/lambda)

Remotion Lambda defaults:

| Metric | Default | Recommended |
|--------|---------|-------------|
| Memory | 2048MB | 3008MB+ |
| Timeout | 120s | 900s (max) |
| Ephemeral storage | 512MB | 10GB (for long videos) |

---

## 3. Memory Optimization Strategies

### 3.1 Reduce Concurrency

```typescript
// For memory-constrained environments
const renderMedia = await RenderMedia({
  composition: comp,
  outputLocation: "output.mp4",
  concurrency: 1, // Sequential rendering
});
```

### 3.2 Frame Batching

```typescript
// Render frames in batches to control memory
const BATCH_SIZE = 100;
const totalFrames = composition.durationInFrames;

for (let start = 0; start < totalFrames; start += BATCH_SIZE) {
  const end = Math.min(start + BATCH_SIZE, totalFrames);
  
  await renderFrames({
    composition,
    outputDir: `./frames-${start}`,
    frameRange: [start, end - 1],
  });
  
  // Process frames immediately to free memory
  await encodeFrameBatch(`./frames-${start}`);
  await fs.rm(`./frames-${start}`, { recursive: true });
}
```

### 3.3 Resource Cleanup

```typescript
// Explicit cleanup after render
async function renderWithCleanup(options: RenderOptions): Promise<string> {
  let browser: Browser | null = null;
  
  try {
    const result = await renderMedia({
      ...options,
      onBrowserOpened: (b) => { browser = b; },
    });
    
    return result;
  } finally {
    // Force browser cleanup
    if (browser) {
      await browser.close();
    }
    
    // Suggest GC
    if (global.gc) {
      global.gc();
    }
  }
}
```

---

## 4. Recommended Configuration

### 4.1 Development (Local)

```typescript
const devConfig = {
  concurrency: 2,
  offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024, // 256MB
  gl: "swangle", // Software rendering, slower but stable
};
```

### 4.2 Production (Docker)

```yaml
# docker-compose.yml
services:
  renderer:
    image: content-machine-renderer
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
    environment:
      REMOTION_CONCURRENCY: 4
      OFFTHREAD_CACHE_MB: 512
      GL_RENDERER: angle
```

### 4.3 Kubernetes Resource Requests

```yaml
# deployment.yml
spec:
  containers:
    - name: renderer
      resources:
        requests:
          memory: "4Gi"
          cpu: "2"
        limits:
          memory: "8Gi"
          cpu: "4"
```

---

## 5. Memory Monitoring

### 5.1 Runtime Monitoring

```typescript
import { performance } from "perf_hooks";

interface MemoryMetrics {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
}

function getMemoryMetrics(): MemoryMetrics {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: usage.heapUsed / 1024 / 1024,
    heapTotalMB: usage.heapTotal / 1024 / 1024,
    externalMB: usage.external / 1024 / 1024,
    rssMB: usage.rss / 1024 / 1024,
  };
}

async function renderWithMemoryTracking(options: RenderOptions): Promise<void> {
  const beforeMemory = getMemoryMetrics();
  const startTime = performance.now();
  
  await renderMedia(options);
  
  const afterMemory = getMemoryMetrics();
  const duration = performance.now() - startTime;
  
  logger.info("Render complete", {
    durationMs: duration,
    memoryDelta: {
      heapMB: afterMemory.heapUsedMB - beforeMemory.heapUsedMB,
      rssMB: afterMemory.rssMB - beforeMemory.rssMB,
    },
  });
}
```

### 5.2 Memory Alerts

```typescript
const MEMORY_THRESHOLD_MB = 6 * 1024; // 6GB

setInterval(() => {
  const metrics = getMemoryMetrics();
  
  if (metrics.rssMB > MEMORY_THRESHOLD_MB) {
    logger.warn("Memory threshold exceeded", {
      currentMB: metrics.rssMB,
      thresholdMB: MEMORY_THRESHOLD_MB,
    });
    
    // Optional: Force GC
    if (global.gc) global.gc();
  }
}, 10000); // Check every 10 seconds
```

---

## 6. Implementation Recommendations

| Scenario | Concurrency | Memory | Cache |
|----------|-------------|--------|-------|
| Local dev | 1-2 | 4GB | 256MB |
| CI testing | 2 | 4GB | 256MB |
| Production (8-core) | 4 | 8GB | 512MB |
| Lambda | 1 | 3GB | 128MB |

---

## 7. References

- [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer) — Renderer source
- [vendor/short-video-maker-gyori/docker-compose.yml](../../../vendor/short-video-maker-gyori/docker-compose.yml) — Docker config
- [Remotion Memory Docs](https://www.remotion.dev/docs/memory) — Official guidance
- [SECTION-VIDEO-RENDERING-20260104.md](../sections/SECTION-VIDEO-RENDERING-20260104.md) — Rendering pipeline
