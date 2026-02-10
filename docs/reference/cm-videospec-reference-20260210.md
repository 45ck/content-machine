# `cm videospec` Reference (20260210)

Reverse-engineer an existing short-form video (TikTok/Reels/Shorts) into a structured `VideoSpec.v1` JSON.

This is intended for:

- analyzing editing structure (shots + pacing)
- extracting burned-in captions via OCR
- extracting transcript via local Whisper.cpp (if installed)
- generating a narrative arc summary (heuristic or optional LLM)

Related docs:

- Schema: `src/videospec/schema.ts`
- Spec/design: `docs/specs/videospec-v1-reverse-engineering-20260210.md`
- Implementation: `docs/architecture/IMPL-VIDEOSPEC-ANALYZER-20260210.md`

## Basic

```bash
cm videospec -i input.mp4 -o output/videospec.v1.json
```

Analyze a URL (download then analyze):

```bash
cm videospec -i https://www.youtube.com/shorts/Q7lELlgg6zQ -o output/videospec.v1.json
```

## Dependencies

Required for a useful run:

- `ffprobe` (video probing)
- `ffmpeg` (frame/audio extraction)

Optional (best-effort):

- Python + `PySceneDetect` (better shot detection; otherwise falls back to ffmpeg)
- Local Whisper.cpp assets (ASR transcript; otherwise omitted)
- LLM provider/API key (only when using `--narrative llm`)
- `yt-dlp` for URL inputs (or set `CM_YTDLP_PATH=/abs/path/to/yt-dlp`)

## Options

- `-i, --input <path>`: input video path or URL (required)
- `-o, --output <path>`: output JSON (default: `videospec.v1.json`)
- `--pass <1|2|both>`: analysis pass (default: `1`)
- `--no-cache`: disable module caching
- `--cache-dir <path>`: override cache directory (or set `$CM_VIDEOSPEC_CACHE_DIR`)
- `--max-seconds <n>`: analyze only first N seconds (dev/fast)
- `--shot-detector <auto|pyscenedetect|ffmpeg>`: shot detection mode (default: `auto`)
- `--shot-threshold <n>`: PySceneDetect threshold (default: `30`)
- `--no-ocr`: disable OCR
- `--ocr-fps <n>`: OCR sampling rate (frames per second)
- `--no-inserted-content`: disable inserted content block extraction (screenshots/pages embedded in the video)
- `--no-asr`: disable ASR
- `--asr-model <tiny|base|small|medium|large>`: Whisper model (default: `base`)
- `--narrative <heuristic|llm|off>`: narrative arc mode (default: `heuristic`)

## Examples

Fast structure-only (shots + pacing, no OCR/ASR):

```bash
cm videospec -i input.mp4 -o videospec.v1.json --no-ocr --no-asr --narrative off
```

Force shot detector engine:

```bash
cm videospec -i input.mp4 -o videospec.v1.json --shot-detector ffmpeg
```

Refine OCR sampling:

```bash
cm videospec -i input.mp4 -o videospec.v1.json --pass both
```

## Output

`cm videospec` writes a single JSON artifact conforming to `VideoSpec.v1`.

When detected, embedded screenshot/page segments are emitted as `inserted_content_blocks` (time ranges, region, and best-effort OCR text).

In non-JSON CLI mode, stdout prints only the output path (for piping in scripts).

## Caching

By default, `cm videospec` caches intermediate module outputs per input file under a cache root:

- default: `.cache/content-machine/videospec` (relative to CWD)
- override: `--cache-dir` or `$CM_VIDEOSPEC_CACHE_DIR`
- disable: `--no-cache`

Cache artifacts include shot cut times, OCR segments, transcript segments, editing effects, and audio structure heuristics. The exact filenames are documented in `docs/architecture/IMPL-VIDEOSPEC-ANALYZER-20260210.md`.

URL inputs are downloaded under the cache root:

- `<cacheRoot>/downloads/<sha256(url)>.mp4`

When you run with `--no-cache`, URL inputs are downloaded to a temporary file for analysis and then cleaned up after the command completes.

## Provenance

Every output includes:

- `provenance.modules`: a module-by-module map of which engine ran (or `cache|disabled|unavailable|no-audio`)
- `provenance.notes` (optional): fallbacks and performance limits

When a module cannot run, `cm videospec` prefers to emit a valid `VideoSpec.v1` with that module omitted and provenance recorded, rather than failing the entire run.

## Troubleshooting

- Shot detection is slow or fails:
  - Use `--shot-detector ffmpeg` to skip PySceneDetect.
  - Use `--max-seconds <n>` to limit work during debugging.
- Transcript is empty:
  - Whisper is optional; if local Whisper.cpp is missing, ASR is omitted with provenance notes.
  - Ensure the input actually has an audio stream.
- OCR results are noisy:
  - Use `--pass both` to prefer the refine OCR sampling when it yields segments.
  - Increase `--ocr-fps` carefully; OCR cost scales roughly linearly with FPS.
