# RQ-01: Resumable/Idempotent Pipeline Stages

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we implement resumable/idempotent pipeline stages?

---

## 1. Problem Statement

The content-machine pipeline has no mechanism to resume from failure. If `cm visuals` crashes after downloading 8 of 10 clips, the entire stage must restart. Video rendering takes 3+ minutes—crashes waste significant time and resources.

**Requirements:**
- Resume from last successful operation after crash
- Skip completed work on re-run (idempotency)
- Atomic writes to prevent corrupted state
- Change detection to avoid unnecessary work

---

## 2. Vendor Evidence

### 2.1 Content-Addressable Caching (MoneyPrinterTurbo)

**Source:** [vendor/MoneyPrinterTurbo/app/services/video.py](../../../vendor/MoneyPrinterTurbo/app/services/video.py)

MoneyPrinterTurbo uses MD5 hashing of URLs to create unique, deterministic filenames:

```python
url_hash = utils.md5(url_without_query)
video_path = f"{save_dir}/vid-{url_hash}.mp4"

# Skip if already downloaded and has content
if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
    return video_path  # Resume: skip download
```

**Key Pattern:** Content-addressable storage—the same URL always produces the same filename, making operations naturally idempotent.

### 2.2 File-Based Stage Checkpoints (MoneyPrinterTurbo)

**Source:** [vendor/MoneyPrinterTurbo/app/services/state.py](../../../vendor/MoneyPrinterTurbo/app/services/state.py)

Each stage writes to known paths. Resume logic checks which files exist:

```python
# Stage outputs
STAGE_OUTPUTS = {
    "script": "script.json",
    "audio": "audio.mp3",
    "visuals": "visuals.json",
    "render": "output.mp4"
}

def is_stage_complete(project_dir: str, stage: str) -> bool:
    output_path = os.path.join(project_dir, STAGE_OUTPUTS[stage])
    return os.path.exists(output_path) and os.path.getsize(output_path) > 0
```

### 2.3 State Machine with Progress Tracking

**Source:** [vendor/MoneyPrinterTurbo/app/services/state.py](../../../vendor/MoneyPrinterTurbo/app/services/state.py)

```python
class TaskState:
    state: Literal["PROCESSING", "COMPLETE", "FAILED"]
    progress: int  # 0-100
    current_stage: str
    error_message: Optional[str]
```

Both in-memory and Redis implementations available—Redis enables resume across process restarts.

### 2.4 BullMQ Job Deduplication

**Source:** [vendor/job-queue/bullmq/docs/guide/jobs/deduplication.md](../../../vendor/job-queue/bullmq/docs/guide/jobs/deduplication.md)

BullMQ provides three deduplication modes:

```typescript
// Mode 1: Simple - dedupe until job completes/fails
await queue.add('render', data, {
  deduplication: { id: `video-${projectId}` }
});

// Mode 2: Throttle - TTL-based window
await queue.add('render', data, {
  deduplication: { id: `video-${projectId}`, ttl: 5000 }
});

// Mode 3: Debounce - replace previous, extend TTL
await queue.add('render', data, {
  deduplication: { id: `video-${projectId}`, ttl: 5000, debounce: true }
});
```

### 2.5 Temporal Heartbeat Checkpointing

**Source:** [vendor/orchestration/temporal](../../../vendor/orchestration/temporal) (Go patterns)

Temporal activities record heartbeats with progress indices:

```go
func ProcessItems(ctx context.Context, items []Item) error {
    startIndex := 0
    
    // Resume from last checkpoint
    if activity.HasHeartbeatDetails(ctx) {
        activity.GetHeartbeatDetails(ctx, &startIndex)
        startIndex++  // Resume from next item
    }
    
    for i := startIndex; i < len(items); i++ {
        process(items[i])
        activity.RecordHeartbeat(ctx, i)  // Checkpoint progress
    }
    return nil
}
```

---

## 3. Recommended Patterns for content-machine

### 3.1 Content-Addressable Asset Storage

```typescript
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

function getAssetPath(url: string, assetsDir: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return path.join(assetsDir, `asset-${hash}.mp4`);
}

async function downloadIfMissing(url: string, assetsDir: string): Promise<string> {
  const assetPath = getAssetPath(url, assetsDir);
  
  try {
    const stat = await fs.stat(assetPath);
    if (stat.size > 0) {
      return assetPath;  // Already downloaded
    }
  } catch {
    // File doesn't exist, proceed with download
  }
  
  await downloadToPath(url, assetPath);
  return assetPath;
}
```

### 3.2 Atomic File Writes

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const tempPath = path.join(os.tmpdir(), `cm-${Date.now()}-${Math.random().toString(36)}`);
  
  try {
    // Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    
    // Atomic rename (same filesystem)
    await fs.rename(tempPath, filePath);
  } finally {
    // Cleanup temp file if rename failed
    try { await fs.unlink(tempPath); } catch {}
  }
}
```

### 3.3 Stage Checkpoint System

```typescript
interface StageCheckpoint {
  stage: string;
  completedAt: string;
  inputHash: string;  // Hash of input file content
  outputFiles: string[];
}

async function isStageComplete(
  projectDir: string,
  stage: string,
  inputPath: string
): Promise<boolean> {
  const checkpointPath = path.join(projectDir, '.cm-checkpoints', `${stage}.json`);
  
  try {
    const checkpoint: StageCheckpoint = JSON.parse(
      await fs.readFile(checkpointPath, 'utf-8')
    );
    
    // Verify input hasn't changed
    const currentInputHash = await hashFile(inputPath);
    if (checkpoint.inputHash !== currentInputHash) {
      return false;  // Input changed, must re-run
    }
    
    // Verify all outputs exist
    for (const output of checkpoint.outputFiles) {
      try {
        await fs.access(output);
      } catch {
        return false;  // Output missing, must re-run
      }
    }
    
    return true;
  } catch {
    return false;  // No checkpoint, must run
  }
}
```

### 3.4 Progress Tracking for Long Operations

```typescript
interface ProgressState {
  stage: string;
  total: number;
  completed: number;
  lastCompletedItem: string;
  updatedAt: string;
}

class ProgressTracker {
  private statePath: string;
  private state: ProgressState;
  
  constructor(projectDir: string, stage: string) {
    this.statePath = path.join(projectDir, '.cm-progress', `${stage}.json`);
  }
  
  async resume(): Promise<number> {
    try {
      this.state = JSON.parse(await fs.readFile(this.statePath, 'utf-8'));
      return this.state.completed;  // Resume from here
    } catch {
      return 0;  // Start from beginning
    }
  }
  
  async checkpoint(completed: number, lastItem: string): Promise<void> {
    this.state = {
      ...this.state,
      completed,
      lastCompletedItem: lastItem,
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(this.statePath, this.state);
  }
}
```

---

## 4. Implementation Recommendations

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| Atomic file writes | P0 | Prevents corrupted JSON on crash |
| Content-addressable assets | P0 | Natural idempotency for downloads |
| Stage checkpoints | P0 | Skip completed stages on re-run |
| Input hash validation | P1 | Detect when re-run is needed |
| Progress tracking | P1 | Resume mid-stage after crash |
| BullMQ deduplication | P2 | Only needed for batch processing |

---

## 5. CLI Integration

```bash
# Normal run (with automatic resume)
cm visuals script.json

# Force re-run (ignore checkpoints)
cm visuals script.json --force

# Show what would be done (dry run)
cm visuals script.json --dry-run
```

---

## 6. References

- [vendor/MoneyPrinterTurbo/app/services/video.py](../../../vendor/MoneyPrinterTurbo/app/services/video.py) — Content hashing
- [vendor/MoneyPrinterTurbo/app/services/state.py](../../../vendor/MoneyPrinterTurbo/app/services/state.py) — Stage checkpoints
- [vendor/job-queue/bullmq](../../../vendor/job-queue/bullmq) — Job deduplication
- [vendor/orchestration/temporal](../../../vendor/orchestration/temporal) — Heartbeat checkpointing
- [SECTION-CONFIG-SYSTEMS-20260104.md](../sections/SECTION-CONFIG-SYSTEMS-20260104.md) — File handling patterns
