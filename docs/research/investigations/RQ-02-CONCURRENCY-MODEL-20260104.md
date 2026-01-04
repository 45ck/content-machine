# RQ-02: Concurrency Model for Node.js CLI

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** What concurrency model fits Node.js + external processes?

---

## 1. Problem Statement

The system design assumes sequential execution but doesn't address parallelism opportunities or thread safety. Missed opportunities include:
- Embedding multiple visual directions in parallel
- Downloading stock footage concurrently
- Rendering scenes in parallel (Remotion supports this)
- TTS generation overlapping with early ASR processing

---

## 2. Vendor Evidence

### 2.1 p-limit Pattern (Rate Limiting)

**Source:** [vendor/render/remotion/packages/core/src/p-limit.ts](../../../vendor/render/remotion/packages/core/src/p-limit.ts)

Remotion implements a custom p-limit for controlling concurrent operations:

```typescript
const limit = pLimit(4);  // Max 4 concurrent operations

const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

**Usage in Remotion:** [vendor/render/remotion/packages/cli/src/publish.ts](../../../vendor/render/remotion/packages/cli/src/publish.ts)

```typescript
const limit = pLimit(4);  // 4 concurrent npm publishes
await Promise.all(
  packages.map(pkg => limit(() => publishPackage(pkg)))
);
```

### 2.2 Resource Pool Pattern (Browser Tabs)

**Source:** [vendor/render/remotion/packages/renderer/src/pool.ts](../../../vendor/render/remotion/packages/renderer/src/pool.ts)

Remotion uses a Pool class for expensive resources like browser pages:

```typescript
class Pool<T> {
  private available: T[] = [];
  private waiters: ((resource: T) => void)[] = [];
  
  async acquire(): Promise<T> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return new Promise(resolve => this.waiters.push(resolve));
  }
  
  release(resource: T): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(resource);
    } else {
      this.available.push(resource);
    }
  }
}
```

### 2.3 Sequential Queue (short-video-maker-gyori)

**Source:** [vendor/short-video-maker-gyori/src/short-creator/ShortCreatorService.ts](../../../vendor/short-video-maker-gyori/src/short-creator/ShortCreatorService.ts)

short-video-maker-gyori uses a simple queue with sequential processing:

```typescript
class ShortCreatorService {
  private queue: Job[] = [];
  private processing: boolean = false;
  
  async addJob(job: Job): Promise<void> {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.processJob(job);  // One at a time
    }
    this.processing = false;
  }
}
```

**Note:** Downloads are sequential, not parallel—missed opportunity.

### 2.4 Work Partitioning with Work Stealing

**Source:** [vendor/render/remotion/packages/renderer/src/render-frames.ts](../../../vendor/render/remotion/packages/renderer/src/render-frames.ts)

Remotion divides frames across workers and implements work stealing:

```typescript
// Partition frames across workers
const partitions = divideFrames(frames, concurrency);

// Work stealing: idle workers take from busiest partition
function stealWork(idleWorker: number): number | null {
  const busiestPartition = findBusiestPartition(partitions);
  if (busiestPartition.length > 1) {
    return busiestPartition.pop();
  }
  return null;
}
```

### 2.5 Concurrency Resolution

**Source:** [vendor/render/remotion/packages/renderer/src/get-concurrency.ts](../../../vendor/render/remotion/packages/renderer/src/get-concurrency.ts)

```typescript
export function getActualConcurrency(concurrency: number | string | null): number {
  const maxCpus = os.cpus().length;
  
  if (concurrency === null) {
    // Default: half of CPUs, min 1, max 8
    return Math.round(Math.min(8, Math.max(1, maxCpus / 2)));
  }
  
  if (typeof concurrency === 'string' && concurrency.endsWith('%')) {
    const percentage = parseInt(concurrency) / 100;
    return Math.round(maxCpus * percentage);
  }
  
  return concurrency;
}
```

### 2.6 Python TaskManager Pattern

**Source:** [vendor/MoneyPrinterTurbo/app/services/task.py](../../../vendor/MoneyPrinterTurbo/app/services/task.py)

```python
import threading

class TaskManager:
    def __init__(self, max_workers: int = 4):
        self.lock = threading.Lock()
        self.max_workers = max_workers
        self.active_workers = 0
    
    def submit(self, task: Callable) -> Future:
        with self.lock:
            while self.active_workers >= self.max_workers:
                self.lock.wait()
            self.active_workers += 1
        
        # Run task...
```

---

## 3. Recommended Patterns for content-machine

### 3.1 p-limit for API Calls

```typescript
import pLimit from 'p-limit';

// Limit concurrent API calls to prevent rate limiting
const embedLimit = pLimit(5);   // 5 concurrent embeddings
const stockLimit = pLimit(3);   // 3 concurrent stock API calls
const downloadLimit = pLimit(4); // 4 concurrent downloads

async function processScenes(scenes: Scene[]): Promise<VisualPlan> {
  // Embed all visual directions in parallel (limited)
  const embeddings = await Promise.all(
    scenes.map(scene => embedLimit(() => 
      embedText(scene.visualDirection)
    ))
  );
  
  // Download footage in parallel (limited)
  const assets = await Promise.all(
    scenes.map((scene, i) => downloadLimit(() =>
      downloadFootage(scene, embeddings[i])
    ))
  );
  
  return { scenes: assets };
}
```

### 3.2 Resource Pool for Browser Pages

```typescript
class BrowserPool {
  private browser: Browser;
  private pages: Page[] = [];
  private available: Page[] = [];
  
  async initialize(concurrency: number): Promise<void> {
    this.browser = await puppeteer.launch();
    this.pages = await Promise.all(
      Array(concurrency).fill(null).map(() => this.browser.newPage())
    );
    this.available = [...this.pages];
  }
  
  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const page = await this.acquire();
    try {
      return await fn(page);
    } finally {
      this.release(page);
    }
  }
}
```

### 3.3 Concurrency Configuration

```typescript
interface ConcurrencyConfig {
  embeddings: number;    // Concurrent embedding API calls
  downloads: number;     // Concurrent file downloads
  stockApi: number;      // Concurrent stock API requests
  rendering: number;     // Remotion concurrency
}

function getDefaultConcurrency(): ConcurrencyConfig {
  const cpus = os.cpus().length;
  return {
    embeddings: 5,
    downloads: 4,
    stockApi: 3,
    rendering: Math.min(8, Math.max(1, Math.round(cpus / 2))),
  };
}
```

### 3.4 Rate Limit Aware Fetching

```typescript
import Bottleneck from 'bottleneck';

// Pexels: 200 requests/hour = ~3.3/minute
const pexelsLimiter = new Bottleneck({
  reservoir: 200,
  reservoirRefreshAmount: 200,
  reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
  maxConcurrent: 3,
  minTime: 100, // 100ms between requests
});

async function searchPexels(query: string): Promise<Video[]> {
  return pexelsLimiter.schedule(() => 
    pexelsClient.search({ query })
  );
}
```

---

## 4. Stage-Specific Recommendations

### cm visuals (Highest Parallelism Opportunity)

```typescript
async function cmVisuals(scriptPath: string): Promise<void> {
  const script = await loadScript(scriptPath);
  
  // Phase 1: Embed all visual directions in parallel
  const embeddings = await Promise.all(
    script.scenes.map(scene => embedLimit(() =>
      provider.embed([scene.visualDirection])
    ))
  );
  
  // Phase 2: Search and download in parallel
  const assets = await Promise.all(
    script.scenes.map((scene, i) => downloadLimit(async () => {
      const candidates = await searchFootage(embeddings[i]);
      const selected = await selectWithLLM(scene, candidates);
      return downloadAsset(selected);
    }))
  );
}
```

### cm render (Remotion Handles It)

```typescript
import { renderMedia } from '@remotion/renderer';

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: 'h264',
  outputLocation: 'output.mp4',
  concurrency: config.rendering,  // Remotion manages internally
});
```

### cm audio (Limited Parallelism)

```typescript
// TTS must be sequential (single audio track)
// But ASR can overlap with TTS completion

const [audio] = await Promise.all([
  generateTTS(script),
  // Warmup: preload ASR model while TTS runs
  loadWhisperModel(config.asrModel),
]);

const timestamps = await transcribeWithTimestamps(audio);
```

---

## 5. Implementation Recommendations

| Pattern | Priority | Use Case |
|---------|----------|----------|
| p-limit | P0 | API rate limiting |
| Promise.all with limits | P0 | Parallel downloads |
| Bottleneck | P1 | Complex rate limit rules |
| Resource Pool | P2 | Browser pages (if needed) |
| Work stealing | P3 | Only for long-running renders |

---

## 6. CLI Flags

```bash
# Override default concurrency
cm visuals script.json --concurrency 8

# Percentage of CPUs
cm render project/ --concurrency "50%"

# Sequential (for debugging)
cm visuals script.json --concurrency 1
```

---

## 7. References

- [vendor/render/remotion/packages/core/src/p-limit.ts](../../../vendor/render/remotion/packages/core/src/p-limit.ts) — p-limit implementation
- [vendor/render/remotion/packages/renderer/src/pool.ts](../../../vendor/render/remotion/packages/renderer/src/pool.ts) — Resource pool
- [vendor/render/remotion/packages/renderer/src/get-concurrency.ts](../../../vendor/render/remotion/packages/renderer/src/get-concurrency.ts) — Concurrency resolution
- [vendor/short-video-maker-gyori/src/short-creator/ShortCreatorService.ts](../../../vendor/short-video-maker-gyori/src/short-creator/ShortCreatorService.ts) — Sequential queue
- [SECTION-VISUAL-MATCHING-20260104.md](../sections/SECTION-VISUAL-MATCHING-20260104.md) — Footage download patterns
