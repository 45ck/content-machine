# RQ-19: GPU Detection for WhisperX and Remotion

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P1  
**Question:** How do we detect GPU availability for WhisperX and Remotion?

---

## 1. Problem Statement

WhisperX and Remotion can use GPU acceleration. We need to:

- Detect GPU availability from Node.js
- Choose the right device (CUDA/Metal/CPU)
- Fall back gracefully when GPU unavailable
- Report hardware capabilities to users

---

## 2. Vendor Evidence

### 2.1 Remotion GPU Detection

**Source:** [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer)

Remotion detects GPU capabilities by querying Chrome's GPU page:

```typescript
export const getChromiumGpuInformation = async ({ browserExecutable }) => {
  const { page, cleanup } = await getBrowserPage({ browserExecutable });

  // Navigate to chrome://gpu
  await page.goto({ url: 'chrome://gpu', timeout: 12000 });

  // Parse GPU feature status
  const value = await page.evaluate(() => {
    const statuses = [];
    const items = document
      .querySelector('info-view')
      ?.shadowRoot?.querySelector('ul')
      ?.querySelectorAll('li');

    items?.forEach((item) => {
      const feature = item.querySelector('span')?.textContent;
      const status = item.querySelector('span:nth-child(2)')?.textContent;
      statuses.push({ feature, status });
    });

    return statuses;
  });

  await cleanup();
  return value;
};
```

### 2.2 Remotion Hardware Encoder Selection

**Source:** [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer)

```typescript
export const getCodecName = ({ codec, hardwareAcceleration }) => {
  const preferHardware =
    hardwareAcceleration === 'required' || hardwareAcceleration === 'if-possible';

  if (codec === 'h264') {
    // macOS: VideoToolbox (Apple Silicon & Intel)
    if (preferHardware && process.platform === 'darwin') {
      return { encoderName: 'h264_videotoolbox', hardwareAccelerated: true };
    }

    // Linux/Windows with NVIDIA: NVENC
    // (Would need nvidia-smi check here)

    // Fallback: CPU
    return { encoderName: 'libx264', hardwareAccelerated: false };
  }
};
```

### 2.3 WhisperX Device Selection

**Source:** [vendor/captions/whisperX](../../../vendor/captions/whisperX)

```python
import torch

def load_model(
    whisper_arch: str,
    device: str,  # 'cuda', 'cpu', or 'mps'
    compute_type: str = "float16",
) -> FasterWhisperPipeline:
    # GPU: float16, CPU: int8 for speed
    if device == "cpu":
        compute_type = "int8"

    return WhisperModel(
        whisper_arch,
        device=device,
        compute_type=compute_type,
    )

# Automatic device selection
device = "cuda" if torch.cuda.is_available() else "cpu"
```

### 2.4 whisper.cpp System Info

**Source:** [vendor/captions/whisper.cpp](../../../vendor/captions/whisper.cpp)

whisper.cpp outputs build flags showing acceleration support:

```
AVX = 0 | AVX2 = 0 | NEON = 1 | METAL = 1 | CUDA = 0 | COREML = 0
```

---

## 3. Recommended Implementation

### 3.1 systeminformation Package (Node.js)

```typescript
import si from 'systeminformation';

interface GpuInfo {
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel' | 'unknown';
  model: string;
  vram: number; // MB
  capabilities: {
    cuda: boolean;
    rocm: boolean;
    metal: boolean;
    videoToolbox: boolean;
  };
}

async function detectGpu(): Promise<GpuInfo[]> {
  const graphics = await si.graphics();
  const platform = process.platform;

  return graphics.controllers.map((controller) => {
    const vendorLower = (controller.vendor ?? '').toLowerCase();

    let vendor: GpuInfo['vendor'] = 'unknown';
    if (vendorLower.includes('nvidia')) vendor = 'nvidia';
    else if (vendorLower.includes('amd') || vendorLower.includes('radeon')) vendor = 'amd';
    else if (vendorLower.includes('apple')) vendor = 'apple';
    else if (vendorLower.includes('intel')) vendor = 'intel';

    return {
      vendor,
      model: controller.model ?? 'Unknown',
      vram: controller.vram ?? 0,
      capabilities: {
        cuda: vendor === 'nvidia',
        rocm: vendor === 'amd' && platform === 'linux',
        metal: platform === 'darwin',
        videoToolbox: platform === 'darwin',
      },
    };
  });
}
```

### 3.2 nvidia-smi Direct Check

```typescript
import { execSync } from 'child_process';

interface NvidiaGpuInfo {
  available: boolean;
  name?: string;
  memory?: number; // MB
  driver?: string;
}

function checkNvidiaGpu(): NvidiaGpuInfo {
  try {
    const output = execSync(
      'nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader',
      { encoding: 'utf-8', timeout: 5000 }
    );

    const [name, memory, driver] = output.trim().split(', ');

    return {
      available: true,
      name,
      memory: parseInt(memory, 10),
      driver,
    };
  } catch {
    return { available: false };
  }
}
```

### 3.3 Device Selection for WhisperX

```typescript
type WhisperDevice = 'cuda' | 'mps' | 'cpu';

async function selectWhisperDevice(): Promise<WhisperDevice> {
  const gpus = await detectGpu();

  // Prefer NVIDIA CUDA
  if (gpus.some((g) => g.capabilities.cuda)) {
    // Verify CUDA is actually working
    const nvidia = checkNvidiaGpu();
    if (nvidia.available) {
      return 'cuda';
    }
  }

  // Apple Silicon Metal Performance Shaders
  if (gpus.some((g) => g.capabilities.metal && g.vendor === 'apple')) {
    return 'mps';
  }

  // Fallback to CPU
  return 'cpu';
}
```

### 3.4 Remotion Hardware Acceleration Selection

```typescript
type RemotionGL = 'angle' | 'swangle' | 'egl' | 'swiftshader';
type HardwareAcceleration = 'required' | 'if-possible' | 'disabled';

interface RemotionHardwareConfig {
  gl: RemotionGL;
  hardwareAcceleration: HardwareAcceleration;
  concurrency: number;
}

async function selectRemotionConfig(): Promise<RemotionHardwareConfig> {
  const gpus = await detectGpu();
  const hasDiscreteGpu = gpus.some((g) => g.vendor === 'nvidia' || g.vendor === 'amd');

  const platform = process.platform;

  if (platform === 'win32') {
    // Windows: angle with GPU, swangle without
    return {
      gl: hasDiscreteGpu ? 'angle' : 'swangle',
      hardwareAcceleration: hasDiscreteGpu ? 'if-possible' : 'disabled',
      concurrency: hasDiscreteGpu ? 4 : 2,
    };
  }

  if (platform === 'darwin') {
    // macOS: always has Metal, use angle
    return {
      gl: 'angle',
      hardwareAcceleration: 'if-possible',
      concurrency: 4,
    };
  }

  // Linux
  if (hasDiscreteGpu) {
    return {
      gl: 'egl',
      hardwareAcceleration: 'if-possible',
      concurrency: 4,
    };
  }

  return {
    gl: 'swiftshader',
    hardwareAcceleration: 'disabled',
    concurrency: 2,
  };
}
```

### 3.5 Compute Type Selection

```typescript
type ComputeType = 'float16' | 'int8' | 'float32';

function selectComputeType(device: WhisperDevice): ComputeType {
  switch (device) {
    case 'cuda':
      return 'float16'; // Fast on NVIDIA
    case 'mps':
      return 'float16'; // Supported on Apple Silicon
    case 'cpu':
      return 'int8'; // Fastest on CPU
    default:
      return 'int8';
  }
}
```

### 3.6 Hardware Capability Report

```typescript
async function getHardwareCapabilities(): Promise<{
  summary: string;
  whisperDevice: WhisperDevice;
  remotionConfig: RemotionHardwareConfig;
}> {
  const gpus = await detectGpu();
  const whisperDevice = await selectWhisperDevice();
  const remotionConfig = await selectRemotionConfig();

  // Build summary
  const lines: string[] = [];
  lines.push('Hardware Capabilities:');

  for (const gpu of gpus) {
    lines.push(`  GPU: ${gpu.model} (${gpu.vendor})`);
    lines.push(`    VRAM: ${gpu.vram}MB`);
    lines.push(`    CUDA: ${gpu.capabilities.cuda ? '✓' : '✗'}`);
    lines.push(`    Metal: ${gpu.capabilities.metal ? '✓' : '✗'}`);
  }

  if (gpus.length === 0) {
    lines.push('  No discrete GPU detected');
  }

  lines.push('');
  lines.push(`WhisperX Device: ${whisperDevice}`);
  lines.push(`Remotion GL: ${remotionConfig.gl}`);
  lines.push(`Concurrency: ${remotionConfig.concurrency}`);

  return {
    summary: lines.join('\n'),
    whisperDevice,
    remotionConfig,
  };
}
```

---

## 4. CLI Integration

```typescript
// cm info command
async function showSystemInfo(): Promise<void> {
  const hw = await getHardwareCapabilities();

  console.log(hw.summary);
  console.log('');
  console.log('Performance Expectations:');

  if (hw.whisperDevice === 'cuda') {
    console.log('  Audio processing: Fast (GPU accelerated)');
  } else if (hw.whisperDevice === 'mps') {
    console.log('  Audio processing: Fast (Apple Silicon)');
  } else {
    console.log('  Audio processing: Slow (CPU only)');
  }

  if (hw.remotionConfig.hardwareAcceleration !== 'disabled') {
    console.log('  Video rendering: Fast (GPU accelerated)');
  } else {
    console.log('  Video rendering: Slow (software rendering)');
  }
}
```

---

## 5. Graceful Degradation

```typescript
async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    console.warn(`${errorMessage}, falling back to CPU`);
    console.warn(`Original error: ${error}`);
    return await fallback();
  }
}

// Usage
const transcription = await executeWithFallback(
  () => transcribeWithCuda(audioPath),
  () => transcribeWithCpu(audioPath),
  'CUDA transcription failed'
);
```

---

## 6. Implementation Recommendations

| Decision            | Recommendation     | Rationale                      |
| ------------------- | ------------------ | ------------------------------ |
| Primary detection   | systeminformation  | Cross-platform, no native deps |
| NVIDIA verification | nvidia-smi         | Confirms CUDA works            |
| Apple Silicon       | Assume Metal works | All M-series support it        |
| Fallback            | Always available   | Never fail due to GPU issues   |
| Report to user      | `cm info` command  | Transparency                   |

---

## 7. References

- [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer) — GPU detection
- [vendor/captions/whisperX](../../../vendor/captions/whisperX) — CUDA device selection
- [vendor/captions/whisper.cpp](../../../vendor/captions/whisper.cpp) — Build flags
- [systeminformation](https://www.npmjs.com/package/systeminformation) — Node.js hardware detection
