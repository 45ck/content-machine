# RQ-34: Drift Detection and Micro-Retiming Strategies

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P2  
**Related:** RQ-09, RQ-28, RQ-30

---

## 1. Problem Statement

Even with accurate timestamps, synchronization drift can occur due to:

- Frame rounding errors accumulating over time
- Audio encoding/decoding latency
- Video transcoding timing shifts
- Mismatched sample rates between components

This investigation documents drift detection methods and micro-retiming strategies for sub-100ms sync accuracy.

---

## 2. Types of Synchronization Drift

### 2.1 Linear Drift

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LINEAR DRIFT                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Expected:  ─────────────────────────────────────────────────▶ Time         │
│                                                                             │
│  Actual:    ─────────────────────────────────────────────────────▶          │
│                                                                             │
│  Drift grows proportionally: at 30s, drift = 30 × rate                      │
│  Common cause: Sample rate mismatch (e.g., 44.1kHz vs 48kHz)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stepped Drift

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STEPPED DRIFT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Expected:  ─────────────────────────────────────────────────▶ Time         │
│                                                                             │
│  Actual:    ──────────┐                                                     │
│                       └──────────┐                                          │
│                                  └──────────▶                               │
│                                                                             │
│  Sudden jumps at specific points (scene boundaries, audio chunks)           │
│  Common cause: Inconsistent silence trimming, chunk concatenation           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Random Drift

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RANDOM DRIFT                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Expected:  ─────────────────────────────────────────────────▶ Time         │
│                                                                             │
│  Actual:    ───╱──╲───────╱╲───────╲╱─────────╱───▶                         │
│                                                                             │
│  Unpredictable timing variations                                            │
│  Common cause: Variable TTS prosody, ASR alignment uncertainty              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Drift Detection Methods

### 3.1 Audio-Visual Correlation Analysis

**Principle:** Compare audio peaks with visual change points.

```typescript
// src/sync/drift-detection.ts

interface DriftAnalysisResult {
  avgDriftMs: number;
  maxDriftMs: number;
  driftType: 'linear' | 'stepped' | 'random' | 'none';
  corrections: DriftCorrection[];
}

interface DriftCorrection {
  timeMs: number;
  correctionMs: number;
  confidence: number;
}

/**
 * Analyze drift between audio waveform and caption timing.
 */
async function analyzeAudioCaptionDrift(
  audioPath: string,
  captions: WordTiming[]
): Promise<DriftAnalysisResult> {
  // Extract audio energy peaks (word onsets)
  const audioPeaks = await extractAudioOnsets(audioPath);

  // Compare with caption start times
  const drifts: number[] = [];

  for (const caption of captions) {
    // Find nearest audio peak to caption start
    const nearestPeak = findNearestPeak(audioPeaks, caption.start * 1000);

    if (nearestPeak && nearestPeak.distance < 500) {
      // Within 500ms
      drifts.push(caption.start * 1000 - nearestPeak.timeMs);
    }
  }

  // Analyze drift pattern
  const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
  const maxDrift = Math.max(...drifts.map(Math.abs));
  const driftType = classifyDriftPattern(drifts);

  return {
    avgDriftMs: avgDrift,
    maxDriftMs: maxDrift,
    driftType,
    corrections: calculateCorrections(drifts, captions),
  };
}

/**
 * Extract audio onset times using energy analysis.
 */
async function extractAudioOnsets(audioPath: string): Promise<AudioPeak[]> {
  // Use FFmpeg's silencedetect or librosa-style onset detection
  const { stdout } = await exec(`
    ffmpeg -i "${audioPath}" \
      -af "silencedetect=noise=-30dB:d=0.1" \
      -f null - 2>&1
  `);

  // Parse silence_end timestamps (start of speech)
  const peaks: AudioPeak[] = [];
  const matches = stdout.matchAll(/silence_end:\s*([\d.]+)/g);

  for (const match of matches) {
    peaks.push({
      timeMs: parseFloat(match[1]) * 1000,
      type: 'speech_start',
    });
  }

  return peaks;
}
```

### 3.2 Cross-Correlation Method

**Principle:** Mathematically correlate ASR-derived timing with TTS output.

```python
# scripts/drift_analysis.py
import numpy as np
from scipy.signal import correlate

def detect_drift_cross_correlation(
    tts_timestamps: list,
    asr_timestamps: list,
    audio_duration: float
) -> dict:
    """
    Use cross-correlation to find optimal alignment.
    """
    # Create time series (1 = word onset, 0 = silence)
    resolution_ms = 10  # 10ms bins
    num_bins = int(audio_duration * 1000 / resolution_ms)

    tts_signal = np.zeros(num_bins)
    asr_signal = np.zeros(num_bins)

    for ts in tts_timestamps:
        bin_idx = int(ts * 1000 / resolution_ms)
        if 0 <= bin_idx < num_bins:
            tts_signal[bin_idx] = 1

    for ts in asr_timestamps:
        bin_idx = int(ts * 1000 / resolution_ms)
        if 0 <= bin_idx < num_bins:
            asr_signal[bin_idx] = 1

    # Cross-correlate
    correlation = correlate(asr_signal, tts_signal, mode='full')
    lag = np.argmax(correlation) - len(tts_signal) + 1

    optimal_shift_ms = lag * resolution_ms
    correlation_score = np.max(correlation) / np.sum(tts_signal)

    return {
        'optimal_shift_ms': optimal_shift_ms,
        'correlation_score': correlation_score,
        'confidence': 'high' if correlation_score > 0.8 else 'low'
    }
```

### 3.3 Statistical Drift Analysis

```typescript
/**
 * Classify drift pattern from array of drift values.
 */
function classifyDriftPattern(drifts: number[]): 'linear' | 'stepped' | 'random' | 'none' {
  if (drifts.length < 5) return 'none';

  const mean = drifts.reduce((a, b) => a + b, 0) / drifts.length;
  const variance = drifts.reduce((a, b) => a + (b - mean) ** 2, 0) / drifts.length;
  const stdDev = Math.sqrt(variance);

  // Check for linear trend
  const linearFit = calculateLinearRegression(drifts);
  if (linearFit.rSquared > 0.85 && Math.abs(linearFit.slope) > 0.5) {
    return 'linear';
  }

  // Check for stepped pattern (high variance, clustered values)
  const uniqueRounded = new Set(drifts.map((d) => Math.round(d / 50) * 50));
  if (uniqueRounded.size <= 3 && stdDev > 30) {
    return 'stepped';
  }

  // Check for random (high variance, no pattern)
  if (stdDev > 50) {
    return 'random';
  }

  return 'none';
}

function calculateLinearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  const x = values.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = values.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssResidual = values.reduce((a, y, i) => {
    const predicted = slope * i + intercept;
    return a + (y - predicted) ** 2;
  }, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
}
```

---

## 4. Micro-Retiming Strategies

### 4.1 Strategy A: Time-Stretch Audio

**When to use:** Linear drift detected, video timeline is fixed.

```bash
# FFmpeg audio tempo adjustment
# Factor < 1.0 slows down, > 1.0 speeds up

# Example: Audio is 2% too fast
ffmpeg -i input.wav -af "atempo=0.98" output.wav

# For larger adjustments (>2x), chain filters
ffmpeg -i input.wav -af "atempo=0.5,atempo=0.5" output.wav  # 4x slower
```

**TypeScript wrapper:**

```typescript
async function stretchAudio(
  inputPath: string,
  outputPath: string,
  targetDuration: number
): Promise<void> {
  const inputDuration = await getAudioDuration(inputPath);
  const tempoFactor = inputDuration / targetDuration;

  // Clamp to safe range (0.5 - 2.0)
  const safeTempo = Math.max(0.5, Math.min(2.0, tempoFactor));

  if (Math.abs(tempoFactor - 1.0) < 0.001) {
    // No change needed
    await fs.copyFile(inputPath, outputPath);
    return;
  }

  await exec(`ffmpeg -i "${inputPath}" -af "atempo=${safeTempo}" "${outputPath}"`);
}
```

### 4.2 Strategy B: Retime Video (Adjust PTS)

**When to use:** Audio is sacred, video can stretch.

```bash
# FFmpeg video PTS (Presentation Time Stamp) adjustment
# setpts=0.9*PTS speeds up video by 10%
# setpts=1.1*PTS slows down video by 10%

ffmpeg -i input.mp4 -filter:v "setpts=1.02*PTS" -an output.mp4
```

**TypeScript wrapper:**

```typescript
async function retimeVideo(
  inputPath: string,
  outputPath: string,
  targetDuration: number
): Promise<void> {
  const inputDuration = await getVideoDuration(inputPath);
  const ptsFactor = targetDuration / inputDuration;

  await exec(`
    ffmpeg -i "${inputPath}" \
      -filter:v "setpts=${ptsFactor}*PTS" \
      -an \
      "${outputPath}"
  `);
}
```

### 4.3 Strategy C: Per-Word Timestamp Correction

**When to use:** Random or stepped drift, need precise word sync.

```typescript
/**
 * Apply drift corrections to word timestamps.
 */
function correctTimestamps(words: WordTiming[], corrections: DriftCorrection[]): WordTiming[] {
  return words.map((word) => {
    // Find applicable correction
    const correction = findCorrectionForTime(corrections, word.start * 1000);

    if (!correction) return word;

    // Apply correction with interpolation
    const correctionFactor = correction.correctionMs / 1000;

    return {
      ...word,
      start: word.start + correctionFactor,
      end: word.end + correctionFactor,
    };
  });
}

function findCorrectionForTime(
  corrections: DriftCorrection[],
  timeMs: number
): DriftCorrection | null {
  // Interpolate between surrounding corrections
  const sorted = corrections.sort((a, b) => a.timeMs - b.timeMs);

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    if (timeMs >= curr.timeMs && timeMs < next.timeMs) {
      // Linear interpolation
      const ratio = (timeMs - curr.timeMs) / (next.timeMs - curr.timeMs);
      const interpolatedCorrection =
        curr.correctionMs + ratio * (next.correctionMs - curr.correctionMs);

      return {
        timeMs,
        correctionMs: interpolatedCorrection,
        confidence: (curr.confidence + next.confidence) / 2,
      };
    }
  }

  // Use nearest correction if outside range
  if (sorted.length > 0) {
    if (timeMs < sorted[0].timeMs) return sorted[0];
    return sorted[sorted.length - 1];
  }

  return null;
}
```

### 4.4 Strategy D: Chunk-Based Alignment

**When to use:** Multi-scene videos with per-scene drift.

```typescript
interface SceneAlignment {
  sceneIndex: number;
  offsetMs: number;
  scaleFactor: number;
}

/**
 * Align each scene independently to minimize overall drift.
 */
async function alignScenes(scenes: Scene[], audioPath: string): Promise<SceneAlignment[]> {
  const alignments: SceneAlignment[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Extract scene audio segment
    const sceneAudioPath = await extractAudioSegment(audioPath, scene.startTime, scene.endTime);

    // Analyze drift for this scene
    const driftAnalysis = await analyzeAudioCaptionDrift(sceneAudioPath, scene.captions);

    alignments.push({
      sceneIndex: i,
      offsetMs: -driftAnalysis.avgDriftMs, // Negate to correct
      scaleFactor: 1.0, // Could add scale if linear drift detected
    });
  }

  return alignments;
}

/**
 * Apply scene alignments to all timestamps.
 */
function applySceneAlignments(scenes: Scene[], alignments: SceneAlignment[]): Scene[] {
  return scenes.map((scene, index) => {
    const alignment = alignments[index];

    return {
      ...scene,
      captions: scene.captions.map((caption) => ({
        ...caption,
        startMs: caption.startMs + alignment.offsetMs,
        endMs: caption.endMs + alignment.offsetMs,
      })),
    };
  });
}
```

---

## 5. Vendor Evidence: Drift Correction Patterns

### 5.1 MoneyPrinterTurbo: Video Loop/Extend

**Pattern:** Extend video duration to match audio exactly.

```python
# video.py
if video_duration < audio_duration:
    logger.warning("video duration shorter than audio, looping clips")
    base_clips = processed_clips.copy()

    for clip in itertools.cycle(base_clips):
        if video_duration >= audio_duration:
            break
        processed_clips.append(clip)
        video_duration += clip.duration
```

### 5.2 ShortGPT: Audio Speed Adjustment

**Pattern:** Speed up audio if too long for target duration.

```python
# audio_processing.py
def speedUpAudio(audio_file, target_duration, output_file):
    """Speed up audio to fit target duration."""
    audio = AudioFileClip(audio_file)
    current_duration = audio.duration

    if current_duration > target_duration:
        speed_factor = current_duration / target_duration
        # Use atempo filter
        spedup = audio.fx(vfx.speedx, speed_factor)
        spedup.write_audiofile(output_file)
        return output_file

    return audio_file
```

### 5.3 gyoridavid/short-video-maker: Padding

**Pattern:** Add end padding to ensure video covers audio.

```typescript
// PortraitVideo.tsx
if (config.paddingBack && i === scenes.length - 1) {
  durationInFrames += (config.paddingBack / 1000) * fps;
}
```

---

## 6. Recommended Drift Correction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DRIFT CORRECTION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. GENERATE                                                                │
│     TTS → Audio file                                                        │
│     ASR → Word timestamps                                                   │
│                                                                             │
│  2. VALIDATE                                                                │
│     Check: end > start for all words                                        │
│     Check: coverage ≥ 95%                                                   │
│     Check: no gaps > 500ms                                                  │
│                                                                             │
│  3. DETECT DRIFT                                                            │
│     Compare ASR timestamps with audio energy peaks                          │
│     Classify: linear, stepped, random, none                                 │
│     Calculate: avgDrift, maxDrift                                           │
│                                                                             │
│  4. CORRECT (if drift detected)                                             │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ Linear drift:                                                      │ │
│     │   - If |avgDrift| > 50ms: Apply global offset                     │ │
│     │   - If slope significant: Consider audio tempo adjustment          │ │
│     ├────────────────────────────────────────────────────────────────────┤ │
│     │ Stepped drift:                                                     │ │
│     │   - Per-scene offset corrections                                   │ │
│     │   - Re-align scene boundaries                                      │ │
│     ├────────────────────────────────────────────────────────────────────┤ │
│     │ Random drift:                                                      │ │
│     │   - Per-word corrections using interpolation                       │ │
│     │   - Consider re-running ASR with different model                   │ │
│     └────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  5. VALIDATE CORRECTED                                                      │
│     Re-run validation on corrected timestamps                               │
│     Ensure corrections didn't introduce new issues                          │
│                                                                             │
│  6. RENDER                                                                  │
│     Use corrected timestamps for Remotion composition                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation for content-machine

### 7.1 Drift Detection Module

```typescript
// src/sync/drift.ts

export interface DriftConfig {
  maxAcceptableDriftMs: number; // Default: 80
  driftDetectionEnabled: boolean;
  autoCorrectionEnabled: boolean;
}

export async function detectAndCorrectDrift(
  audioPath: string,
  timestamps: TimestampsOutput,
  config: DriftConfig
): Promise<{
  correctedTimestamps: TimestampsOutput;
  driftReport: DriftAnalysisResult;
}> {
  // Step 1: Analyze drift
  const driftReport = await analyzeAudioCaptionDrift(audioPath, timestamps.allWords);

  // Step 2: Check if correction needed
  if (Math.abs(driftReport.avgDriftMs) <= config.maxAcceptableDriftMs) {
    return {
      correctedTimestamps: timestamps,
      driftReport,
    };
  }

  // Step 3: Apply corrections based on drift type
  let correctedWords: WordTiming[];

  switch (driftReport.driftType) {
    case 'linear':
      correctedWords = applyLinearCorrection(timestamps.allWords, driftReport.avgDriftMs);
      break;

    case 'stepped':
      correctedWords = applySteppedCorrection(timestamps.allWords, driftReport.corrections);
      break;

    case 'random':
      correctedWords = applyPerWordCorrection(timestamps.allWords, driftReport.corrections);
      break;

    default:
      correctedWords = timestamps.allWords;
  }

  return {
    correctedTimestamps: {
      ...timestamps,
      allWords: correctedWords,
    },
    driftReport,
  };
}

function applyLinearCorrection(words: WordTiming[], avgDriftMs: number): WordTiming[] {
  const correctionSec = -avgDriftMs / 1000;

  return words.map((word) => ({
    ...word,
    start: Math.max(0, word.start + correctionSec),
    end: word.end + correctionSec,
  }));
}
```

### 7.2 Integration Point

```typescript
// src/audio/pipeline.ts

export async function generateTimestamps(
  audioPath: string,
  script: string,
  config: AudioConfig
): Promise<TimestampsOutput> {
  // Step 1: Run ASR
  let timestamps = await runASR(audioPath, config);

  // Step 2: Reconcile to script
  timestamps = await reconcileToScript(timestamps, script);

  // Step 3: Validate
  const validation = validateTimestamps(timestamps.allWords, timestamps.totalDuration);

  if (!validation.valid) {
    // Repair critical issues
    timestamps.allWords = repairTimestamps(timestamps.allWords, timestamps.totalDuration);
  }

  // Step 4: Drift detection and correction (optional)
  if (config.driftCorrection.enabled) {
    const { correctedTimestamps, driftReport } = await detectAndCorrectDrift(
      audioPath,
      timestamps,
      config.driftCorrection
    );

    if (driftReport.driftType !== 'none') {
      console.log(
        `Drift detected (${driftReport.driftType}): ${driftReport.avgDriftMs.toFixed(1)}ms avg`
      );
    }

    timestamps = correctedTimestamps;
  }

  return timestamps;
}
```

---

## 8. Testing Drift Detection

```typescript
// tests/unit/sync/drift.test.ts

describe('Drift Detection', () => {
  it('detects linear drift', () => {
    // Drift increases by 5ms per word
    const drifts = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
    expect(classifyDriftPattern(drifts)).toBe('linear');
  });

  it('detects stepped drift', () => {
    // Two distinct drift levels
    const drifts = [0, 0, 0, 0, 100, 100, 100, 100];
    expect(classifyDriftPattern(drifts)).toBe('stepped');
  });

  it('detects random drift', () => {
    // High variance, no pattern
    const drifts = [-80, 50, -30, 90, -60, 40, -70, 85];
    expect(classifyDriftPattern(drifts)).toBe('random');
  });

  it('detects no drift when within tolerance', () => {
    // Small random variations
    const drifts = [2, -3, 1, -2, 3, 0, -1, 2];
    expect(classifyDriftPattern(drifts)).toBe('none');
  });
});

describe('Drift Correction', () => {
  it('applies linear correction', () => {
    const words = [
      { word: 'hello', start: 0.0, end: 0.5 },
      { word: 'world', start: 0.5, end: 1.0 },
    ];

    const corrected = applyLinearCorrection(words, 100); // 100ms drift

    expect(corrected[0].start).toBeCloseTo(0.1, 2); // Shifted by -100ms
    expect(corrected[1].start).toBeCloseTo(0.6, 2);
  });
});
```

---

## 9. Quality Metrics

### 9.1 Sync Quality Score

```typescript
export function calculateSyncQualityScore(driftReport: DriftAnalysisResult): number {
  // Score 0-100, higher is better
  const avgDriftPenalty = Math.min(50, Math.abs(driftReport.avgDriftMs) / 2);
  const maxDriftPenalty = Math.min(30, driftReport.maxDriftMs / 10);
  const typePenalty =
    driftReport.driftType === 'none'
      ? 0
      : driftReport.driftType === 'linear'
        ? 10
        : driftReport.driftType === 'stepped'
          ? 15
          : 20;

  return Math.max(0, 100 - avgDriftPenalty - maxDriftPenalty - typePenalty);
}
```

### 9.2 Acceptable Thresholds

| Metric     | Excellent | Good   | Acceptable | Poor   |
| ---------- | --------- | ------ | ---------- | ------ |
| Avg Drift  | <30ms     | <50ms  | <80ms      | >80ms  |
| Max Drift  | <50ms     | <100ms | <150ms     | >150ms |
| Sync Score | >90       | >75    | >50        | <50    |

---

## 10. References

- [RQ-09: Timestamp Drift Handling](RQ-09-TIMESTAMP-DRIFT-20260104.md)
- [RQ-28: Audio-Visual-Caption Sync](RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md)
- [RQ-30: Sync Pipeline Architecture](RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
- [FFmpeg Time Stretching](https://trac.ffmpeg.org/wiki/How%20to%20speed%20up%20/%20slow%20down%20a%20video)
- [Audio Time Stretching Wikipedia](https://en.wikipedia.org/wiki/Audio_time_stretching_and_pitch_scaling)
- [Cross-Correlation Audio Sync](https://en.wikipedia.org/wiki/Cross-correlation)
