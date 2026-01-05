# RQ-16: Python Subprocess Management from TypeScript CLI

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we manage Python dependencies from a TypeScript CLI?

---

## 1. Problem Statement

Edge TTS, WhisperX, and potentially other tools are Python packages. The TypeScript CLI needs to call Python processes reliably across platforms.

---

## 2. Vendor Evidence

### 2.1 Recommended Approach: Avoid Python Entirely

**Key Finding:** short-video-maker-gyori avoids Python entirely by using native alternatives.

| Capability | Python Approach   | Native Approach                                |
| ---------- | ----------------- | ---------------------------------------------- |
| TTS        | edge-tts (Python) | **kokoro-js** (TypeScript)                     |
| ASR        | whisperx (Python) | **@remotion/install-whisper-cpp** (C++ binary) |
| FFmpeg     | ffmpeg-python     | **fluent-ffmpeg** (Node.js wrapper)            |

**Source:** [vendor/short-video-maker-gyori](../../../vendor/short-video-maker-gyori)

### 2.2 When Python is Required: Subprocess Patterns

**Pattern A: Node.js child_process spawn (Remotion)**

**Source:** [vendor/remotion/packages/install-whisper-cpp](../../../vendor/remotion/packages/install-whisper-cpp)

```typescript
import { spawn, type StdioOptions } from 'child_process';

const execute = ({
  bin,
  args,
  cwd,
  signal,
  printOutput,
}: {
  bin: string;
  args: string[];
  cwd: string | null;
  signal: AbortSignal | null;
  printOutput: boolean;
}) => {
  const stdio: StdioOptions = printOutput ? 'inherit' : 'pipe';

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio,
      signal: signal ?? undefined,
      cwd: cwd ?? undefined,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data;
    });
    child.stderr?.on('data', (data) => {
      stderr += data;
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${bin} exited with code ${code}: ${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
};
```

### 2.3 Cross-Platform Python Detection

```typescript
async function findPythonExecutable(): Promise<string> {
  const candidates =
    process.platform === 'win32' ? ['python', 'python3', 'py -3', 'py'] : ['python3', 'python'];

  for (const candidate of candidates) {
    try {
      const { stdout } = await execute({
        bin: candidate.split(' ')[0],
        args: [...candidate.split(' ').slice(1), '--version'],
        cwd: null,
        signal: null,
        printOutput: false,
      });

      // Check version is 3.x
      if (stdout.includes('Python 3')) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  throw new Error('Python 3 not found. Please install Python 3.9+');
}
```

### 2.4 Windows-Specific Considerations

**Source:** [vendor/mcp/create-mcp](../../../vendor/mcp/create-mcp)

```typescript
function getPackageManagerCommand(packageManager: string): string {
  if (process.platform === 'win32') {
    return `${packageManager}.cmd`; // Windows requires .cmd extension
  }
  return packageManager;
}

// For Python on Windows
function getPythonCommand(): string {
  return process.platform === 'win32' ? 'python' : 'python3';
}
```

### 2.5 MoviePy Windows Console Suppression

**Source:** [vendor/video-processing/moviepy](../../../vendor/video-processing/moviepy)

```python
import subprocess as sp

def cross_platform_popen_params(popen_params):
    if os.name == "nt":  # Windows
        # Prevent console window popup
        popen_params["creationflags"] = 0x08000000
    return popen_params
```

**TypeScript equivalent:**

```typescript
import { spawn, SpawnOptions } from 'child_process';

function getSpawnOptions(): SpawnOptions {
  const options: SpawnOptions = {
    stdio: 'pipe',
  };

  if (process.platform === 'win32') {
    options.windowsHide = true;
  }

  return options;
}
```

---

## 3. Recommended Architecture

### 3.1 Primary: Use Native TypeScript Alternatives

```typescript
// Preferred: No Python required
import { KokoroTTS } from 'kokoro-js';
import { transcribe } from '@remotion/install-whisper-cpp';
import ffmpeg from 'fluent-ffmpeg';

// TTS: kokoro-js (TypeScript native)
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX');
const audio = await tts.generate(text, { voice: 'af_heart' });

// ASR: whisper.cpp via Remotion (C++ binary)
const result = await transcribe({
  inputPath: audioPath,
  model: 'medium.en',
  tokenLevelTimestamps: true,
});

// FFmpeg: fluent-ffmpeg (Node.js wrapper)
await new Promise((resolve, reject) => {
  ffmpeg(inputPath).output(outputPath).on('end', resolve).on('error', reject).run();
});
```

### 3.2 Fallback: Python Subprocess Wrapper

When Python is unavoidable (e.g., Edge TTS for multilingual support):

```typescript
// src/python/runner.ts
import { spawn } from 'child_process';
import { once } from 'events';

interface PythonResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class PythonRunner {
  private pythonPath: string | null = null;

  async init(): Promise<void> {
    this.pythonPath = await this.findPython();
    await this.ensureDependencies();
  }

  private async findPython(): Promise<string> {
    // ... detection logic from §2.3
  }

  private async ensureDependencies(): Promise<void> {
    // Check if edge-tts is installed
    const result = await this.run<{ installed: boolean }>('import edge_tts; print("ok")', {});

    if (!result.success) {
      throw new Error('Python dependencies not installed. Run: pip install edge-tts');
    }
  }

  async run<T>(script: string, args: Record<string, unknown>): Promise<PythonResult<T>> {
    const fullScript = `
import json
import sys
args = json.loads(sys.argv[1])
${script}
`;

    const child = spawn(this.pythonPath!, ['-c', fullScript, JSON.stringify(args)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });

    const [code] = await once(child, 'exit');

    if (code !== 0) {
      return { success: false, error: stderr };
    }

    try {
      return { success: true, data: JSON.parse(stdout) };
    } catch {
      return { success: true, data: stdout as unknown as T };
    }
  }
}
```

### 3.3 Edge TTS Wrapper Script

```python
#!/usr/bin/env python3
# scripts/edge_tts_wrapper.py

import asyncio
import json
import sys
import edge_tts

async def generate(text: str, voice: str, output: str) -> dict:
    communicate = edge_tts.Communicate(text, voice)
    sub_maker = edge_tts.SubMaker()

    audio_data = bytearray()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            sub_maker.feed(chunk)

    with open(output, "wb") as f:
        f.write(audio_data)

    return {
        "audioPath": output,
        "words": [
            {
                "word": cue.content,
                "startMs": cue.start.total_seconds() * 1000,
                "endMs": cue.end.total_seconds() * 1000,
            }
            for cue in sub_maker.cues
        ],
    }

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    result = asyncio.run(generate(**args))
    print(json.dumps(result))
```

---

## 4. Dependency Installation Strategy

### 4.1 User Responsibility (Recommended for MVP)

Document Python requirements clearly:

````markdown
## Prerequisites

- Node.js 18+
- Python 3.9+ (only if using Edge TTS for multilingual support)

### Optional: Edge TTS (for non-English languages)

If Kokoro doesn't support your language, install Edge TTS:

```bash
pip install edge-tts
```
````

```

### 4.2 Future: Bundled Python (Post-MVP)

For end-user distribution, consider:
- **pyinstaller** to create standalone Python executables
- **pex** to create self-contained Python archives
- Docker images with pre-installed dependencies

---

## 5. Implementation Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Primary TTS | kokoro-js | Native TypeScript, no Python |
| Primary ASR | whisper.cpp via Remotion | C++ binary, no Python |
| Fallback TTS | Edge TTS via subprocess | 30+ languages, free |
| Python detection | Try python3 → python → py | Cross-platform |
| Dependency check | On first use | Don't slow down startup |

---

## 6. References

- [vendor/remotion/packages/install-whisper-cpp](../../../vendor/remotion/packages/install-whisper-cpp) — Binary installation pattern
- [vendor/short-video-maker-gyori](../../../vendor/short-video-maker-gyori) — Native alternatives
- [vendor/mcp/create-mcp](../../../vendor/mcp/create-mcp) — Cross-platform command execution
- [vendor/video-processing/moviepy](../../../vendor/video-processing/moviepy) — Windows subprocess handling
```
