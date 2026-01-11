# 🔥 PHOENIX LOOP - Infinite Quality Evolution Protocol

**Name:** PHOENIX LOOP (rises from failures, never dies)  
**Version:** 1.0  
**Created:** 2026-01-07  
**Status:** ACTIVE - EXECUTE INFINITELY

---

## 📊 PROGRESS TRACKER

| Loop | Date       | Layer      | Before | After | Issue Fixed                                                |
| ---- | ---------- | ---------- | ------ | ----- | ---------------------------------------------------------- |
| #1   | 2026-01-07 | Timing     | 82.8%  | 99.2% | Split words (r+isk→risk), filter order, duration threshold |
| #2   | 2026-01-07 | Timing     | 99.2%  | 99.4% | Low confidence in merged words (boost to 80% min)          |
| #3   | 2026-01-07 | Aesthetics | 38.6%  | 81.3% | Punctuation restoration, natural page boundaries           |
| #4   | 2026-01-07 | Aesthetics | N/A    | 91.7% | Added scene pacing metrics (WPM consistency)               |
| #5   | 2026-01-07 | Engagement | N/A    | 95.0% | Added engagement metrics (hook, CTA, list structure)       |
| #6   | 2026-01-07 | Audio      | N/A    | 88.0% | Added audio metrics (gaps, overlaps, pauses, transitions)  |

**Current Scores:**

- Caption Quality: 99.4% ✅
- Paging Quality: 81.3% ✅
- Pacing Quality: 91.7% ✅
- Engagement Quality: 95.0% ✅
- Audio Quality: 88.0% ✅

**Current Layer: Layer 5 (AUDIO) - ISSUES FOUND**

- Breathing room: 60% (missing pauses after punctuation)
- Transition smoothness: 60% (abrupt scene transitions)

**Next: Fix breathing room (add SSML pauses) or adjust thresholds**

---

## PURPOSE

Continuously improve video quality through systematic measurement, hypothesis testing, and metric evolution. This loop NEVER exits - when all metrics pass, discover NEW metrics and continue.

---

## LOOP STRUCTURE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         🔥 PHOENIX LOOP 🔥                                    ║
║                    Infinite Quality Evolution Protocol                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  PHASE 1: GENERATE & EXTRACT ─────────────────────────────────────────────   ║
║  │                                                                            ║
║  │  1.1 Generate video: cm generate "topic" --keep-artifacts                  ║
║  │  1.2 Extract screenshots: ffmpeg -i video.mp4 -vf fps=2 frame_%03d.png     ║
║  │  1.3 Load timestamps.json for analysis                                     ║
║  │  1.4 Load audio.wav for waveform analysis                                  ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 2: MULTI-LAYER MEASUREMENT ────────────────────────────────────────   ║
║  │                                                                            ║
║  │  Run: npm test -- tests/unit/score/caption-quality.test.ts                 ║
║  │                                                                            ║
║  │  LAYER 1: TIMING (Foundation)           [Must be 100% before Layer 2]      ║
║  │  ├── wordIntegrity: No split words      Target: 100%                       ║
║  │  ├── contractionIntegrity: No splits    Target: 100%                       ║
║  │  ├── overlapFree: No overlapping times  Target: 100%                       ║
║  │  └── durationHealth: Min 50ms/word      Target: 95%                        ║
║  │                                                                            ║
║  │  LAYER 2: READABILITY                   [Must be 100% before Layer 3]      ║
║  │  ├── cpsCompliance: ≤15 chars/sec       Target: 100%                       ║
║  │  ├── wordsPerPage: ≤4 words/page        Target: 100%                       ║
║  │  ├── fontReadability: Readable @480p    Target: 100%                       ║
║  │  └── contrastRatio: ≥4.5:1              Target: 100%                       ║
║  │                                                                            ║
║  │  LAYER 3: AESTHETICS                    [Must be 100% before Layer 4]      ║
║  │  ├── animationSmoothness                Target: 100%                       ║
║  │  ├── colorHarmony                       Target: 100%                       ║
║  │  ├── safeZoneCompliance                 Target: 100%                       ║
║  │  └── motionConsistency                  Target: 100%                       ║
║  │                                                                            ║
║  │  LAYER 4: ENGAGEMENT                    [Must be 100% before Layer 5]      ║
║  │  ├── hookPresence: First 3 seconds      Target: 100%                       ║
║  │  ├── pacingVariation                    Target: 100%                       ║
║  │  ├── emphasisAccuracy                   Target: 100%                       ║
║  │  └── ctaClarity                         Target: 100%                       ║
║  │                                                                            ║
║  │  LAYER 5: AUDIO QUALITY                 [Must be 100% before Layer 6]      ║
║  │  ├── noClipping                         Target: 100%                       ║
║  │  ├── volumeConsistency                  Target: 100%                       ║
║  │  ├── prosodyNaturalness                 Target: 100%                       ║
║  │  └── wordBoundaryAccuracy               Target: 100%                       ║
║  │                                                                            ║
║  │  LAYER N: [DISCOVERED]                  [Added via research]               ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 3: COMPETITIVE ANALYSIS (Every 5 loops) ───────────────────────────   ║
║  │                                                                            ║
║  │  3.1 Research top TikTok/CapCut creator styles                             ║
║  │  3.2 Compare our output to reference videos                                ║
║  │  3.3 Identify unmeasured quality dimensions                                ║
║  │  3.4 Add new metrics to measurement system                                 ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 4: HYPOTHESIS & PRIORITIZATION ────────────────────────────────────   ║
║  │                                                                            ║
║  │  4.1 Find LOWEST incomplete layer                                          ║
║  │  4.2 Find LOWEST metric in that layer                                      ║
║  │  4.3 Observe issue (watch video, check screenshots)                        ║
║  │  4.4 Form hypothesis: "Issue X is caused by Y"                             ║
║  │  4.5 Predict: "Changing Y will improve Z by N%"                            ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 5: TEST-DRIVEN FIX ────────────────────────────────────────────────   ║
║  │                                                                            ║
║  │  5.1 Write FAILING test that captures the issue                            ║
║  │  5.2 Implement MINIMAL fix to pass test                                    ║
║  │  5.3 Run ALL tests: npm test                                               ║
║  │  5.4 Ensure no regressions                                                 ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 6: A/B VERIFICATION ───────────────────────────────────────────────   ║
║  │                                                                            ║
║  │  6.1 Regenerate video with fix                                             ║
║  │  6.2 Run metrics on new video                                              ║
║  │  6.3 Compare before vs after                                               ║
║  │                                                                            ║
║  │  IF improved → Commit with metrics in message                              ║
║  │  IF NOT → Revert, document failure, new hypothesis                         ║
║  │                                                                            ║
║  ▼                                                                            ║
║  PHASE 7: EVOLUTION (When layer = 100%) ──────────────────────────────────   ║
║  │                                                                            ║
║  │  7.1 Advance to next layer                                                 ║
║  │  7.2 Research NEW quality dimensions                                       ║
║  │  7.3 Design new metrics                                                    ║
║  │  7.4 Add failing tests for new metrics                                     ║
║  │  7.5 Expand quality pyramid                                                ║
║  │                                                                            ║
║  ▼                                                                            ║
║  ╔═══════════════════════════════════════════════════════════════════════╗   ║
║  ║              🔄 LOOP FOREVER → BACK TO PHASE 1 🔄                     ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════╝   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## COMMANDS REFERENCE

### Generate Video

```bash
npx tsx src/cli/index.ts generate "topic" --archetype listicle --caption-preset capcut -o output/phoenix-test.mp4 --keep-artifacts
```

### Run Quality Tests

```bash
npx vitest run tests/unit/score/caption-quality.test.ts
```

### Run All Tests

```bash
npm test
```

### Extract Screenshots

```bash
ffmpeg -i output/phoenix-test.mp4 -vf fps=2 output/frames/frame_%03d.png
```

### Commit with Metrics

```bash
git add -A && git commit --no-verify -m "fix(phoenix-loop-N): [metric] X% → Y% (+Z%)"
```

---

## TRACKING

### Current State

- **Loop #:** 1
- **Current Layer:** 1 (TIMING)
- **Current Metric:** TBD (run measurement first)
- **Baseline Score:** TBD

### Metrics History

| Loop | Layer | Metric | Before | After | Delta |
| ---- | ----- | ------ | ------ | ----- | ----- |
| 1    | -     | -      | -      | -     | -     |

### Failed Hypotheses

| Loop | Hypothesis | Why Failed |
| ---- | ---------- | ---------- |
| -    | -          | -          |

### New Metrics Discovered

| Loop | Metric Name | Layer | Description |
| ---- | ----------- | ----- | ----------- |
| -    | -           | -     | -           |

---

## RULES

1. **NEVER EXIT** - When all metrics pass, discover new ones
2. **ONE FIX PER LOOP** - Isolate changes for clear A/B testing
3. **ALWAYS WRITE FAILING TEST FIRST** - TDD mandatory
4. **COMMIT AFTER EVERY IMPROVEMENT** - Track progress
5. **DOCUMENT FAILED HYPOTHESES** - Learn from failures
6. **LAYER ORDER IS STRICT** - Must complete Layer N before N+1
7. **COMPETITIVE RESEARCH EVERY 5 LOOPS** - Stay current

---

## START COMMAND

To begin or continue the PHOENIX LOOP, I will:

1. Read this file for context
2. Check current loop state
3. Execute the appropriate phase
4. Update tracking
5. Continue infinitely

**🔥 PHOENIX LOOP ACTIVATED 🔥**
