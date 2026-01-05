# Concurrency Patterns for Node.js CLI Applications

**Date:** 2026-01-04  
**Type:** Research Report  
**Status:** Complete

## Executive Summary

This report documents concurrency patterns found in vendored repositories for building a Node.js CLI with external processes (FFmpeg, Remotion, API calls). Key patterns include:

1. **p-limit** - Simple concurrency limiting for Promise.all operations
2. **Resource Pool** - Acquire/release pattern for reusable resources (browser tabs)
3. **Queue-based Processing** - Sequential processing with backpressure
4. **Child Process Spawning** - Streaming communication with external binaries
5. **Work Partitioning** - Dividing work across parallel workers
6. **Retry with Backoff** - Handling transient failures

---

## 1. p-limit Pattern (Rate Limiting API/Promise Calls)

### Remotion's Custom p-limit Implementation

**File:** [vendor/render/remotion/packages/lambda-client/src/p-limit.ts](../../vendor/render/remotion/packages/lambda-client/src/p-limit.ts)

```typescript
export const pLimit = (concurrency: number) => {
  const queue: Function[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()?.();
    }
  };

  const run = async <Arguments extends unknown[], ReturnType>(
    fn: (..._arguments: Arguments) => PromiseLike<ReturnType> | ReturnType,
    resolve: (res: Promise<ReturnType>) => void,
    ...args: Arguments
  ) => {
    activeCount++;
    const result = (async () => fn(...args))();
    resolve(result);
    try {
      await result;
    } catch {}
    next();
  };

  const enqueue = <Arguments extends unknown[], ReturnType>(
    fn: (..._arguments: Arguments) => PromiseLike<ReturnType> | ReturnType,
    resolve: (res: Promise<ReturnType>) => void,
    ...args: Arguments
  ) => {
    queue.push(() => run(fn, resolve, ...args));
    (async () => {
      // Wait for microtask to get accurate activeCount
      await Promise.resolve();
      if (activeCount < concurrency && queue.length > 0) {
        queue.shift()?.();
      }
    })();
  };

  const generator = <Arguments extends unknown[], ReturnType>(
    fn: (..._arguments: Arguments) => PromiseLike<ReturnType> | ReturnType,
    ...args: Arguments
  ) =>
    new Promise<ReturnType>((resolve) => {
      enqueue(fn, resolve, ...args);
    });

  return generator;
};
```

### Usage Example (Publishing Packages)

**File:** [vendor/render/remotion/publish.ts](../../vendor/render/remotion/publish.ts)

```typescript
import limit from 'p-limit';

const p = limit(4); // Max 4 concurrent operations

const promises: Promise<unknown>[] = [];

for (const dir of dirs) {
  promises.push(
    p(() => {
      return $`bun publish --tolerate-republish`.cwd(packagePath);
    })
  );
}

await Promise.all(promises);
```

**Key Points:**

- Wraps each async operation with the limiter
- Still uses `Promise.all` for final resolution
- Limits concurrent execution to N operations

---

## 2. Resource Pool Pattern (Acquire/Release)

### Remotion's Browser Tab Pool

**File:** [vendor/render/remotion/packages/renderer/src/pool.ts](../../vendor/render/remotion/packages/renderer/src/pool.ts)

```typescript
import type { Page } from './browser/BrowserPage';

export class Pool {
  resources: Page[];
  waiters: ((r: Page) => void)[];

  constructor(resources: Page[]) {
    this.resources = resources;
    this.waiters = [];
  }

  acquire(): Promise<Page> {
    const resource = this.resources.shift();
    if (resource !== undefined) {
      return Promise.resolve(resource);
    }

    // No resource available - wait for one to be released
    return new Promise((resolve) => {
      this.waiters.push((freeResource: Page) => {
        resolve(freeResource);
      });
    });
  }

  release(resource: Page): void {
    const waiter = this.waiters.shift();
    if (waiter === undefined) {
      // No one waiting - put resource back in pool
      this.resources.push(resource);
    } else {
      // Someone waiting - give directly to them
      waiter(resource);
    }
  }
}
```

**Usage Pattern:**

```typescript
// Initialize pool with N browser pages
const pool = new Pool(puppeteerPages);

// In worker:
const page = await pool.acquire();
try {
  await renderFrameWithPage(page, frame);
} finally {
  pool.release(page);
}
```

**Key Points:**

- Pre-allocate resources (browser tabs are expensive to create)
- Acquire blocks if no resources available
- Always release in finally block
- First-come-first-served for waiters

---

## 3. Queue-Based Sequential Processing

### short-video-maker-gyori's Video Queue

**File:** [vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts](../../vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts)

```typescript
export class ShortCreator {
  private queue: {
    sceneInput: SceneInput[];
    config: RenderConfig;
    id: string;
  }[] = [];

  public addToQueue(sceneInput: SceneInput[], config: RenderConfig): string {
    // todo add mutex lock
    const id = cuid();
    this.queue.push({
      sceneInput,
      config,
      id,
    });
    if (this.queue.length === 1) {
      this.processQueue(); // Start processing if first item
    }
    return id;
  }

  private async processQueue(): Promise<void> {
    // todo add a semaphore
    if (this.queue.length === 0) {
      return;
    }
    const { sceneInput, config, id } = this.queue[0];

    try {
      await this.createShort(id, sceneInput, config);
      logger.debug({ id }, 'Video created successfully');
    } catch (error: unknown) {
      logger.error(error, 'Error creating video');
    } finally {
      this.queue.shift(); // Remove processed item
      this.processQueue(); // Process next
    }
  }
}
```

**Key Points:**

- Sequential processing (one video at a time)
- Non-blocking `addToQueue` returns immediately with ID
- Client polls for status
- `finally` ensures queue continues even on error
- Comments note need for mutex/semaphore (race condition on queue access)

---

## 4. Task Manager with Concurrency Limits (Python Pattern)

### MoneyPrinterTurbo's TaskManager

**File:** [vendor/MoneyPrinterTurbo/app/controllers/manager/base_manager.py](../../vendor/MoneyPrinterTurbo/app/controllers/manager/base_manager.py)

```python
import threading
from typing import Any, Callable, Dict

class TaskManager:
    def __init__(self, max_concurrent_tasks: int):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.current_tasks = 0
        self.lock = threading.Lock()
        self.queue = self.create_queue()

    def add_task(self, func: Callable, *args: Any, **kwargs: Any):
        with self.lock:
            if self.current_tasks < self.max_concurrent_tasks:
                self.execute_task(func, *args, **kwargs)
            else:
                self.enqueue({"func": func, "args": args, "kwargs": kwargs})

    def execute_task(self, func: Callable, *args: Any, **kwargs: Any):
        thread = threading.Thread(
            target=self.run_task, args=(func, *args), kwargs=kwargs
        )
        thread.start()

    def run_task(self, func: Callable, *args: Any, **kwargs: Any):
        try:
            with self.lock:
                self.current_tasks += 1
            func(*args, **kwargs)
        finally:
            self.task_done()

    def task_done(self):
        with self.lock:
            self.current_tasks -= 1
        self.check_queue()

    def check_queue(self):
        with self.lock:
            if self.current_tasks < self.max_concurrent_tasks and not self.is_queue_empty():
                task_info = self.dequeue()
                self.execute_task(task_info["func"], *task_info["args"], **task_info["kwargs"])
```

**TypeScript Equivalent:**

```typescript
class TaskManager {
  private maxConcurrent: number;
  private currentTasks = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async addTask<T>(fn: () => Promise<T>): Promise<T> {
    if (this.currentTasks < this.maxConcurrent) {
      return this.executeTask(fn);
    }

    // Queue the task
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await this.executeTask(fn));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async executeTask<T>(fn: () => Promise<T>): Promise<T> {
    this.currentTasks++;
    try {
      return await fn();
    } finally {
      this.currentTasks--;
      this.checkQueue();
    }
  }

  private checkQueue(): void {
    if (this.currentTasks < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}
```

---

## 5. Child Process Spawning Patterns

### Remotion's FFmpeg Wrapper

**File:** [vendor/render/remotion/packages/renderer/src/call-ffmpeg.ts](../../vendor/render/remotion/packages/renderer/src/call-ffmpeg.ts)

```typescript
import execa from 'execa';
import type {SpawnOptionsWithoutStdio} from 'node:child_process';
import {spawn} from 'node:child_process';

// Using execa (higher-level, Promise-based)
export const callFf = ({
  args,
  bin,
  indent,
  logLevel,
  options,
  binariesDirectory,
  cancelSignal,
}: CallFfOptions) => {
  const executablePath = getExecutablePath({ type: bin, ... });
  const cwd = path.dirname(executablePath);

  const task = execa(executablePath, args.filter(truthy), {
    cwd,
    env: getExplicitEnv(cwd),
    ...options,
  });

  // Support cancellation
  cancelSignal?.(() => {
    task.kill();
  });

  return task;
};

// Using native spawn (lower-level, streaming)
export const callFfNative = ({
  args, bin, cancelSignal, ...
}: CallFfNativeOptions) => {
  const executablePath = getExecutablePath({ type: bin, ... });
  const cwd = path.dirname(executablePath);

  const task = spawn(executablePath, args.filter(truthy), {
    cwd,
    env: getExplicitEnv(cwd),
    ...options,
  });

  cancelSignal?.(() => {
    task.kill();
  });

  return task;
};
```

### Long-Running Compositor Process

**File:** [vendor/render/remotion/packages/renderer/src/compositor/compositor.ts](../../vendor/render/remotion/packages/renderer/src/compositor/compositor.ts)

```typescript
import {spawn} from 'node:child_process';

export const startCompositor = <T extends keyof CompositorCommand>({
  type,
  payload,
  logLevel,
  indent,
  binariesDirectory = null,
}: CompositorOptions): Compositor => {
  const bin = getExecutablePath({ type: 'compositor', ... });

  const child = spawn(bin, [JSON.stringify(fullCommand)], {
    cwd: path.dirname(bin),
  });

  const waiters = new Map<string, Waiter>();

  // Handle incoming messages
  child.stdout.on('data', onData);
  child.stderr.on('data', (data) => stderrChunks.push(data));

  child.on('close', (code, signal) => {
    // Reject all pending waiters on exit
    const waitersToKill = Array.from(waiters.values());
    for (const waiter of waitersToKill) {
      waiter.reject(new Error(`Compositor quit with signal ${signal}`));
    }
    waiters.clear();
  });

  return {
    // Send command and wait for response
    executeCommand: <Type extends keyof CompositorCommand>(
      command: Type,
      params: CompositorCommand[Type],
    ) => {
      return new Promise<Uint8Array>((resolve, reject) => {
        const nonce = makeNonce();

        child.stdin.write(JSON.stringify({ nonce, payload: { type: command, params }}) + '\n');

        // Store resolver to be called when response arrives
        waiters.set(nonce, { resolve, reject });
      });
    },

    finishCommands: () => new Promise((resolve, reject) => {
      child.stdin.write('EOF\n', (e) => e ? reject(e) : resolve());
    }),

    pid: child.pid ?? null,
  };
};
```

**Key Points:**

- Use nonce-based request/response correlation
- Keep subprocess alive for multiple commands
- Clean up waiters on process exit
- Support cancellation signals

---

## 6. Work Partitioning for Parallel Rendering

### Remotion's Frame Partitioning

**File:** [vendor/render/remotion/packages/renderer/src/render-partitions.ts](../../vendor/render/remotion/packages/renderer/src/render-partitions.ts)

```typescript
export const renderPartitions = ({
  frames,
  concurrency,
}: {
  frames: number[];
  concurrency: number;
}) => {
  const partitions: number[][] = [];
  let start = 0;

  // Divide frames into N partitions
  for (let i = 0; i < concurrency; i++) {
    const end = start + Math.ceil((frames.length - start) / (concurrency - i));
    partitions.push(frames.slice(start, end));
    start = end;
  }

  return {
    partitions,
    // Work stealing: if a worker finishes, steal from longest partition
    getNextFrame: (pageIndex: number) => {
      if (partitions[pageIndex].length === 0) {
        // Find partition with most remaining work
        let longestPartitionIndex = -1;
        for (let i = 0; i < partitions.length; i++) {
          if (
            longestPartitionIndex === -1 ||
            partitions[i].length > partitions[longestPartitionIndex].length
          ) {
            longestPartitionIndex = i;
          }
        }

        // Steal half of their work
        const slicePoint = Math.ceil(partitions[longestPartitionIndex].length / 2) - 1;
        partitions[pageIndex] = partitions[longestPartitionIndex].slice(slicePoint);
        partitions[longestPartitionIndex] = partitions[longestPartitionIndex].slice(0, slicePoint);
      }

      return partitions[pageIndex].shift();
    },
  };
};
```

**Key Points:**

- Divide work upfront by concurrency level
- Work stealing for load balancing
- Prevents idle workers while others have large backlogs

---

## 7. Concurrency Resolution Based on CPU

### Remotion's Concurrency Resolver

**File:** [vendor/render/remotion/packages/renderer/src/get-concurrency.ts](../../vendor/render/remotion/packages/renderer/src/get-concurrency.ts)

```typescript
import { getCpuCount } from './get-cpu-count';

export const resolveConcurrency = (userPreference: number | string | null) => {
  const maxCpus = getCpuCount();

  if (userPreference === null) {
    // Default: half of CPUs, min 1, max 8
    return Math.round(Math.min(8, Math.max(1, maxCpus / 2)));
  }

  if (typeof userPreference === 'string') {
    // Support percentage: "50%"
    const percentage = parseInt(userPreference.slice(0, -1), 10);
    return Math.floor((percentage / 100) * maxCpus);
  }

  // Direct number
  return Math.floor(userPreference);
};
```

**Key Points:**

- Sensible defaults (half CPUs, capped at 8)
- Support percentage-based configuration
- Validate against system limits

---

## 8. Retry Pattern with Timeout

### Pexels API Retry Logic

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts](../../vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts)

```typescript
const defaultTimeoutMs = 5000;
const retryTimes = 3;

async findVideo(
  searchTerms: string[],
  minDurationSeconds: number,
  excludeIds: string[] = [],
  orientation: OrientationEnum = OrientationEnum.portrait,
  timeout: number = defaultTimeoutMs,
  retryCounter: number = 0,
): Promise<Video> {
  for (const searchTerm of [...shuffledSearchTerms, ...shuffledJokerTerms]) {
    try {
      return await this._findVideo(searchTerm, minDurationSeconds, excludeIds, orientation, timeout);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        if (retryCounter < retryTimes) {
          logger.warn({ searchTerm, retryCounter }, "Timeout error, retrying...");
          return await this.findVideo(
            searchTerms, minDurationSeconds, excludeIds, orientation,
            timeout, retryCounter + 1
          );
        }
        logger.error({ searchTerm, retryCounter }, "Timeout error, retry limit reached");
        throw error;
      }
      logger.error(error, "Error finding video");
    }
  }
  throw new Error("No videos found in Pexels API");
}

// Using AbortSignal.timeout for fetch
const response = await fetch(url, {
  signal: AbortSignal.timeout(timeout),
});
```

---

## 9. Promise.all for Parallel Frame Rendering

### Remotion's renderFrames

**File:** [vendor/render/remotion/packages/renderer/src/render-frames.ts](../../vendor/render/remotion/packages/renderer/src/render-frames.ts#L384)

```typescript
// Create pool of browser pages
const getPool = async () => {
  const pages = new Array(concurrencyOrFramesToRender)
    .fill(true)
    .map((_, i) => makeNewPage(framesToRender[i], i));
  const puppeteerPages = await Promise.all(pages);
  return new Pool(puppeteerPages);
};

// Render all frames in parallel (with pool limiting actual concurrency)
await Promise.all(
  allFramesAndExtraFrames.map(() => {
    return renderFrameAndRetryTargetClose({
      retriesLeft: MAX_RETRIES_PER_FRAME,
      poolPromise,
      // ... other options
    });
  })
);
```

**Key Points:**

- `Promise.all` creates all promises immediately
- Pool internally manages actual concurrency
- Each render task acquires from pool, releases when done

---

## 10. fluent-ffmpeg Streaming Pattern

### short-video-maker-gyori's FFmpeg Wrapper

**File:** [vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts](../../vendor/short-video-maker-gyori/src/short-creator/libraries/FFmpeg.ts)

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'node:stream';

export class FFMpeg {
  async saveNormalizedAudio(audio: ArrayBuffer, outputPath: string): Promise<string> {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputStream)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .toFormat('wav')
        .on('end', () => {
          logger.debug('Audio normalization complete');
          resolve(outputPath);
        })
        .on('error', (error: unknown) => {
          logger.error(error, 'Error normalizing audio:');
          reject(error);
        })
        .save(outputPath);
    });
  }

  async createMp3DataUri(audio: ArrayBuffer): Promise<string> {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg()
        .input(inputStream)
        .audioCodec('libmp3lame')
        .toFormat('mp3')
        .on('error', reject)
        .pipe()
        .on('data', (data: Buffer) => chunks.push(data))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(`data:audio/mp3;base64,${buffer.toString('base64')}`);
        })
        .on('error', reject);
    });
  }
}
```

---

## 11. Cross-Platform Subprocess Handling

### MoviePy's Popen Wrapper

**File:** [vendor/video-processing/moviepy/moviepy/tools.py](../../vendor/video-processing/moviepy/moviepy/tools.py)

```python
import subprocess as sp
import os

OS_NAME = os.name

def cross_platform_popen_params(popen_params):
    """Make Popen work without opening extra windows on Windows."""
    if OS_NAME == "nt":
        popen_params["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
    return popen_params

def subprocess_call(cmd, logger="bar"):
    """Execute subprocess with proper cleanup."""
    popen_params = cross_platform_popen_params(
        {"stdout": sp.DEVNULL, "stderr": sp.PIPE, "stdin": sp.DEVNULL}
    )

    proc = sp.Popen(cmd, **popen_params)
    out, err = proc.communicate()  # Wait for completion
    proc.stderr.close()

    if proc.returncode:
        raise IOError(err.decode("utf8"))

    del proc  # Explicit cleanup
```

**TypeScript Equivalent:**

```typescript
import { spawn, SpawnOptions } from 'child_process';

function crossPlatformSpawnOptions(options: SpawnOptions = {}): SpawnOptions {
  if (process.platform === 'win32') {
    return {
      ...options,
      windowsHide: true, // Node.js equivalent
    };
  }
  return options;
}
```

---

## Summary: Recommended Patterns for content-machine

### For API Calls (Pexels, Reddit, etc.)

Use **p-limit** pattern:

```typescript
import pLimit from 'p-limit';
const limit = pLimit(5); // 5 concurrent API calls

const results = await Promise.all(urls.map((url) => limit(() => fetch(url))));
```

### For Video Rendering (Remotion)

Use **concurrency config** passed to renderMedia:

```typescript
await renderMedia({
  composition,
  codec: 'h264',
  concurrency: config.concurrency ?? Math.min(8, os.cpus().length / 2),
});
```

### For Sequential Video Queue

Use **queue pattern** from short-video-maker-gyori:

```typescript
class VideoQueue {
  private queue: VideoJob[] = [];
  private processing = false;

  async add(job: VideoJob): Promise<string> {
    const id = generateId();
    this.queue.push({ ...job, id });
    if (!this.processing) this.process();
    return id;
  }

  private async process(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue[0];
      try {
        await this.processJob(job);
      } finally {
        this.queue.shift();
      }
    }
    this.processing = false;
  }
}
```

### For Child Processes (FFmpeg, Whisper)

Use **execa** for Promise-based execution with cancellation:

```typescript
import execa from 'execa';

const task = execa('ffmpeg', ['-i', input, output]);
cancelSignal?.(() => task.kill());
await task;
```

### For Browser Tab Pool

Use **Pool pattern** from Remotion when managing expensive resources.

---

## References

- [p-limit npm package](https://www.npmjs.com/package/p-limit)
- [execa npm package](https://www.npmjs.com/package/execa)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [Node.js Child Processes](https://nodejs.org/api/child_process.html)
