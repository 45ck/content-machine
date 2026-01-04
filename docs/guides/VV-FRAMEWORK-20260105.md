# Validation & Verification Framework

**content-machine V&V Implementation Guide**

**Document ID:** VV-FRAMEWORK-20260105  
**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-01-05

---

## 1. Overview

This document defines the Validation & Verification (V&V) framework for content-machine. It provides actionable guidance for implementing quality assurance across all four pipeline stages.

### 1.1 V&V Philosophy

> **"If you can't measure it, you can't improve it."**

Every pipeline output must be:
1. **Validated** — Does it conform to the expected schema/format?
2. **Verified** — Does it meet quality standards?

### 1.2 Evaluation Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    V&V Framework Layers                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 4: Human Review                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Manual QA for random samples, edge cases              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 3: LLM-as-Judge                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Hook quality, TikTok voice, visual relevance          │ │
│  │ Uses: promptfoo, G-Eval, custom rubrics               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 2: Programmatic Quality Checks                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Word count, scene count, duration, audio metrics      │ │
│  │ Uses: Vitest assertions, FFmpeg analysis              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 1: Schema Validation                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Zod schemas, TypeScript types, JSON structure         │ │
│  │ Uses: Zod safeParse, compile-time checking            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stage-by-Stage V&V

### 2.1 cm script — Script Generation

**Input:** Topic string, archetype  
**Output:** `script.json`

#### Layer 1: Schema Validation

```typescript
// src/script/schema.ts
import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.number().int().positive(),
  narration: z.string().min(10).max(500),
  visualDirection: z.string().min(5).max(200),
  durationHint: z.enum(['short', 'medium', 'long']).optional()
});

export const ScriptOutputSchema = z.object({
  title: z.string().min(3).max(100),
  hook: z.string().min(5).max(50),
  scenes: z.array(SceneSchema).min(3).max(8),
  callToAction: z.string().optional(),
  metadata: z.object({
    archetype: z.string(),
    estimatedDuration: z.number().positive()
  })
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;
```

#### Layer 2: Programmatic Checks

```typescript
// src/script/validators.ts
export interface ScriptQualityChecks {
  sceneCount: { min: number; max: number; actual: number; pass: boolean };
  wordCount: { min: number; max: number; actual: number; pass: boolean };
  hasVisualDirections: { required: boolean; actual: boolean; pass: boolean };
}

export function validateScriptQuality(script: ScriptOutput): ScriptQualityChecks {
  const wordCount = script.scenes.reduce(
    (acc, s) => acc + s.narration.split(/\s+/).length, 0
  );
  
  return {
    sceneCount: {
      min: 3, max: 8,
      actual: script.scenes.length,
      pass: script.scenes.length >= 3 && script.scenes.length <= 8
    },
    wordCount: {
      min: 100, max: 250,
      actual: wordCount,
      pass: wordCount >= 100 && wordCount <= 250
    },
    hasVisualDirections: {
      required: true,
      actual: script.scenes.every(s => s.visualDirection.length > 0),
      pass: script.scenes.every(s => s.visualDirection.length > 0)
    }
  };
}
```

#### Layer 3: LLM-as-Judge

```yaml
# evals/configs/cm-script.yaml
description: Script generation quality evaluation

providers:
  - id: openai:gpt-4o
    config:
      temperature: 0.7

defaultTest:
  options:
    provider: openai:gpt-4o-mini  # Cheaper model for judging

tests:
  - vars:
      topic: "5 JavaScript tips every developer should know"
      archetype: "listicle"
    assert:
      # Schema checks (Layer 1)
      - type: javascript
        value: |
          try {
            const script = JSON.parse(output);
            return script.scenes && script.scenes.length >= 3;
          } catch { return false; }
      
      # Quality checks (Layer 2)  
      - type: javascript
        value: |
          const script = JSON.parse(output);
          const words = script.scenes.map(s => s.narration).join(' ').split(/\s+/).length;
          return words >= 100 && words <= 250;
      
      # LLM-graded checks (Layer 3)
      - type: llm-rubric
        value: |
          The script opens with an attention-grabbing hook that would stop 
          a TikTok user from scrolling. The first sentence should be surprising,
          controversial, or promise immediate value.
        threshold: 0.7
      
      - type: llm-rubric
        value: |
          The language is casual, conversational, and suitable for TikTok.
          No corporate jargon, no formal academic language.
          Should sound like a friend giving advice.
        threshold: 0.8
      
      - type: llm-rubric
        value: |
          Each scene has a specific, filmable visual description.
          Visual directions should describe what the viewer will SEE,
          not abstract concepts.
        threshold: 0.8
```

#### Evaluation Rubrics

```text
# evals/rubrics/hook-quality.txt

HOOK QUALITY RUBRIC

Evaluate the opening hook of a short-form video script.

CRITERIA:
1. Attention-grabbing (0-3 points)
   - 3: Immediately stops scrolling with surprise/controversy/intrigue
   - 2: Interesting but not immediately compelling
   - 1: Generic opening
   - 0: Boring, would scroll past

2. Relevance (0-2 points)
   - 2: Directly relates to the video's main content
   - 1: Loosely connected
   - 0: Misleading clickbait

3. Brevity (0-2 points)
   - 2: Under 10 words
   - 1: 10-15 words
   - 0: Over 15 words

SCORING:
- 6-7 points: EXCELLENT (score: 1.0)
- 4-5 points: GOOD (score: 0.8)
- 2-3 points: ACCEPTABLE (score: 0.6)
- 0-1 points: POOR (score: 0.3)

OUTPUT FORMAT:
{
  "score": <0.0-1.0>,
  "points": <0-7>,
  "breakdown": {
    "attention": <0-3>,
    "relevance": <0-2>,
    "brevity": <0-2>
  },
  "reason": "<brief explanation>"
}
```

---

### 2.2 cm audio — TTS & Timestamps

**Input:** `script.json`  
**Output:** `audio.wav`, `timestamps.json`

#### Layer 1: Schema Validation

```typescript
// src/audio/schema.ts
export const WordTimestampSchema = z.object({
  word: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  confidence: z.number().min(0).max(1).optional()
});

export const TimestampsOutputSchema = z.object({
  words: z.array(WordTimestampSchema),
  duration: z.number().positive(),
  sampleRate: z.number().int().positive()
});
```

#### Layer 2: Programmatic Checks

```typescript
// src/audio/validators.ts
export interface AudioQualityChecks {
  sampleRate: { expected: number; actual: number; pass: boolean };
  duration: { expected: number; actual: number; deviation: number; pass: boolean };
  wordCoverage: { expected: number; actual: number; pass: boolean };
  maxSilenceGap: { threshold: number; actual: number; pass: boolean };
  noOverlaps: { overlaps: number; pass: boolean };
}

export async function validateAudioQuality(
  audioPath: string,
  timestamps: TimestampsOutput,
  expectedWords: string[]
): Promise<AudioQualityChecks> {
  const audioInfo = await getAudioInfo(audioPath);
  
  // Check for overlapping timestamps
  const overlaps = timestamps.words.filter((w, i) => {
    if (i === 0) return false;
    return w.start < timestamps.words[i - 1].end;
  });
  
  // Calculate silence gaps
  const gaps = timestamps.words.slice(1).map((w, i) => 
    w.start - timestamps.words[i].end
  );
  const maxGap = Math.max(...gaps);
  
  return {
    sampleRate: {
      expected: 44100,
      actual: audioInfo.sampleRate,
      pass: audioInfo.sampleRate === 44100
    },
    duration: {
      expected: expectedDuration,
      actual: audioInfo.duration,
      deviation: Math.abs(audioInfo.duration - expectedDuration) / expectedDuration,
      pass: Math.abs(audioInfo.duration - expectedDuration) / expectedDuration < 0.05
    },
    wordCoverage: {
      expected: expectedWords.length,
      actual: timestamps.words.length,
      pass: timestamps.words.length === expectedWords.length
    },
    maxSilenceGap: {
      threshold: 500, // ms
      actual: maxGap * 1000,
      pass: maxGap * 1000 < 500
    },
    noOverlaps: {
      overlaps: overlaps.length,
      pass: overlaps.length === 0
    }
  };
}
```

#### Layer 3: ASR Verification

Re-transcribe the generated audio and compare:

```typescript
// src/audio/evaluators.ts
export async function verifyTranscription(
  audioPath: string,
  expectedText: string
): Promise<{ wer: number; pass: boolean }> {
  // Re-transcribe with Whisper
  const transcription = await whisper.transcribe(audioPath);
  
  // Calculate Word Error Rate
  const wer = calculateWER(expectedText, transcription.text);
  
  return {
    wer,
    pass: wer < 0.10  // Less than 10% error rate
  };
}

function calculateWER(reference: string, hypothesis: string): number {
  const refWords = reference.toLowerCase().split(/\s+/);
  const hypWords = hypothesis.toLowerCase().split(/\s+/);
  
  // Levenshtein distance at word level
  const distance = levenshteinDistance(refWords, hypWords);
  return distance / refWords.length;
}
```

---

### 2.3 cm visuals — Footage Matching

**Input:** `timestamps.json`, `script.json`  
**Output:** `visuals.json`

#### Layer 1: Schema Validation

```typescript
// src/visuals/schema.ts
export const FootageClipSchema = z.object({
  sceneId: z.number().int().positive(),
  source: z.enum(['pexels', 'pixabay', 'local']),
  url: z.string().url(),
  duration: z.number().positive(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  searchTerms: z.array(z.string()),
  metadata: z.object({
    orientation: z.enum(['portrait', 'landscape', 'square']),
    resolution: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
  })
});

export const VisualsOutputSchema = z.object({
  clips: z.array(FootageClipSchema),
  totalDuration: z.number().positive()
});
```

#### Layer 2: Programmatic Checks

```typescript
// src/visuals/validators.ts
export interface VisualsQualityChecks {
  allScenesHaveFootage: { missing: number[]; pass: boolean };
  correctOrientation: { incorrect: number[]; pass: boolean };
  durationCoverage: { required: number; actual: number; pass: boolean };
  noDuplicates: { duplicates: string[]; pass: boolean };
  allUrlsValid: { invalid: string[]; pass: boolean };
}

export async function validateVisualsQuality(
  visuals: VisualsOutput,
  audioDuration: number
): Promise<VisualsQualityChecks> {
  // Check for missing scenes
  const sceneIds = new Set(visuals.clips.map(c => c.sceneId));
  const missing = [1, 2, 3, 4, 5].filter(id => !sceneIds.has(id));
  
  // Check orientation
  const incorrect = visuals.clips.filter(
    c => c.metadata.orientation !== 'portrait'
  );
  
  // Check for duplicate URLs
  const urls = visuals.clips.map(c => c.url);
  const duplicates = urls.filter((url, i) => urls.indexOf(url) !== i);
  
  // Validate URLs are accessible
  const invalid: string[] = [];
  for (const clip of visuals.clips) {
    try {
      const res = await fetch(clip.url, { method: 'HEAD' });
      if (!res.ok) invalid.push(clip.url);
    } catch {
      invalid.push(clip.url);
    }
  }
  
  return {
    allScenesHaveFootage: { missing, pass: missing.length === 0 },
    correctOrientation: { 
      incorrect: incorrect.map(c => c.sceneId), 
      pass: incorrect.length === 0 
    },
    durationCoverage: {
      required: audioDuration,
      actual: visuals.totalDuration,
      pass: visuals.totalDuration >= audioDuration
    },
    noDuplicates: { duplicates, pass: duplicates.length === 0 },
    allUrlsValid: { invalid, pass: invalid.length === 0 }
  };
}
```

#### Layer 3: Visual-Text Relevance

```yaml
# evals/configs/cm-visuals.yaml
description: Visual matching relevance evaluation

defaultTest:
  options:
    provider: openai:gpt-4o-mini

tests:
  - vars:
      scene_narration: "Redis stores everything in memory, making it blazingly fast"
      search_terms: '["redis server", "computer memory", "fast technology"]'
      visual_description: "Database server room with blinking lights"
    assert:
      - type: llm-rubric
        value: |
          Evaluate if the search terms and visual description are relevant
          to the narration content.
          
          CRITERIA:
          1. Do search terms capture the key concepts? (Redis, memory, speed)
          2. Are search terms concrete and filmable?
          3. Does visual description match what would appear in footage?
          
          Score 0-1 where 1 is perfectly relevant.
        threshold: 0.7
      
      - type: model-graded-closedqa
        value: |
          The search terms do NOT include abstract concepts that cannot
          be filmed (like "efficiency" or "performance").
```

---

### 2.4 cm render — Video Output

**Input:** All artifacts  
**Output:** `video.mp4`

See [RQ-10: Video Output Testing](./investigations/RQ-10-VIDEO-OUTPUT-TESTING-20260104.md) and [RQ-13: Video Quality Metrics](./investigations/RQ-13-VIDEO-QUALITY-METRICS-20260104.md) for comprehensive video testing.

#### Quick Reference

```typescript
// src/render/validators.ts
export interface RenderQualityChecks {
  resolution: { expected: string; actual: string; pass: boolean };
  frameRate: { expected: number; actual: number; pass: boolean };
  duration: { expected: number; actual: number; deviation: number; pass: boolean };
  psnr: { threshold: number; actual: number; pass: boolean };
  ssim: { threshold: number; actual: number; pass: boolean };
  hasAudio: boolean;
  captionSync: { maxDrift: number; pass: boolean };
}

export async function validateRenderQuality(
  videoPath: string,
  expectedDuration: number,
  baselinePath?: string
): Promise<RenderQualityChecks> {
  const info = await getVideoInfo(videoPath);
  
  let psnr = 0, ssim = 0;
  if (baselinePath) {
    ({ psnr, ssim } = await compareVideos(videoPath, baselinePath));
  }
  
  return {
    resolution: {
      expected: '1080x1920',
      actual: `${info.width}x${info.height}`,
      pass: info.width === 1080 && info.height === 1920
    },
    frameRate: {
      expected: 30,
      actual: info.fps,
      pass: Math.abs(info.fps - 30) < 0.1
    },
    duration: {
      expected: expectedDuration,
      actual: info.duration,
      deviation: Math.abs(info.duration - expectedDuration) / expectedDuration,
      pass: Math.abs(info.duration - expectedDuration) / expectedDuration < 0.02
    },
    psnr: { threshold: 35, actual: psnr, pass: psnr >= 35 },
    ssim: { threshold: 0.95, actual: ssim, pass: ssim >= 0.95 },
    hasAudio: info.hasAudio,
    captionSync: { maxDrift: 50, pass: true } // Implement caption sync check
  };
}
```

---

## 3. CI/CD Integration

### 3.1 Test Matrix

```yaml
# .github/workflows/quality.yml
name: Quality Gates

on:
  pull_request:
    paths:
      - 'src/**'
      - 'evals/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  schema-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:schemas

  llm-evals:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'run-evals')
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run Script Evals
        run: npx promptfoo eval -c evals/configs/cm-script.yaml --no-cache -o results.json
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Check Pass Rate
        run: |
          PASS=$(jq '.results.stats.successes' results.json)
          TOTAL=$(jq '.results.stats.total' results.json)
          RATE=$(echo "scale=2; $PASS / $TOTAL" | bc)
          echo "Pass rate: $RATE"
          if (( $(echo "$RATE < 0.80" | bc -l) )); then
            echo "::error::Pass rate below 80% threshold"
            exit 1
          fi

  video-quality:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'run-video-tests')
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: sudo apt-get install -y ffmpeg
      - run: npm run test:render
```

### 3.2 Quality Gates

| Gate | Trigger | Threshold | Blocks Merge |
|------|---------|-----------|--------------|
| Unit Tests | All PRs | 100% pass | Yes |
| Schema Validation | All PRs | 100% pass | Yes |
| LLM Evals | `run-evals` label | ≥80% pass | Yes |
| Video Tests | `run-video-tests` label | ≥95% pass | Yes |
| Manual Review | Release PRs | Approval | Yes |

---

## 4. Observability

### 4.1 Langfuse Integration

```typescript
// src/core/observability.ts
import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: 'https://cloud.langfuse.com'
});

export async function traceGeneration<T>(
  name: string,
  fn: () => Promise<T>,
  metadata: Record<string, unknown>
): Promise<T> {
  const trace = langfuse.trace({
    name,
    metadata,
    tags: ['content-machine']
  });
  
  try {
    const result = await fn();
    trace.update({ output: result });
    return result;
  } catch (error) {
    trace.update({ 
      output: { error: String(error) },
      level: 'ERROR'
    });
    throw error;
  } finally {
    await langfuse.flushAsync();
  }
}

export function scoreOutput(
  traceId: string,
  name: string,
  value: number,
  comment?: string
) {
  langfuse.score({
    traceId,
    name,
    value,
    comment
  });
}
```

### 4.2 Dashboard Metrics

Track in Langfuse/Grafana:

| Metric | Description | Alert |
|--------|-------------|-------|
| `script.hook_score` | Average hook quality | <0.75 |
| `script.archetype_adherence` | Archetype conformance | <0.80 |
| `visuals.relevance_score` | Visual-text match | <0.70 |
| `audio.wer` | Word error rate | >0.10 |
| `render.psnr` | Video quality | <30 dB |
| `pipeline.success_rate` | E2E completion | <90% |
| `pipeline.cost_per_video` | Total API cost | >$1.00 |

---

## 5. Running Evaluations

### 5.1 Local Development

```bash
# Run all unit tests
npm test

# Run schema validation tests
npm run test:schemas

# Run promptfoo evals (requires API keys)
npx promptfoo eval -c evals/configs/cm-script.yaml --env-file .env

# View results in browser
npx promptfoo view

# Run specific test file
npm test -- src/script/validators.test.ts
```

### 5.2 Pre-Commit Checks

```bash
# Run before committing prompt changes
npm run eval:script

# Compare against baseline
npx promptfoo eval -c evals/configs/cm-script.yaml --compare evals/results/baseline.json
```

### 5.3 Regression Testing

```bash
# Generate new baseline after prompt improvements
npx promptfoo eval -c evals/configs/cm-script.yaml -o evals/results/baseline.json

# Run regression check
npm run test:regression
```

---

## 6. Document References

| Document | Purpose |
|----------|---------|
| [RQ-24: LLM Evaluation](./investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md) | Research on LLM-as-judge patterns |
| [RQ-10: Video Testing](./investigations/RQ-10-VIDEO-OUTPUT-TESTING-20260104.md) | Video quality testing strategies |
| [RQ-13: Video Metrics](./investigations/RQ-13-VIDEO-QUALITY-METRICS-20260104.md) | PSNR/SSIM/VMAF thresholds |
| [SECTION-SCHEMAS-VALIDATION](./sections/SECTION-SCHEMAS-VALIDATION-20260104.md) | Zod schema patterns |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-05  
**Owner:** QA Team
