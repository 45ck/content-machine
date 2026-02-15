# guide-generation-times-20260110

Reference timings for the CLI pipeline so you can set expectations and track regressions.

## When to use this

- You want a quick sense of how long `cm generate` or `cm render` should take on your machine.
- You need a baseline before making performance changes.

## Prerequisites

- `cm` CLI available (`npm run cm -- ...`).
- A sample pipeline output (audio/timestamps/visuals) or a topic to generate.

## Steps

1. Pick a representative input (duration, template, gameplay).
2. Time the command from start to finish.
3. Record the duration + machine details (CPU/GPU, RAM).
4. Re-run after changes to compare.

## Examples

```bash
# PowerShell: time a render
Measure-Command {
  $env:REMOTION_LOG_LEVEL='verbose'
  .\node_modules\.bin\tsx src\cli\index.ts --verbose render --input output\gameplay-subway\visuals.json --audio output\standard\audio.wav --timestamps output\standard\timestamps.json --output output\gameplay-subway\video.mp4 --template brainrot-split-gameplay
}
```

## Baseline (2026-01-10, local dev machine)

- Split-screen render (27s, captions + gameplay): ~5-11 minutes end-to-end.
- Longer scripts or heavy stock footage downloads will increase time.

## Troubleshooting

- **Symptom:** Render seems stuck at 20% for a long time.
  - **Fix:** Remotion bundling can take several minutes; keep verbose logs on to confirm progress.
- **Symptom:** Render stalls mid-way with decode errors.
  - **Fix:** Try local fallback visuals or re-encode heavy clips.

## Related

- `docs/dev/architecture/IMPL-PHASE-4-RENDER-20260105.md`
