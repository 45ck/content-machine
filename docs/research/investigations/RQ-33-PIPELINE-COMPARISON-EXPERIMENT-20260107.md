# RQ-33: Audio-First vs Standard Pipeline Comparison

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P1  
**Related:** RQ-29, RQ-30, RQ-32

---

## Executive Summary

This investigation defines an experimental framework for comparing the audio-first and standard pipeline approaches. It establishes methodology, test cases, evaluation criteria, and expected outcomes to determine which approach produces better synchronization quality.

---

## 1. Experimental Hypothesis

### 1.1 Primary Hypothesis

**H1:** Audio-first pipeline produces videos with significantly better caption synchronization than the standard pipeline.

**Expected Outcome:**

- Audio-first videos: 85+ sync rating (excellent/good)
- Standard videos: 60-75 sync rating (fair/good)
- Difference: 15-25 point improvement

### 1.2 Secondary Hypotheses

**H2:** Audio-first has lower variance in sync quality across different scripts.

**H3:** Standard pipeline is more likely to produce catastrophic failures (< 40 rating).

**H4:** Audio-first requires ~20% more processing time due to mandatory Whisper step.

---

## 2. Experimental Design

### 2.1 Variables

| Variable Type   | Variable        | Description                       |
| --------------- | --------------- | --------------------------------- |
| **Independent** | Pipeline mode   | audio-first vs standard           |
| **Dependent**   | Sync rating     | 0-100 score from RQ-29 system     |
| **Dependent**   | Mean drift      | Average caption-audio offset (ms) |
| **Dependent**   | Max drift       | Maximum caption-audio offset (ms) |
| **Dependent**   | Processing time | Total generation time (s)         |
| **Control**     | Script content  | Same script for both pipelines    |
| **Control**     | Voice           | Same TTS voice (af_heart)         |
| **Control**     | Archetype       | Same archetype per test pair      |

### 2.2 Test Matrix

| Test ID | Archetype | Script Topic                  | Word Count | Expected Duration |
| ------- | --------- | ----------------------------- | ---------- | ----------------- |
| T01     | listicle  | 5 JavaScript tips             | ~120       | 30s               |
| T02     | listicle  | 7 productivity hacks          | ~180       | 45s               |
| T03     | versus    | React vs Vue                  | ~150       | 40s               |
| T04     | versus    | Redis vs PostgreSQL           | ~140       | 35s               |
| T05     | howto     | How to center a div           | ~100       | 25s               |
| T06     | howto     | How to use Git branches       | ~160       | 40s               |
| T07     | myth      | 5 coding myths                | ~130       | 35s               |
| T08     | story     | My first production bug       | ~200       | 50s               |
| T09     | hot-take  | Why you don't need TypeScript | ~110       | 30s               |
| T10     | hot-take  | Frameworks are overrated      | ~120       | 30s               |

### 2.3 Sample Size

- **10 unique scripts** × **2 pipeline modes** = **20 videos**
- Each video rated 3 times (to measure rating consistency)
- Total measurements: 60

---

## 3. Experimental Procedure

### 3.1 Phase 1: Script Generation

```bash
# Generate 10 scripts (controlled variable)
for topic in topics:
  cm script --topic "$topic" --archetype $archetype --output "scripts/$id.json"
```

Scripts are ideally generated once and reused for both pipelines. (Note: `cm generate` currently takes a `<topic>`; truly script-controlled comparisons require running stage-by-stage or adding a generate-from-script flag.)

### 3.2 Phase 2: Video Generation

```bash
# Generate with standard pipeline (control)
for topic in topics:
  cm generate --pipeline standard "$topic" --keep-artifacts \
    --output "videos/standard/$id.mp4"

# Generate with audio-first pipeline (treatment; Whisper required)
for topic in topics:
  cm generate --pipeline audio-first "$topic" --keep-artifacts \
    --output "videos/audio-first/$id.mp4"
```

### 3.3 Phase 3: Sync Rating

```bash
# Rate all videos
for video in videos/**/*.mp4:
  cm rate --input "$video" --output "ratings/$video.json"
```

### 3.4 Phase 4: Analysis

```typescript
// Compare results
const standardRatings = loadRatings('ratings/standard/*.json');
const audioFirstRatings = loadRatings('ratings/audio-first/*.json');

const comparison = {
  standard: {
    mean: mean(standardRatings),
    stdDev: std(standardRatings),
    min: min(standardRatings),
    max: max(standardRatings),
  },
  audioFirst: {
    mean: mean(audioFirstRatings),
    stdDev: std(audioFirstRatings),
    min: min(audioFirstRatings),
    max: max(audioFirstRatings),
  },
  improvement: mean(audioFirstRatings) - mean(standardRatings),
  pValue: tTest(standardRatings, audioFirstRatings),
};
```

---

## 4. Evaluation Criteria

### 4.1 Primary Metrics

| Metric       | Definition                  | Target                          |
| ------------ | --------------------------- | ------------------------------- |
| Sync Rating  | Overall sync score (0-100)  | Audio-first > standard          |
| Mean Drift   | Average caption offset (ms) | Audio-first < standard          |
| Failure Rate | % videos with rating < 40   | Audio-first = 0%, standard > 0% |

### 4.2 Secondary Metrics

| Metric          | Definition                | Measurement             |
| --------------- | ------------------------- | ----------------------- |
| Rating Variance | Consistency across videos | Lower = better          |
| Processing Time | Total generation time     | Audio-first ~20% slower |
| Drift Trend     | Drift pattern over video  | Stable preferred        |

### 4.3 Statistical Tests

| Test              | Purpose                   | Threshold |
| ----------------- | ------------------------- | --------- |
| Two-sample t-test | Compare mean ratings      | p < 0.05  |
| F-test            | Compare variances         | p < 0.05  |
| Mann-Whitney U    | Non-parametric comparison | p < 0.05  |

---

## 5. Expected Results

### 5.1 Predicted Outcomes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPECTED RESULTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sync Rating Distribution (predicted)                                       │
│                                                                             │
│  Standard:  [▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]                │
│                 40    50    60    70    80    90   100                      │
│                 Mean: ~68, StdDev: ~15                                      │
│                                                                             │
│  Audio-First:   [░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░]                │
│                 40    50    60    70    80    90   100                      │
│                 Mean: ~85, StdDev: ~8                                       │
│                                                                             │
│  Improvement:   +17 points (25% relative improvement)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Edge Cases

| Scenario              | Standard | Audio-First | Notes                         |
| --------------------- | -------- | ----------- | ----------------------------- |
| Short script (< 20s)  | 70-80    | 85-95       | Less room for drift           |
| Long script (> 50s)   | 50-70    | 80-90       | Drift accumulates in baseline |
| Many short words      | 55-65    | 75-85       | Estimation struggles          |
| Few long words        | 75-85    | 90-95       | Both perform well             |
| Complex pronunciation | 60-70    | 80-90       | Whisper handles better        |

---

## 6. Risk Analysis

### 6.1 Potential Confounds

| Confound            | Impact | Mitigation                |
| ------------------- | ------ | ------------------------- |
| Script variation    | High   | Use identical scripts     |
| TTS inconsistency   | Medium | Same voice, same model    |
| OCR errors          | Medium | Verify OCR accuracy first |
| ASR model variation | Low    | Use same Whisper model    |

### 6.2 Failure Modes

| Failure                  | Detection        | Response                   |
| ------------------------ | ---------------- | -------------------------- |
| Whisper fails to install | Pre-flight check | Skip audio-first tests     |
| OCR accuracy < 80%       | OCR confidence   | Retry with preprocessing   |
| Rating inconsistent      | Rating std > 10  | Investigate specific video |

---

## 7. Automation Script

### 7.1 Full Experiment Runner

```typescript
// scripts/run-experiment.ts
import { generateVideo, rateVideo } from '../src';

interface ExperimentResult {
  testId: string;
  script: string;
  standard: {
    videoPath: string;
    rating: number;
    processingTimeMs: number;
    metrics: SyncMetrics;
  };
  audioFirst: {
    videoPath: string;
    rating: number;
    processingTimeMs: number;
    metrics: SyncMetrics;
  };
}

async function runExperiment(): Promise<ExperimentResult[]> {
  const results: ExperimentResult[] = [];

  for (const test of TEST_MATRIX) {
    console.log(`Running test ${test.id}: ${test.topic}`);

    // Generate script (once)
    const script = await generateScript(test.topic, test.archetype);

    // Generate with standard
    const sfStart = Date.now();
    const sfVideo = await generateVideo({
      script,
      pipeline: 'standard',
      output: `output/standard-${test.id}.mp4`,
    });
    const sfTime = Date.now() - sfStart;

    // Generate with audio-first
    const afStart = Date.now();
    const afVideo = await generateVideo({
      script,
      pipeline: 'audio-first',
      output: `output/af-${test.id}.mp4`,
    });
    const afTime = Date.now() - afStart;

    // Rate both videos
    const sfRating = await rateVideo(sfVideo);
    const afRating = await rateVideo(afVideo);

    results.push({
      testId: test.id,
      script: test.topic,
      standard: {
        videoPath: sfVideo,
        rating: sfRating.rating,
        processingTimeMs: sfTime,
        metrics: sfRating.metrics,
      },
      audioFirst: {
        videoPath: afVideo,
        rating: afRating.rating,
        processingTimeMs: afTime,
        metrics: afRating.metrics,
      },
    });
  }

  return results;
}
```

### 7.2 Analysis Script

```typescript
// scripts/analyze-experiment.ts
import { loadResults } from './utils';
import { tTest, mean, std, min, max } from 'simple-statistics';

function analyzeResults(results: ExperimentResult[]): ExperimentAnalysis {
  const sfRatings = results.map((r) => r.standard.rating);
  const afRatings = results.map((r) => r.audioFirst.rating);
  const sfTimes = results.map((r) => r.standard.processingTimeMs);
  const afTimes = results.map((r) => r.audioFirst.processingTimeMs);

  const comparison = {
    standard: {
      ratingMean: mean(sfRatings),
      ratingStd: std(sfRatings),
      ratingMin: min(sfRatings),
      ratingMax: max(sfRatings),
      timeMean: mean(sfTimes),
      failureRate: sfRatings.filter((r) => r < 40).length / sfRatings.length,
    },
    audioFirst: {
      ratingMean: mean(afRatings),
      ratingStd: std(afRatings),
      ratingMin: min(afRatings),
      ratingMax: max(afRatings),
      timeMean: mean(afTimes),
      failureRate: afRatings.filter((r) => r < 40).length / afRatings.length,
    },
    improvement: mean(afRatings) - mean(sfRatings),
    improvementPct: ((mean(afRatings) - mean(sfRatings)) / mean(sfRatings)) * 100,
    timeOverhead: ((mean(afTimes) - mean(sfTimes)) / mean(sfTimes)) * 100,
    pValue: tTest(sfRatings, afRatings),
    significant: tTest(sfRatings, afRatings) < 0.05,
  };

  return comparison;
}
```

---

## 8. Report Template

### 8.1 Experiment Summary Report

```markdown
# Pipeline Comparison Experiment Report

**Date:** YYYY-MM-DD
**Experiment ID:** EXP-001
**Total Tests:** 10 scripts x 2 pipelines = 20 videos

## Summary

| Metric       | Standard | Audio-First | Δ      |
| ------------ | -------- | ----------- | ------ |
| Mean Rating  | 68.3     | 85.7        | +17.4  |
| Std Dev      | 14.2     | 7.8         | -6.4   |
| Min Rating   | 42       | 71          | +29    |
| Max Rating   | 89       | 97          | +8     |
| Failure Rate | 10%      | 0%          | -10%   |
| Avg Time (s) | 62.4     | 74.8        | +19.9% |

## Statistical Analysis

- **t-test p-value:** 0.003 (< 0.05, significant)
- **Conclusion:** Audio-first produces significantly better sync quality

## Recommendation

Based on these results, **audio-first should be the default pipeline mode**.
The ~20% time overhead is justified by:

- 17+ point rating improvement
- Zero catastrophic failures
- Lower variance (more consistent quality)
```

---

## 9. Implementation Checklist

### 9.1 Pre-Experiment

- [x] Implement `--pipeline` flag in `cm generate`
- [x] Implement `cm rate` command (RQ-29)
- [ ] Verify Whisper installation works
- [ ] Create 10 test scripts
- [ ] Create automation scripts

### 9.2 Experiment Execution

- [ ] Run all 20 video generations
- [ ] Rate all 20 videos (3× each)
- [ ] Collect timing data
- [ ] Verify no errors in logs

### 9.3 Post-Experiment

- [ ] Compute statistics
- [ ] Generate report
- [ ] Document conclusions
- [ ] Make recommendation

---

## 10. Timeline

| Day | Task                                      |
| --- | ----------------------------------------- |
| 1   | Implement `cm rate` and `--pipeline` flag |
| 2   | Create automation scripts                 |
| 3   | Generate 10 test scripts                  |
| 4   | Run experiment (20 videos)                |
| 5   | Rate all videos, analyze results          |
| 6   | Write report, make recommendation         |

---

## 11. Success Criteria

The experiment is successful if:

1. **H1 confirmed:** Audio-first mean rating > standard mean rating by ≥ 10 points
2. **Statistical significance:** p-value < 0.05
3. **Zero failures:** Audio-first has 0 videos with rating < 40
4. **Acceptable overhead:** Time increase < 30%

If these criteria are met, audio-first becomes the default pipeline mode.

---

## 12. References

- [RQ-29: Video Sync Rating System](RQ-29-VIDEO-SYNC-RATING-SYSTEM-20260107.md)
- [RQ-30: Audio-First Pipeline Architecture](RQ-30-AUDIO-FIRST-PIPELINE-ARCHITECTURE-20260107.md)
- [RQ-32: Sync Metrics and Thresholds](RQ-32-SYNC-METRICS-TOLERANCE-THRESHOLDS-20260107.md)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-07  
**Author:** Claude (Copilot)
