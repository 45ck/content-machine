# Resumable/Idempotent Pipeline Patterns Research

**Date:** 2026-01-04  
**Status:** Research Complete  
**Purpose:** Document patterns for implementing resumable, idempotent pipeline stages in content-machine

---

## Executive Summary

Research across vendored repos reveals several proven patterns for building resumable pipelines:

| Pattern | Best For | Complexity | Found In |
|---------|----------|------------|----------|
| **Content Hashing** | Asset deduplication | Low | MoneyPrinterTurbo |
| **File-Based Checkpointing** | Stage outputs | Low | MoneyPrinterTurbo |
| **State Machine** | Task tracking | Medium | MoneyPrinterTurbo |
| **Job Deduplication** | Preventing duplicates | Medium | BullMQ |
| **Activity Heartbeats** | Long-running tasks | Medium | Temporal |
| **Queue Processing** | Sequential stages | Low | short-video-maker-gyori |

---

## Pattern 1: Content Hashing for Deduplication

### MoneyPrinterTurbo - URL Hash-Based Caching

**File:** [vendor/MoneyPrinterTurbo/app/services/material.py](../../../vendor/MoneyPrinterTurbo/app/services/material.py#L147-L162)

```python
def save_video(video_url: str, save_dir: str = "") -> str:
    if not save_dir:
        save_dir = utils.storage_dir("cache_videos")

    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    url_without_query = video_url.split("?")[0]
    url_hash = utils.md5(url_without_query)  # <-- Content hash
    video_id = f"vid-{url_hash}"
    video_path = f"{save_dir}/{video_id}.mp4"

    # if video already exists, return the path
    if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
        logger.info(f"video already exists: {video_path}")
        return video_path  # <-- Skip download, return cached
    
    # ... download logic only runs if not cached
```

**File:** [vendor/MoneyPrinterTurbo/app/utils/utils.py](../../../vendor/MoneyPrinterTurbo/app/utils/utils.py#L201-L204)

```python
def md5(text):
    import hashlib
    return hashlib.md5(text.encode("utf-8")).hexdigest()
```

### Key Insight
- Use **content-addressable storage**: Hash the input (URL, text, config) to generate unique filename
- **Check existence before work**: `if os.path.exists(video_path) and os.path.getsize(video_path) > 0`
- **Size validation**: Empty files (failed downloads) are not considered valid

### TypeScript Implementation Pattern
```typescript
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

function contentHash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

async function getCachedOrCreate<T>(
  cacheDir: string,
  inputKey: string,
  creator: () => Promise<T>,
  serializer: (data: T) => string = JSON.stringify,
  deserializer: (raw: string) => T = JSON.parse
): Promise<T> {
  const hash = contentHash(inputKey);
  const cachePath = path.join(cacheDir, `${hash}.json`);
  
  if (await fs.pathExists(cachePath)) {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return deserializer(raw);
  }
  
  const result = await creator();
  await fs.outputFile(cachePath, serializer(result));
  return result;
}
```

---

## Pattern 2: File-Based Stage Checkpoints

### MoneyPrinterTurbo - Intermediate File Outputs

**File:** [vendor/MoneyPrinterTurbo/app/services/task.py](../../../vendor/MoneyPrinterTurbo/app/services/task.py#L60-L70)

```python
def save_script_data(task_id, video_script, video_terms, params):
    script_file = path.join(utils.task_dir(task_id), "script.json")
    script_data = {
        "script": video_script,
        "search_terms": video_terms,
        "params": params,
    }

    with open(script_file, "w", encoding="utf-8") as f:
        f.write(utils.to_json(script_data))
```

### Stage Output Files Structure
```
storage/tasks/{task_id}/
├── script.json      # Stage 1 output: script + terms
├── audio.mp3        # Stage 2 output: TTS audio  
├── subtitle.srt     # Stage 3 output: subtitles
├── combined-1.mp4   # Stage 4 output: combined video
└── final-1.mp4      # Stage 5 output: final render
```

### Key Insight
Each stage writes to a **known file path**. Resume logic can:
1. Check which files exist
2. Skip stages that have completed outputs
3. Resume from the last incomplete stage

### TypeScript Implementation Pattern
```typescript
interface PipelineStage<TInput, TOutput> {
  name: string;
  outputFile: (taskId: string) => string;
  execute: (input: TInput, taskId: string) => Promise<TOutput>;
  serialize: (output: TOutput) => string;
  deserialize: (raw: string) => TOutput;
}

async function runStage<TInput, TOutput>(
  stage: PipelineStage<TInput, TOutput>,
  input: TInput,
  taskId: string
): Promise<TOutput> {
  const outputPath = stage.outputFile(taskId);
  
  // Check for existing output
  if (await fs.pathExists(outputPath)) {
    const raw = await fs.readFile(outputPath, 'utf-8');
    console.log(`Stage ${stage.name}: Using cached output`);
    return stage.deserialize(raw);
  }
  
  // Execute stage
  console.log(`Stage ${stage.name}: Executing...`);
  const output = await stage.execute(input, taskId);
  
  // Persist output
  await fs.outputFile(outputPath, stage.serialize(output));
  return output;
}
```

---

## Pattern 3: State Machine with Progress Tracking

### MoneyPrinterTurbo - Task State Management

**File:** [vendor/MoneyPrinterTurbo/app/services/state.py](../../../vendor/MoneyPrinterTurbo/app/services/state.py#L1-L60)

```python
# State constants
TASK_STATE_FAILED = -1
TASK_STATE_COMPLETE = 1
TASK_STATE_PROCESSING = 4

class BaseState(ABC):
    @abstractmethod
    def update_task(self, task_id: str, state: int, progress: int = 0, **kwargs):
        pass

    @abstractmethod
    def get_task(self, task_id: str):
        pass

class MemoryState(BaseState):
    def __init__(self):
        self._tasks = {}

    def update_task(
        self,
        task_id: str,
        state: int = TASK_STATE_PROCESSING,
        progress: int = 0,
        **kwargs,
    ):
        progress = int(progress)
        if progress > 100:
            progress = 100

        self._tasks[task_id] = {
            "task_id": task_id,
            "state": state,
            "progress": progress,
            **kwargs,
        }
```

### Progress Updates During Pipeline

**File:** [vendor/MoneyPrinterTurbo/app/services/task.py](../../../vendor/MoneyPrinterTurbo/app/services/task.py#L230-L280)

```python
def start(task_id, params: VideoParams, stop_at: str = "video"):
    sm.state.update_task(task_id, state=const.TASK_STATE_PROCESSING, progress=5)
    
    # 1. Generate script
    video_script = generate_script(task_id, params)
    sm.state.update_task(task_id, state=const.TASK_STATE_PROCESSING, progress=10)
    
    if stop_at == "script":
        sm.state.update_task(task_id, state=const.TASK_STATE_COMPLETE, progress=100, 
                            script=video_script)
        return {"script": video_script}
    
    # ... more stages with progress updates
```

### Key Insight
- **State + Progress**: Track both completion state AND percentage
- **stop_at parameter**: Allows partial pipeline execution (useful for debugging)
- **Kwargs for metadata**: Store stage outputs in state for inspection

### TypeScript Implementation Pattern
```typescript
type TaskState = 'pending' | 'processing' | 'complete' | 'failed';

interface TaskProgress {
  taskId: string;
  state: TaskState;
  progress: number; // 0-100
  currentStage: string;
  outputs: Record<string, unknown>;
  error?: string;
}

class TaskStateManager {
  private tasks = new Map<string, TaskProgress>();
  
  update(taskId: string, updates: Partial<TaskProgress>): void {
    const existing = this.tasks.get(taskId) ?? {
      taskId,
      state: 'pending',
      progress: 0,
      currentStage: '',
      outputs: {},
    };
    this.tasks.set(taskId, { ...existing, ...updates });
  }
  
  get(taskId: string): TaskProgress | undefined {
    return this.tasks.get(taskId);
  }
}
```

---

## Pattern 4: Queue-Based Processing with Status

### short-video-maker-gyori - In-Memory Queue

**File:** [vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts](../../../vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts#L42-L80)

```typescript
export class ShortCreator {
  private queue: {
    sceneInput: SceneInput[];
    config: RenderConfig;
    id: string;
  }[] = [];

  public status(id: string): VideoStatus {
    const videoPath = this.getVideoPath(id);
    if (this.queue.find((item) => item.id === id)) {
      return "processing";
    }
    if (fs.existsSync(videoPath)) {
      return "ready";
    }
    return "failed";
  }

  public addToQueue(sceneInput: SceneInput[], config: RenderConfig): string {
    const id = cuid();
    this.queue.push({ sceneInput, config, id });
    if (this.queue.length === 1) {
      this.processQueue();
    }
    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    const { sceneInput, config, id } = this.queue[0];
    try {
      await this.createShort(id, sceneInput, config);
    } catch (error) {
      logger.error(error, "Error creating video");
    } finally {
      this.queue.shift();  // Remove completed item
      this.processQueue(); // Process next
    }
  }
}
```

### Key Insight
- **Status derived from state**: `processing` if in queue, `ready` if file exists, else `failed`
- **Sequential processing**: One item at a time, prevents resource conflicts
- **Cleanup temp files after success**: 
  ```typescript
  for (const file of tempFiles) {
    fs.removeSync(file);
  }
  ```

---

## Pattern 5: BullMQ Job Deduplication

### Built-in Deduplication Modes

**File:** [vendor/job-queue/bullmq/docs/gitbook/guide/jobs/deduplication.md](../../../vendor/job-queue/bullmq/docs/gitbook/guide/jobs/deduplication.md)

#### Simple Mode (Until Job Completes)
```typescript
// Job is deduplicated as long as it's not completed/failed
await myQueue.add(
  'render-video',
  { videoId: 'abc123' },
  { deduplication: { id: 'video-abc123' } }
);
```

#### Throttle Mode (TTL-Based)
```typescript
// Job is deduplicated for 5 seconds after creation
await myQueue.add(
  'render-video',
  { videoId: 'abc123' },
  { 
    deduplication: { 
      id: 'video-abc123', 
      ttl: 5000  // 5 seconds
    } 
  }
);
```

#### Debounce Mode (Replace Previous)
```typescript
// Latest job replaces previous, with delay reset
await myQueue.add(
  'render-video',
  { videoId: 'abc123', timestamp: Date.now() },
  {
    deduplication: {
      id: 'video-abc123',
      ttl: 5000,
      extend: true,
      replace: true,
    },
    delay: 5000,
  }
);
```

### Retry Configuration

**File:** [vendor/job-queue/bullmq/docs/gitbook/guide/retrying-failing-jobs.md](../../../vendor/job-queue/bullmq/docs/gitbook/guide/retrying-failing-jobs.md)

```typescript
await queue.add(
  'render-video',
  { videoId: 'abc123' },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,       // 1s, 2s, 4s
      jitter: 0.5,       // Add randomness
    },
  }
);
```

### Key Insight
- **Deduplication ID**: Should represent the unique work unit (e.g., `video-${videoId}`)
- **TTL for throttling**: Prevent duplicate submissions within time window
- **Exponential backoff with jitter**: Prevents thundering herd on retries

---

## Pattern 6: Temporal Activity Heartbeats

### Checkpoint Within Long-Running Activity

**File:** [vendor/orchestration/temporal/service/worker/migration/activities.go](../../../vendor/orchestration/temporal/service/worker/migration/activities.go#L556-L597)

```go
func (a *activities) GenerateReplicationTasks(ctx context.Context, request *generateReplicationTasksRequest) error {
    startIndex := 0
    
    // Resume from heartbeat checkpoint
    if activity.HasHeartbeatDetails(ctx) {
        if err := activity.GetHeartbeatDetails(ctx, &startIndex); err == nil {
            startIndex = startIndex + 1 // start from next one
        }
    }

    for i := startIndex; i < len(request.Executions); i++ {
        we := request.Executions[i]
        
        if err := a.generateWorkflowReplicationTask(ctx, rateLimiter, ...); err != nil {
            return err  // Activity will retry from last heartbeat
        }
        
        activity.RecordHeartbeat(ctx, i)  // <-- Checkpoint progress
    }

    return nil
}
```

### Key Insight
- **Heartbeat = Checkpoint**: Save progress index during long loops
- **Resume from checkpoint**: On retry, read last heartbeat to skip completed items
- **Automatic on worker death**: Temporal detects missing heartbeats and reschedules

### TypeScript Implementation Pattern (for long-running tasks)
```typescript
interface CheckpointData {
  lastProcessedIndex: number;
  intermediateResults: unknown[];
}

async function processWithCheckpoint<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  checkpointFile: string,
  checkpointInterval: number = 10
): Promise<void> {
  // Load checkpoint
  let checkpoint: CheckpointData = { lastProcessedIndex: -1, intermediateResults: [] };
  if (await fs.pathExists(checkpointFile)) {
    checkpoint = JSON.parse(await fs.readFile(checkpointFile, 'utf-8'));
  }
  
  // Resume from checkpoint
  for (let i = checkpoint.lastProcessedIndex + 1; i < items.length; i++) {
    await processor(items[i]);
    
    // Checkpoint every N items
    if (i % checkpointInterval === 0) {
      checkpoint.lastProcessedIndex = i;
      await fs.writeFile(checkpointFile, JSON.stringify(checkpoint));
    }
  }
  
  // Clean up checkpoint on completion
  await fs.remove(checkpointFile);
}
```

---

## Pattern 7: Atomic File Writes (Temp + Rename)

### Why Atomic Writes Matter
Direct writes can leave corrupted files if process crashes mid-write. The temp file + rename pattern ensures atomicity.

### Implementation Pattern
```typescript
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuid } from 'uuid';

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.tmp-${uuid()}`);
  
  try {
    await fs.outputFile(tempPath, content);
    await fs.rename(tempPath, filePath);  // Atomic on most filesystems
  } catch (error) {
    await fs.remove(tempPath).catch(() => {});  // Clean up on failure
    throw error;
  }
}

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
}
```

### For Binary Files (Video/Audio)
```typescript
async function downloadWithAtomicWrite(url: string, destPath: string): Promise<void> {
  const tempPath = `${destPath}.tmp`;
  
  try {
    await downloadToFile(url, tempPath);
    
    // Validate file before committing
    const stats = await fs.stat(tempPath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    await fs.rename(tempPath, destPath);
  } catch (error) {
    await fs.remove(tempPath).catch(() => {});
    throw error;
  }
}
```

---

## Pattern 8: Make-Style Dependency Tracking

### Concept
Like GNU Make, track **inputs → outputs** relationships and skip stages where outputs are newer than inputs.

### Implementation Pattern
```typescript
interface StageManifest {
  stage: string;
  inputHashes: Record<string, string>;  // input file → hash
  outputHashes: Record<string, string>; // output file → hash
  completedAt: string;
}

async function shouldRunStage(
  manifestPath: string,
  inputs: string[],
  outputs: string[]
): Promise<boolean> {
  // No manifest = never run
  if (!await fs.pathExists(manifestPath)) {
    return true;
  }
  
  const manifest: StageManifest = JSON.parse(
    await fs.readFile(manifestPath, 'utf-8')
  );
  
  // Check if all outputs exist
  for (const output of outputs) {
    if (!await fs.pathExists(output)) {
      return true;  // Missing output, must run
    }
  }
  
  // Check if any input changed
  for (const input of inputs) {
    const currentHash = await hashFile(input);
    if (manifest.inputHashes[input] !== currentHash) {
      return true;  // Input changed, must run
    }
  }
  
  return false;  // All outputs exist and inputs unchanged
}

async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

---

## Recommended Architecture for content-machine

### Pipeline Stage Definition
```typescript
interface PipelineStageConfig<TInput, TOutput> {
  name: string;
  
  // File paths for this stage
  outputPath: (taskId: string) => string;
  manifestPath: (taskId: string) => string;
  
  // Hash function for deduplication key
  inputHash: (input: TInput) => string;
  
  // Execution
  execute: (input: TInput, ctx: StageContext) => Promise<TOutput>;
  
  // Serialization
  serialize: (output: TOutput) => string;
  deserialize: (raw: string) => TOutput;
  
  // Optional: Retry config
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
}

interface StageContext {
  taskId: string;
  logger: Logger;
  updateProgress: (percent: number) => void;
  checkpoint: <T>(key: string, data: T) => Promise<void>;
  getCheckpoint: <T>(key: string) => Promise<T | undefined>;
}
```

### Pipeline Runner
```typescript
class ResumablePipeline {
  async run<T>(
    taskId: string,
    stages: PipelineStageConfig<any, any>[],
    initialInput: T
  ): Promise<void> {
    let currentInput = initialInput;
    
    for (const stage of stages) {
      const outputPath = stage.outputPath(taskId);
      const manifestPath = stage.manifestPath(taskId);
      const inputHash = stage.inputHash(currentInput);
      
      // Check if stage already completed with same input
      if (await this.isStageComplete(manifestPath, inputHash, outputPath)) {
        logger.info(`Stage ${stage.name}: Using cached output`);
        currentInput = stage.deserialize(
          await fs.readFile(outputPath, 'utf-8')
        );
        continue;
      }
      
      // Execute stage with retries
      const output = await this.executeWithRetry(stage, currentInput, taskId);
      
      // Atomic write output
      await this.atomicWrite(outputPath, stage.serialize(output));
      
      // Write manifest
      await this.writeManifest(manifestPath, {
        stage: stage.name,
        inputHash,
        completedAt: new Date().toISOString(),
      });
      
      currentInput = output;
    }
  }
}
```

---

## Summary: Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|---------------------|
| **Asset downloads** | Content hashing + existence check |
| **Multi-stage pipeline** | File-based checkpoints per stage |
| **Long-running single task** | Periodic heartbeats/checkpoints |
| **API endpoints** | Job deduplication (BullMQ) |
| **Distributed workers** | Temporal workflows |
| **File writes** | Atomic temp + rename |
| **Complex dependencies** | Make-style manifest tracking |

---

## Next Steps

1. **ADR-003**: Choose between BullMQ vs Temporal for job orchestration
2. **Implement**: Core `ResumablePipeline` class
3. **Test**: Simulate failures at each stage to verify resumability
4. **Document**: Stage manifest schema for content-machine

---

## References

- [MoneyPrinterTurbo task.py](../../../vendor/MoneyPrinterTurbo/app/services/task.py)
- [short-video-maker-gyori ShortCreator.ts](../../../vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts)
- [BullMQ Deduplication Guide](../../../vendor/job-queue/bullmq/docs/gitbook/guide/jobs/deduplication.md)
- [BullMQ Retry Guide](../../../vendor/job-queue/bullmq/docs/gitbook/guide/retrying-failing-jobs.md)
- [Temporal Activities (Go)](../../../vendor/orchestration/temporal/service/worker/migration/activities.go)
