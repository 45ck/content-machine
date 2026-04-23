# TASK-014: Render Validation Pipeline

**Created:** 2026-01-07  
**Status:** Done  
**Type:** Feature  
**Priority:** P2 (Post-MVP)  
**Estimate:** 8 hours  
**Depends On:** TASK-010 (Quality Gate Framework)  
**Blocks:** None

---

## Summary

Implement render quality gates to validate the final video output meets technical standards for TikTok/Reels/Shorts. Ensures resolution, duration, and visual quality are correct before upload.

---

## User Story

> As a content creator, I want automatic validation of my rendered video so that I catch technical issues before uploading and wasting time on failed uploads.

---

## Acceptance Criteria

- [x] **Resolution Gate:** Validates 1080x1920 (portrait) or configurable (`src/validate/gates.ts`)
- [x] **Duration Gate:** Validates 30-60 seconds (configurable) (`src/validate/gates.ts` + `src/validate/profiles.ts`)
- [x] **Quality Gate:** BRISQUE score < 40 (no-reference quality) (`src/validate/quality.ts` + `scripts/video_quality.py`)
- [x] **Format Gate:** Validates MP4, H.264, AAC (`src/validate/gates.ts`)
- [x] All gates return specific error details (`src/validate/schema.ts`)
- [x] Fast validation (< 5s for 60s video) (integration test uses sampling + optional gates; `tests/integration/render/validate-video.test.ts`)
- [x] Works without GPU (BRISQUE gate uses CPU-only PIQ/Torch; optional enablement via CLI)

---

## Technical Design

### Gates

| Gate             | Tool        | Input     | Output                   |
| ---------------- | ----------- | --------- | ------------------------ |
| `resolution`     | FFprobe     | videoPath | width, height, pass/fail |
| `duration`       | FFprobe     | videoPath | duration, pass/fail      |
| `visual-quality` | PIQ/BRISQUE | videoPath | score, pass/fail         |
| `format`         | FFprobe     | videoPath | codec info, pass/fail    |

### Python Scripts

```python
# scripts/video_info.py
# Input: video path
# Output: { width, height, duration, codec, audioCodec, fps, bitrate }

# scripts/video_quality.py
# Input: video path, sample_rate
# Output: { brisque: { mean, min, max }, framesAnalyzed }
```

### Quality Thresholds

```typescript
const QUALITY_THRESHOLDS = {
  // TikTok/Reels/Shorts
  portrait: {
    width: 1080,
    height: 1920,
    minDuration: 15,
    maxDuration: 60,
    brisqueMax: 40,
    fps: 30,
  },
  // YouTube landscape
  landscape: {
    width: 1920,
    height: 1080,
    minDuration: 60,
    maxDuration: 600,
    brisqueMax: 35,
    fps: 30,
  },
};
```

---

## Testing Plan

### Unit Tests

1. **Resolution gate**
   - 1080x1920 video → passes
   - 720x1280 video → fails with "wrong-resolution"
   - 1920x1080 (landscape) → fails if portrait expected
2. **Duration gate**
   - 45s video → passes (30-60 range)
   - 15s video → fails with "too-short"
   - 90s video → fails with "too-long"
3. **Quality gate**
   - Clean render → BRISQUE < 40 → passes
   - Heavily compressed → BRISQUE > 40 → fails
   - Sample rate affects accuracy vs speed
4. **Format gate**
   - MP4/H.264/AAC → passes
   - WebM/VP9 → fails with "wrong-format"
   - No audio track → fails

### Test Fixtures

- `fixtures/videos/valid_portrait.mp4` - 1080x1920, 30s, clean
- `fixtures/videos/wrong_res.mp4` - 720x1280
- `fixtures/videos/too_short.mp4` - 10s
- `fixtures/videos/compressed.mp4` - Low quality

---

## Implementation Steps

1. [x] Implement `scripts/video_info.py` (FFprobe wrapper)
2. [x] Implement `scripts/video_quality.py` (PIQ BRISQUE)
3. [x] Implement TS gates + tests (`src/validate/*.test.ts`)
4. [x] Add optional cadence gate (`src/validate/cadence.ts`) and scene detect support (`scripts/scene_detect.py`)
5. [x] Integration tests generate fixtures on the fly (`tests/integration/render/validate-video.test.ts`)

---

## CLI Integration

```bash
# Validate a rendered video
cm validate output.mp4

# Validate with specific profile
cm validate output.mp4 --profile portrait

# Get detailed report
cm validate output.mp4 --verbose

# JSON output
cm validate output.mp4 --json
```

## Completion Notes (2026-01-07)

- Implemented in the canonical validator module under `src/validate/*` (kept single source of truth).
- Optional gates are exposed via `cm validate` flags (`--quality`, `--cadence`, `--cadence-engine`).
- Implementation plans and V&V checklists live under `docs/dev/architecture/IMPL-RENDER-VALIDATION-*-20260107.md`.

---

## Dependencies

### System Requirements

```bash
# FFmpeg/FFprobe required
ffmpeg -version
ffprobe -version
```

### Python Packages

```bash
pip install piq==0.8.0
pip install torch==2.1.0
pip install torchvision==0.16.0
pip install opencv-python==4.9.0.80
pip install pillow==10.2.0
pip install numpy==1.26.4
```

---

## BRISQUE Sampling Strategy

```python
def sample_frames(video_path: str, sample_rate: int = 30) -> list:
    """
    Sample every Nth frame for quality analysis.

    For 60s @ 30fps = 1800 frames
    Sample rate 30 = 60 frames analyzed

    Balance: speed vs accuracy
    """
    cap = cv2.VideoCapture(video_path)
    frames = []

    frame_num = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_num % sample_rate == 0:
            frames.append(frame)
        frame_num += 1

    cap.release()
    return frames
```

---

## Error Messages

```typescript
// Resolution error
{
  passed: false,
  fix: 'adjust-render-resolution',
  details: {
    expected: { width: 1080, height: 1920 },
    actual: { width: 720, height: 1280 },
    message: 'Video resolution 720x1280 does not match required 1080x1920'
  }
}

// Duration error
{
  passed: false,
  fix: 'adjust-content-length',
  details: {
    expected: { min: 30, max: 60 },
    actual: 15,
    message: 'Video duration 15s is below minimum 30s'
  }
}

// Quality error
{
  passed: false,
  fix: 'improve-render-settings',
  details: {
    brisque: 55,
    threshold: 40,
    message: 'Video quality score 55 exceeds maximum 40 (lower is better)'
  }
}
```

---

## Performance Targets

| Operation         | Target  | Video Length |
| ----------------- | ------- | ------------ |
| Video info        | < 500ms | Any          |
| Quality (sampled) | < 3s    | 60s          |
| Full validation   | < 5s    | 60s          |

---

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] FFprobe dependency documented
- [ ] BRISQUE sampling is efficient
- [ ] Error messages are actionable
- [ ] Works on Windows, macOS, Linux

---

## Notes

- BRISQUE is no-reference (doesn't need source video)
- FFprobe is faster than loading video in Python
- Consider caching video info for re-validation
- Future: Add VMAF for reference-based quality
