# Sync Configuration Quick Reference

**Date:** 2026-01-07  
**Type:** Reference Documentation

---

## CLI Flags

### `cm audio` Command

| Flag                 | Values                                              | Default    | Description                               |
| -------------------- | --------------------------------------------------- | ---------- | ----------------------------------------- |
| `--sync-strategy`    | `standard`, `audio-first`, `forced-align`, `hybrid` | `standard` | Timestamp extraction strategy             |
| `--require-whisper`  | boolean                                             | `false`    | Require whisper.cpp (fail if unavailable) |
| `--reconcile`        | boolean                                             | `false`    | Match ASR text to original script         |
| `--drift-correction` | `none`, `detect`, `auto`                            | `none`     | Drift handling mode                       |
| `--no-validate`      | boolean                                             | `false`    | Skip timestamp validation                 |

### `cm render` Command

| Flag                    | Values                          | Default    | Description                  |
| ----------------------- | ------------------------------- | ---------- | ---------------------------- |
| `--caption-sync`        | `absolute`, `sequence-relative` | `absolute` | Frame timing mode            |
| `--highlight-offset-ms` | integer                         | `0`        | Word highlight timing offset |

### `cm generate` Command (Full Pipeline)

| Flag            | Values                                   | Default    | Description            |
| --------------- | ---------------------------------------- | ---------- | ---------------------- |
| `--sync-preset` | `fast`, `standard`, `quality`, `maximum` | `standard` | Quality/speed tradeoff |

---

## Configuration File (.content-machine.toml)

```toml
[sync]
# Sync strategy for timestamp extraction
# Options: "standard", "audio-first", "forced-align", "hybrid"
strategy = "standard"

# Drift correction behavior
# Options: "none", "detect", "auto"
drift_correction = "none"

# Maximum acceptable drift before warning/correction (milliseconds)
max_drift_ms = 80

# Reconcile ASR transcription to original script text
# Fixes issues like "10x" being transcribed as "tenex"
reconcile_to_script = false

# Minimum confidence threshold for word timestamps (0.0-1.0)
min_confidence = 0.6

# Validate timestamps before render
validate_timestamps = true

# Automatically repair invalid timestamps
auto_repair = true
```

---

## Audio Mix Configuration (Optional)

```toml
[audio_mix]
# Audio mix preset id (built-in examples: clean, punchy, cinematic, viral)
preset = "clean"
lufs_target = -16

[music]
default = "lofi-01"
volume_db = -18
duck_db = -8
loop = true
fade_in_ms = 400
fade_out_ms = 600

[sfx]
pack = "pops"
volume_db = -12
placement = "scene"
min_gap_ms = 800
duration_seconds = 0.4

[ambience]
default = "roomtone-01"
volume_db = -26
loop = true
fade_in_ms = 200
fade_out_ms = 400
```

---

## Strategy Comparison

| Strategy         | Speed     | Accuracy | Requirements | Fallback    |
| ---------------- | --------- | -------- | ------------ | ----------- |
| **standard**     | ⚡ Fast   | Good     | None         | Estimation  |
| **audio-first**  | 🔄 Medium | Better   | whisper.cpp  | None (fail) |
| **forced-align** | 🐢 Slow   | Best     | Aeneas       | whisper.cpp |
| **hybrid**       | 🐢 Slow   | Best     | WhisperX     | whisper.cpp |

---

## Preset Mappings

| Preset     | Strategy     | Drift  | Reconcile | Use Case                |
| ---------- | ------------ | ------ | --------- | ----------------------- |
| `fast`     | standard     | none   | false     | Development, testing    |
| `standard` | standard     | detect | false     | Production default      |
| `quality`  | audio-first  | detect | true      | Quality-conscious users |
| `maximum`  | forced-align | auto   | true      | Maximum sync accuracy   |

---

## Environment Variables (Override Config)

```bash
# Override sync strategy
CM_SYNC_STRATEGY=audio-first

# Force whisper requirement
CM_REQUIRE_WHISPER=true

# Override drift correction
CM_DRIFT_CORRECTION=auto
```

---

## Quick Usage Examples

```bash
# Default behavior (standard strategy)
cm audio -i script.json -o audio.wav

# Require whisper (no estimation fallback)
cm audio -i script.json -o audio.wav --require-whisper

# Audio-first with reconciliation
cm audio -i script.json -o audio.wav --sync-strategy audio-first --reconcile

# Maximum quality (requires Aeneas)
cm audio -i script.json -o audio.wav --sync-strategy forced-align --reconcile --drift-correction auto

# Full pipeline with quality preset
cm generate "Redis vs PostgreSQL" --sync-preset quality

# Full pipeline with maximum sync
cm generate "5 JavaScript tips" --sync-preset maximum
```

---

## Validation and Repair

### What Gets Validated

1. **Word timing order** - `end > start` for all words
2. **Coverage** - Words cover ≥95% of audio duration
3. **Gaps** - No gaps >500ms between consecutive words
4. **Confidence** - Average confidence >0.5

### Auto-Repair Actions

1. **Fix end < start** - Extend end to start + average word duration
2. **Fill gaps** - Extend previous word or interpolate
3. **Extend coverage** - Extend last word to reach audio duration

---

## Drift Correction Modes

| Mode     | Behavior                                            |
| -------- | --------------------------------------------------- |
| `none`   | No drift detection or correction                    |
| `detect` | Analyze drift, log warnings if >80ms, no correction |
| `auto`   | Detect and automatically correct drift              |

### Drift Types Detected

- **Linear** - Drift grows proportionally (sample rate mismatch)
- **Stepped** - Sudden jumps at scene boundaries
- **Random** - Unpredictable variations (ASR uncertainty)

---

## Dependencies by Strategy

| Strategy       | Required          | Optional                     |
| -------------- | ----------------- | ---------------------------- |
| `standard`     | None              | whisper.cpp (better quality) |
| `audio-first`  | whisper.cpp       | None                         |
| `forced-align` | Aeneas + Python   | whisper.cpp (fallback)       |
| `hybrid`       | WhisperX + Python | None                         |

### Installing Dependencies

```bash
# whisper.cpp + model (recommended)
cm setup whisper --model base

# Aeneas (Python)
pip install aeneas

# WhisperX (Python, future)
pip install whisperx
```

---

## Related Documentation

- [SYNC-INTEGRATION-GUIDE](../guides/SYNC-INTEGRATION-GUIDE-20260107.md) - Full implementation guide
- [RQ-30: Sync Pipeline Architecture](../research/investigations/RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
- [RQ-32: Forced Alignment vs ASR](../research/investigations/RQ-32-FORCED-ALIGNMENT-VS-ASR-ANALYSIS-20260107.md)
- [RQ-33: Remotion Caption Patterns](../research/investigations/RQ-33-REMOTION-CAPTION-SYNC-PATTERNS-20260107.md)
