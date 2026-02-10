# `cm videospec` Reference (20260210)

Reverse-engineer an existing short-form video (TikTok/Reels/Shorts) into a structured `VideoSpec.v1` JSON.

This is intended for:

- analyzing editing structure (shots + pacing)
- extracting burned-in captions via OCR
- extracting transcript via local Whisper.cpp (if installed)
- generating a narrative arc summary (heuristic or optional LLM)

## Basic

```bash
cm videospec -i input.mp4 -o output/videospec.v1.json
```

## Options

- `-i, --input <path>`: input video path (required)
- `-o, --output <path>`: output JSON (default: `videospec.v1.json`)
- `--pass <1|2|both>`: analysis pass (default: `1`)
- `--no-cache`: disable module caching
- `--cache-dir <path>`: override cache directory (or set `$CM_VIDEOSPEC_CACHE_DIR`)
- `--max-seconds <n>`: analyze only first N seconds (dev/fast)
- `--shot-detector <auto|pyscenedetect|ffmpeg>`: shot detection mode (default: `auto`)
- `--shot-threshold <n>`: PySceneDetect threshold (default: `30`)
- `--no-ocr`: disable OCR
- `--ocr-fps <n>`: OCR sampling rate (frames per second)
- `--no-asr`: disable ASR
- `--asr-model <tiny|base|small|medium|large>`: Whisper model (default: `base`)
- `--narrative <heuristic|llm|off>`: narrative arc mode (default: `heuristic`)

## Output

`cm videospec` writes a single JSON artifact conforming to `VideoSpec.v1`.

In non-JSON CLI mode, stdout prints only the output path (for piping in scripts).
