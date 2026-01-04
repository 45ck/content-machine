# FFmpeg Video Concatenation Without Artifacts

**Date:** 2026-01-05  
**Sources:** Vendored repos (`ffmpeg`, `remotion`, `MoneyPrinterTurbo`, `ShortGPT`, `moviepy`)

---

## 1. Concat Demuxer vs Concat Filter

### Concat Demuxer (Recommended for Matching Files)

**Best for:** Short videos with **identical encoding parameters** (same codec, resolution, fps, sample rate).

**Pros:**
- **No re-encoding** → Fastest, lossless
- Simple file list syntax
- Supports `inpoint`/`outpoint` for frame-accurate trimming

**Cons:**
- Requires identical video parameters across all inputs
- Cannot handle different codecs, resolutions, or frame rates

**FFmpeg Command:**

```bash
# Create file list
cat > filelist.txt << EOF
file 'clip1.mp4'
file 'clip2.mp4'
file 'clip3.mp4'
EOF

# Concatenate without re-encoding
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**With inpoint/outpoint (from Remotion's `combine-audio.ts`):**

```bash
# Precise trimming at segment boundaries
cat > audio-files.txt << EOF
file 'segment1.aac'
inpoint 0us
outpoint 1000000us
file 'segment2.aac'
inpoint 92879us
outpoint 1092879us
EOF

ffmpeg -f concat -safe 0 -i audio-files.txt -c:a copy output.aac
```

**Source:** [vendor/render/remotion/packages/renderer/src/combine-audio.ts](vendor/render/remotion/packages/renderer/src/combine-audio.ts#L167-L190)

---

### Concat Protocol (Byte-Level Concatenation)

**Best for:** MPEG-TS streams or files designed for physical concatenation.

```bash
ffmpeg -i "concat:split1.ts|split2.ts|split3.ts" -c copy output.ts
```

**Source:** [vendor/video-processing/ffmpeg/doc/protocols.texi](vendor/video-processing/ffmpeg/doc/protocols.texi#L192-L215)

**Limitation:** Only works for formats that support physical concatenation (MPEG-TS, MPEG-PS). Does NOT work for MP4.

---

### Concat Filter (Required for Mismatched Files)

**Best for:** Videos with **different resolutions, codecs, or frame rates**.

**Pros:**
- Handles any input format
- Can normalize parameters during concatenation
- Supports transitions and effects

**Cons:**
- **Requires re-encoding** → Slower, potential quality loss
- More complex filter syntax

**FFmpeg Command:**

```bash
# Concatenate two inputs with different sizes (must normalize first)
ffmpeg -i opening.mkv -i episode.mkv -i ending.mkv -filter_complex \
  '[0:0] [0:1] [0:2] [1:0] [1:1] [1:2] [2:0] [2:1] [2:2] \
   concat=n=3:v=1:a=2 [v] [a1] [a2]' \
  -map '[v]' -map '[a1]' -map '[a2]' output.mkv
```

**With resolution normalization:**

```bash
# Scale inputs to common resolution before concat
ffmpeg -i part1.mp4 -i part2.mp4 -filter_complex \
  "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:color=black[v0]; \
   [1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:color=black[v1]; \
   [v0][0:a][v1][1:a]concat=n=2:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac output.mp4
```

**Source:** [vendor/video-processing/ffmpeg/doc/filters.texi](vendor/video-processing/ffmpeg/doc/filters.texi#L31380-L31470)

---

### Decision Matrix

| Scenario | Method | Re-encode? | Speed |
|----------|--------|------------|-------|
| Same codec, resolution, fps | **Concat demuxer** | No | ⚡ Fast |
| MPEG-TS streams | **Concat protocol** | No | ⚡ Fast |
| Different resolutions | **Concat filter** | Yes | 🐢 Slow |
| Different codecs | **Concat filter** | Yes | 🐢 Slow |
| Different frame rates | **Concat filter** | Yes | 🐢 Slow |
| Need transitions | **Concat filter** | Yes | 🐢 Slow |

**Remotion's Approach:**

```typescript
// vendor/render/remotion/packages/renderer/src/can-concat-seamlessly.ts

export const canConcatAudioSeamlessly = (audioCodec: AudioCodec | null, chunkDurationInFrames: number) => {
  if (chunkDurationInFrames <= 4) return false;  // Too small = overhead
  return audioCodec === 'aac';  // Only AAC supports seamless concat
};

export const canConcatVideoSeamlessly = (codec: Codec) => {
  return codec === 'h264';  // Only H.264 supports seamless concat
};
```

---

## 2. Avoiding Audio Pops at Boundaries

### Cause of Audio Pops

Audio pops/clicks occur when:
1. **Abrupt amplitude discontinuity** at segment boundaries
2. **Non-zero crossing** at cut points
3. **Missing/extra samples** causing gaps or overlaps
4. **AAC frame boundary misalignment** (AAC uses 1024-sample frames)

### Solution 1: Audio Fade In/Out

**FFmpeg `afade` filter:**

```bash
# Fade in first 0.05 seconds, fade out last 0.05 seconds
ffmpeg -i input.mp4 -af "afade=t=in:d=0.05,afade=t=out:st=9.95:d=0.05" output.mp4
```

**MoviePy implementation (from MoneyPrinterTurbo):**

```python
# vendor/MoneyPrinterTurbo/app/services/video.py

from moviepy import afx

bgm_clip = AudioFileClip(bgm_file).with_effects([
    afx.MultiplyVolume(params.bgm_volume),
    afx.AudioFadeOut(3),  # 3-second fade out at end
    afx.AudioLoop(duration=video_clip.duration),
])
```

**Source:** [vendor/video-processing/moviepy/moviepy/audio/fx/AudioFadeIn.py](vendor/video-processing/moviepy/moviepy/audio/fx/AudioFadeIn.py)

### Solution 2: Audio Crossfade

**FFmpeg `acrossfade` filter:**

```bash
# 0.5-second crossfade between two clips
ffmpeg -i first.mp3 -i second.mp3 \
  -filter_complex "acrossfade=d=0.5:c1=tri:c2=tri" \
  output.mp3

# Without overlap (for gapless concatenation)
ffmpeg -i first.flac -i second.flac \
  -filter_complex "acrossfade=d=0.5:o=0:c1=exp:c2=exp" \
  output.flac

# Multiple inputs with crossfade
ffmpeg -i first.flac -i second.flac -i third.flac \
  -filter_complex "acrossfade=n=3:d=0.5" \
  output.flac
```

**Curve types:** `tri` (linear), `qsin`, `hsin`, `exp`, `log`, `par`, `cub`, `squ`, `cbr`

**Source:** [vendor/video-processing/ffmpeg/doc/filters.texi](vendor/video-processing/ffmpeg/doc/filters.texi#L572-L630)

### Solution 3: AAC Frame Alignment (Remotion's Approach)

**Problem:** AAC frames are 1024 samples. If segments don't align to frame boundaries, you get pops.

**Solution from Remotion:**

```typescript
// vendor/render/remotion/packages/renderer/src/combine-audio.ts

export const durationOf1Frame = (1024 / DEFAULT_SAMPLE_RATE) * 1_000_000;  // microseconds

export const getClosestAlignedTime = (targetTime: number) => {
  const decimalFramesToTargetTime = (targetTime * 1_000_000) / durationOf1Frame;
  const nearestFrameIndexForTargetTime = roundWithFix(decimalFramesToTargetTime);
  return (nearestFrameIndexForTargetTime * durationOf1Frame) / 1_000_000;
};

// Use inpoint/outpoint aligned to AAC frame boundaries
const fileList = files.map((p, i) => {
  const startTime = getClosestAlignedTime(i * chunkDurationInSeconds) * 1_000_000;
  const endTime = getClosestAlignedTime((i + 1) * chunkDurationInSeconds) * 1_000_000;
  
  // Add 4 frames of padding for priming samples, then trim precisely
  let inpoint = i > 0 ? durationOf1Frame * 4 : 0;
  const outpoint = (i === 0 ? durationOf1Frame * 2 : inpoint) + realDuration - (isLast ? 0 : durationOf1Frame);
  
  return [`file '${p}'`, `inpoint ${inpoint}us`, `outpoint ${outpoint}us`].join('\n');
}).join('\n');
```

### Solution 4: Short Micro-Fades at Cut Points

```bash
# Apply 10ms fade at start and end of each segment before concat
ffmpeg -i segment.mp4 -af "afade=t=in:d=0.01,afade=t=out:st=-0.01:d=0.01" segment_fixed.mp4
```

---

## 3. Re-encoding Trade-offs

### When Re-encoding is Required

| Situation | Re-encode Required? |
|-----------|---------------------|
| Different codecs (H.264 + H.265) | ✅ Yes |
| Different resolutions | ✅ Yes |
| Different frame rates | ✅ Yes |
| Different pixel formats | ✅ Yes |
| Adding transitions/effects | ✅ Yes |
| Same parameters, different files | ❌ No |

### Quality vs Speed Presets

**H.264 encoding presets (fastest → slowest, lowest quality → highest):**

```bash
# Fastest (live streaming)
ffmpeg -i input.mp4 -c:v libx264 -preset ultrafast -crf 23 output.mp4

# Balanced (recommended for short videos)
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 output.mp4

# Highest quality (final delivery)
ffmpeg -i input.mp4 -c:v libx264 -preset veryslow -crf 18 output.mp4
```

**CRF values:** 18 (high quality) → 23 (default) → 28 (lower quality, smaller file)

**From ShortGPT's core engine:**

```python
# vendor/ShortGPT/shortGPT/editing_framework/core_editing_engine.py

video.write_videofile(
    output_file, 
    threads=threads,
    codec='libx264', 
    audio_codec='aac', 
    fps=25, 
    preset='veryfast'  # Balance for short video rendering
)
```

**From VideoShortsCreator-Gemini:**

```python
# vendor/VideoShortsCreator-Gemini/video_editing.py

command.extend([
    "-c:v", "libx264", 
    "-preset", "medium",  # Good balance
    "-crf", "23",         # Reasonable quality
    "-c:a", "aac", 
    "-b:a", "192k",
])
```

### Hardware Acceleration Options

```bash
# NVIDIA NVENC (much faster, slightly lower quality)
ffmpeg -i input.mp4 -c:v h264_nvenc -preset fast -crf 23 output.mp4

# Intel Quick Sync
ffmpeg -i input.mp4 -c:v h264_qsv -preset fast output.mp4

# Apple VideoToolbox
ffmpeg -i input.mp4 -c:v h264_videotoolbox -q:v 65 output.mp4
```

**Remotion's hardware acceleration detection:**

```typescript
// vendor/render/remotion/packages/renderer/src/ffmpeg-args.ts

const {encoderName, hardwareAccelerated} = getCodecName({
  codec,
  hardwareAcceleration,  // 'if-possible' | 'required' | 'disabled'
  ...
});
```

---

## 4. Matching Video Parameters

### Critical Parameters to Match

| Parameter | Why It Matters | How to Check |
|-----------|---------------|--------------|
| **Resolution** | Different sizes can't concat | `ffprobe -v error -select_streams v:0 -show_entries stream=width,height` |
| **Frame Rate** | Causes timing issues | `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate` |
| **Pixel Format** | Color space mismatch | `ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt` |
| **Codec** | Different containers | `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name` |
| **Audio Sample Rate** | Audio sync issues | `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate` |
| **Audio Channels** | Mono/stereo mismatch | `ffprobe -v error -select_streams a:0 -show_entries stream=channels` |

### Normalization Before Concatenation

**MoneyPrinterTurbo's approach (resize to target):**

```python
# vendor/MoneyPrinterTurbo/app/services/video.py

clip = VideoFileClip(video_path).subclipped(start_time, end_time)
clip_w, clip_h = clip.size

if clip_w != video_width or clip_h != video_height:
    clip_ratio = clip.w / clip.h
    video_ratio = video_width / video_height
    
    if clip_ratio == video_ratio:
        # Same aspect ratio - simple resize
        clip = clip.resized(new_size=(video_width, video_height))
    else:
        # Different aspect ratio - scale and pad with black
        if clip_ratio > video_ratio:
            scale_factor = video_width / clip_w
        else:
            scale_factor = video_height / clip_h
        
        new_width = int(clip_w * scale_factor)
        new_height = int(clip_h * scale_factor)
        
        background = ColorClip(size=(video_width, video_height), color=(0, 0, 0))
        clip_resized = clip.resized(new_size=(new_width, new_height)).with_position("center")
        clip = CompositeVideoClip([background, clip_resized])
```

**FFmpeg normalization:**

```bash
# Normalize all inputs to 1080x1920 @ 30fps with padding
ffmpeg -i input.mp4 -vf \
  "scale=1080:1920:force_original_aspect_ratio=decrease,\
   pad=1080:1920:-1:-1:color=black,\
   fps=30,\
   format=yuv420p" \
  -c:v libx264 -c:a aac -ar 48000 -ac 2 \
  normalized.mp4
```

**Complete normalization pipeline for short videos:**

```bash
#!/bin/bash
# normalize_video.sh - Prepare video for concatenation

INPUT="$1"
OUTPUT="$2"

ffmpeg -i "$INPUT" \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -ar 48000 -ac 2 -b:a 192k \
  -movflags +faststart \
  "$OUTPUT"
```

---

## 5. Timestamp Preservation

### Timestamp Issues During Concatenation

1. **Discontinuous timestamps** → Playback stuttering
2. **Negative timestamps** → Player confusion
3. **Non-monotonic DTS** → Muxer errors

### Solution 1: Reset Timestamps (Most Common)

```bash
# Force timestamps to start at 0 for each segment
ffmpeg -i input.mp4 -fflags +genpts -c copy output.mp4
```

### Solution 2: Concat Demuxer Auto-Adjustment

The concat demuxer **automatically adjusts timestamps** so each file starts where the previous one ended:

> "The timestamps in the files are adjusted so that the first file starts at 0 and each next file starts where the previous one finishes."

**Source:** [vendor/video-processing/ffmpeg/doc/demuxers.texi](vendor/video-processing/ffmpeg/doc/demuxers.texi#L64-L80)

### Solution 3: Explicit Duration Control

```bash
# Use duration directive if file metadata is inaccurate
cat > filelist.txt << EOF
file 'clip1.mp4'
duration 5.0
file 'clip2.mp4'
duration 3.5
file 'clip3.mp4'
EOF

ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

### Solution 4: Avoid Seek/Segment Artifacts with Keyframes

```bash
# When cutting, seek to keyframe first to avoid artifacts
ffmpeg -ss 00:00:05 -i input.mp4 -t 10 -c:v libx264 -force_key_frames "expr:gte(t,n_forced*1)" output.mp4
```

### Remotion's Timestamp Handling

```typescript
// vendor/render/remotion/packages/renderer/src/ffmpeg-args.ts

// Apply a fixed timescale across all environments
['-video_track_timescale', '90000'],

// BT.709 color space (consistent across renders)
['-colorspace:v', 'bt709'],
['-color_primaries:v', 'bt709'],
['-color_trc:v', 'bt709'],
['-color_range', 'tv'],
```

---

## 6. Complete Workflow Examples

### Example 1: Concatenate Pre-Normalized Clips (Fastest)

```bash
#!/bin/bash
# concat_fast.sh - For pre-normalized identical clips

# Create file list
ls -1 clips/*.mp4 | sed "s/^/file '/" | sed "s/$/'/" > filelist.txt

# Concatenate without re-encoding
ffmpeg -f concat -safe 0 -i filelist.txt -c copy \
  -movflags +faststart output.mp4
```

### Example 2: Concatenate with Normalization (Safe)

```bash
#!/bin/bash
# concat_safe.sh - Handles different input formats

INPUTS=("$@")
TEMP_DIR=$(mktemp -d)

# Normalize each input
for i in "${!INPUTS[@]}"; do
  ffmpeg -i "${INPUTS[$i]}" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:black,fps=30,format=yuv420p" \
    -af "afade=t=in:d=0.02,afade=t=out:st=-0.02:d=0.02" \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -ar 48000 -ac 2 -b:a 192k \
    "$TEMP_DIR/clip_$i.mp4"
  echo "file '$TEMP_DIR/clip_$i.mp4'" >> "$TEMP_DIR/filelist.txt"
done

# Concatenate
ffmpeg -f concat -safe 0 -i "$TEMP_DIR/filelist.txt" -c copy \
  -movflags +faststart output.mp4

# Cleanup
rm -rf "$TEMP_DIR"
```

### Example 3: Concatenate with Crossfade

```bash
# Video crossfade between two clips (requires filter_complex)
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v]; \
   [0:a][1:a]acrossfade=d=0.5:c1=tri:c2=tri[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4
```

### Example 4: TypeScript Implementation (Node.js)

```typescript
// Based on vendor/short-video-maker-gyori patterns
import ffmpeg from "fluent-ffmpeg";
import { writeFileSync } from "fs";
import { join } from "path";

interface ConcatOptions {
  inputs: string[];
  output: string;
  normalize?: boolean;
  crossfade?: number;  // seconds
}

async function concatenateVideos(options: ConcatOptions): Promise<string> {
  const { inputs, output, normalize = false, crossfade = 0 } = options;
  
  if (!normalize && crossfade === 0) {
    // Fast path: concat demuxer
    const fileList = inputs.map(p => `file '${p}'`).join('\n');
    const listPath = join(__dirname, 'temp-filelist.txt');
    writeFileSync(listPath, fileList);
    
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
        .on('end', () => resolve(output))
        .on('error', reject)
        .save(output);
    });
  }
  
  // Slow path: re-encode with normalization
  // ... (implementation with filter_complex)
}
```

### Example 5: Python Implementation (MoviePy)

```python
# Based on vendor/MoneyPrinterTurbo patterns
from moviepy import VideoFileClip, concatenate_videoclips, CompositeVideoClip, ColorClip
from moviepy import afx

def concatenate_videos_safe(
    video_paths: list[str],
    output_path: str,
    target_width: int = 1080,
    target_height: int = 1920,
    fps: int = 30,
    fade_duration: float = 0.05
) -> str:
    """Concatenate videos with normalization and audio fade to prevent pops."""
    
    clips = []
    for path in video_paths:
        clip = VideoFileClip(path)
        
        # Resize to target dimensions with padding
        clip = resize_with_padding(clip, target_width, target_height)
        
        # Apply micro-fade to prevent audio pops
        if clip.audio:
            clip = clip.with_audio(
                clip.audio.with_effects([
                    afx.AudioFadeIn(fade_duration),
                    afx.AudioFadeOut(fade_duration)
                ])
            )
        
        clips.append(clip)
    
    # Concatenate using chain method (no re-compositing)
    final = concatenate_videoclips(clips, method="chain")
    
    # Write with optimized settings
    final.write_videofile(
        output_path,
        fps=fps,
        codec='libx264',
        audio_codec='aac',
        preset='medium',
        threads=4
    )
    
    # Cleanup
    for clip in clips:
        clip.close()
    final.close()
    
    return output_path


def resize_with_padding(clip, target_w, target_h):
    """Resize clip to target dimensions, adding black padding if needed."""
    clip_w, clip_h = clip.size
    
    if clip_w == target_w and clip_h == target_h:
        return clip
    
    clip_ratio = clip_w / clip_h
    target_ratio = target_w / target_h
    
    if clip_ratio > target_ratio:
        scale_factor = target_w / clip_w
    else:
        scale_factor = target_h / clip_h
    
    new_w = int(clip_w * scale_factor)
    new_h = int(clip_h * scale_factor)
    
    resized = clip.resized(new_size=(new_w, new_h))
    background = ColorClip(
        size=(target_w, target_h), 
        color=(0, 0, 0)
    ).with_duration(clip.duration)
    
    return CompositeVideoClip([
        background,
        resized.with_position("center")
    ])
```

---

## 7. Summary: Best Practices for Short Videos

1. **Pre-normalize all clips** to identical parameters before concatenation
2. **Use concat demuxer** (`-f concat`) for speed when possible
3. **Apply 20-50ms audio fades** at cut points to prevent pops
4. **Align AAC audio** to 1024-sample frame boundaries
5. **Force keyframes** at segment boundaries for clean cuts
6. **Use `medium` preset** with CRF 23 for balanced quality/speed
7. **Add `-movflags +faststart`** for web playback optimization
8. **Maintain consistent color space** (BT.709 for web)

### Quick Reference Commands

```bash
# Check video parameters
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -of csv input.mp4

# Normalize single clip for shorts (1080x1920 @ 30fps)
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1:black,fps=30" -af "afade=t=in:d=0.02,afade=t=out:st=-0.02:d=0.02" -c:v libx264 -preset medium -crf 23 -c:a aac -ar 48000 normalized.mp4

# Fast concat (pre-normalized clips)
ffmpeg -f concat -safe 0 -i filelist.txt -c copy -movflags +faststart output.mp4

# Safe concat with re-encode
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac output.mp4
```

---

## References

- [vendor/render/remotion/packages/renderer/src/combine-audio.ts](vendor/render/remotion/packages/renderer/src/combine-audio.ts) - Seamless AAC concatenation
- [vendor/render/remotion/packages/renderer/src/combine-video-streams.ts](vendor/render/remotion/packages/renderer/src/combine-video-streams.ts) - Video concat demuxer usage
- [vendor/MoneyPrinterTurbo/app/services/video.py](vendor/MoneyPrinterTurbo/app/services/video.py) - MoviePy concatenation with resize
- [vendor/video-processing/moviepy/moviepy/video/compositing/CompositeVideoClip.py](vendor/video-processing/moviepy/moviepy/video/compositing/CompositeVideoClip.py) - `concatenate_videoclips()` implementation
- [vendor/video-processing/ffmpeg/doc/demuxers.texi](vendor/video-processing/ffmpeg/doc/demuxers.texi) - Concat demuxer documentation
- [vendor/video-processing/ffmpeg/doc/filters.texi](vendor/video-processing/ffmpeg/doc/filters.texi) - Concat filter, afade, acrossfade
- [vendor/VideoShortsCreator-Gemini/video_editing.py](vendor/VideoShortsCreator-Gemini/video_editing.py) - FFmpeg subprocess commands
