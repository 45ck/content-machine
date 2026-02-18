# Complex Plane Rotation (Gameplay Bottom + Drawn Diagrams Top)

This example renders a short vertical video where the bottom half is looping gameplay and the top
half is a fully drawn (Remotion) complex-plane diagram that rotates a vector to demonstrate:

`(x, y) -> (-y, x)` (multiply by `i` = rotate 90 degrees CCW).

It is designed to be offline-friendly:

- `cm audio --mock` generates placeholder audio + word timestamps
- `cm visuals --mock` generates fallback visuals + selects a gameplay clip
- `cm render` uses a code template (Remotion) to draw the diagram on top

## Prereqs

- A gameplay clip (any MP4) available either:
  - as a direct path passed to `cm visuals --gameplay <path>`, or
  - inside the gameplay library: `~/.cm/assets/gameplay/subway-surfers/` (recommended)

## Run

```powershell
$out = "output/examples/complex-plane-rotation"
mkdir $out -Force | Out-Null

# 1) Generate mock audio + timestamps from the example script
cm audio --mock `
  --input examples/complex-plane-rotation/script.json `
  --output "$out/audio.wav" `
  --timestamps "$out/timestamps.json"

# 2) Generate mock visuals and select a gameplay clip (no API keys)
cm visuals --mock `
  --input "$out/timestamps.json" `
  --gameplay-style subway-surfers `
  --output "$out/visuals.json"

# 3) Render using the example code template (Remotion)
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

If you prefer a single gameplay file:

```powershell
cm visuals --mock --input "$out/timestamps.json" --gameplay "D:\\path\\to\\gameplay.mp4" --output "$out/visuals.json"
```

## Notes

- The complex-plane animation timing is controlled by `template.json -> params.diagram.*`.
- This template intentionally uses no extra npm deps (no KaTeX yet) so it renders without installing template deps.
