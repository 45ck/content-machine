# Complex Plane Rotation (Drawn Diagrams + Gameplay)

This example demonstrates a **code template** that draws a complex plane diagram in Remotion (top half),
while looping gameplay in the bottom half.

It is intended to be:

- **offline-friendly** (uses `--mock` for audio + visuals),
- **repo-friendly** (ships as a self-contained example under `examples/`),
- a clean baseline for adding **KaTeX/LaTeX equation rendering** later.

## Files

- `examples/complex-plane-rotation/script.json`
- `examples/complex-plane-rotation/template/template.json`

## Steps

1) Put a gameplay MP4 in your gameplay library:

`~/.cm/assets/gameplay/subway-surfers/<any>.mp4`

2) Run:

```powershell
$out = "output/examples/complex-plane-rotation"
mkdir $out -Force | Out-Null

cm audio --mock `
  --input examples/complex-plane-rotation/script.json `
  --output "$out/audio.wav" `
  --timestamps "$out/timestamps.json"

cm visuals --mock `
  --input "$out/timestamps.json" `
  --gameplay-style subway-surfers `
  --output "$out/visuals.json"

cm render `
  --input "$out/visuals.json" `
  --timestamps "$out/timestamps.json" `
  --audio "$out/audio.wav" `
  --template examples/complex-plane-rotation/template/template.json `
  --allow-template-code `
  --template-deps never `
  --no-hook `
  --output "$out/video.mp4"
```

## Customize

- Split-screen layout is configured in `examples/complex-plane-rotation/template/template.json` via:
  - `params.splitScreenRatio`
  - `params.contentPosition`
  - `params.gameplayPosition`
- Diagram values and timing are configured via:
  - `params.diagram.x`
  - `params.diagram.y`
  - `params.diagram.rotationStartSec`
  - `params.diagram.rotationEndSec`
