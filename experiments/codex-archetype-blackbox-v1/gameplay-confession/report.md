# Gameplay Confession Result

Outcome:

- Codex, running in a fresh project with the installed local pack,
  produced a real MP4 at `project/outputs/final/video.mp4`.
- The packaged `video-render` path worked once the render request
  included an explicit cached-browser override.
- `publish-prep` completed and emitted a real review bundle.

What passed:

- real audio
- real moving video
- portrait `1080x1920` H.264/AAC output
- package-native caption sidecars and render metadata

What failed:

- `cadence`: detected `0` cuts
- `caption-sync`: median drift `1131ms`, P95 drift `2729ms`

Why this lane matters:

- it proves the installed pack can finish a blackbox fresh-project run
  with local MP4 inputs
- it also proves the current review stack still catches real problems in
  the result instead of auto-passing it
