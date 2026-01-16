# Guide: Demo media for the README (20260111)

This guide documents a lightweight workflow for adding demo videos to `README.md`
in a way that stays friendly to open-source contributors and repo size.

## Constraints (GitHub README)

- GitHub Markdown does not reliably inline-play `mp4` in READMEs.
- Animated images (`gif`, `webp`) render reliably, but can bloat the repo if not kept small.

## Recommended setup

1. **Generate a real output video** (`mp4`) using `cm generate`.
2. **Host the full video** outside the README:
   - GitHub Releases (preferred for open source)
   - YouTube/Vimeo (preferred for discoverability)
3. **Create a small README preview** (GIF or WebP) under `assets/demo/`.
4. **Link the preview** in `README.md` to the full hosted `mp4`.

## Example: create a GIF preview (ffmpeg)

Prereq: `ffmpeg` installed.

```bash
./scripts/make-demo-gif.sh output/video.mp4 assets/demo/demo.gif
```

If the output is too large:

- shorten the time window (`-t`)
- reduce FPS (`-r`)
- reduce scale (`scale=...`)

## What to include in a good demo

- 5–15 seconds showing captions + visuals + pacing
- One example for a “stock footage” flow and one for a “bring your own assets” flow
- A note about which providers were used (so contributors can reproduce it)

## Gameplay footage note

For “Subway Surfers / Minecraft parkour” style split-screen, contributors must supply their own
gameplay clips with appropriate rights under `~/.cm/assets/gameplay/<style>/`.

This project does not ship or endorse downloading copyrighted gameplay footage.

Linux helper (bring-your-own URLs or local files):

```bash
./scripts/download-gameplay.sh --style subway-surfers --file /path/to/your-clip.mp4
```
