# Caption And Export Primitives

Date: 2026-04-29
Archetype: shared caption, crop, and export infrastructure
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

Every archetype depends on the same primitives: speech timestamps, readable
captions, safe-zone-aware overlay layout, crop/reframe rules, audio loudness,
and platform-specific encoding.

## How Repos Make It

`AgriciDaniel/claude-shorts` provides the cleanest practical spec: word-level
caption styles, safe-zone export profiles, Remotion bundle-once-render-many,
CSS reframing with `OffthreadVideo`, and dynamic duration through
`calculateMetadata`.

The ASR/subtitle repos in the curated corpus provide the technical base:
`faster-whisper` for speed, `whisperX` and `whisper-timestamped` for word
timing, `stable-ts` for timestamp stabilization, `ffsubsync`/`alass` for
alignment, and `libass`/`SubtitleEdit` for subtitle rendering references.

## Shared Primitive Checklist

- 1080x1920 composition by default.
- Word-level timestamp source recorded in artifacts.
- Caption preset selected by lane and platform.
- Hook overlay and captions checked for overlap.
- Bottom and right safe zones cleared for platform chrome.
- Audio normalized during final export.
- MP4 uses H.264/AAC/yuv420p with faststart.
- Crop/reframe plan stored as data, not only baked into video.

## Asset Strategy

Caption/export assets are mostly fonts, style recipes, ASS/SRT files, crop
plans, and export commands. The copied research bundle includes platform and
caption specs from `claude-shorts`; those should inform local presets but not
replace the repo's existing render/caption modules wholesale.

## What To Pull Into content-machine

- Keep platform export profiles in one shared reference.
- Add per-lane caption defaults while preserving platform overrides.
- Make overlap/safe-zone checks part of publish prep review.
- Favor reusable caption JSON plus generated ASS/SRT over ad hoc burned-in
  text effects.
