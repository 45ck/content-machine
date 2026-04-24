---
name: boundary-snap
description: Snap selected highlight candidate boundaries to nearby sentence or pause boundaries before clipping.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"candidatesPath":"output/content-machine/highlights/highlight-candidates.v1.json","timestampsPath":"output/content-machine/audio/timestamps.json","outputPath":"output/content-machine/highlights/boundary-snap.v1.json"}'
entrypoint: node --import tsx scripts/harness/boundary-snap.ts
inputs:
  - name: candidatesPath
    description: Path to highlight-candidates.v1.json.
    required: true
  - name: timestampsPath
    description: Word-level timestamp artifact used to locate nearby natural boundaries.
    required: true
  - name: outputPath
    description: Path that will receive boundary-snap.v1.json.
    required: false
outputs:
  - name: boundary-snap.v1.json
    description: Candidate clip boundaries adjusted to nearby sentence, pause, source, or duration limits.
---

# Boundary Snap

## Use When

- A candidate span is promising but may start or end mid-thought.
- The next tool will cut media and needs exact boundaries.
- You want deterministic local timing cleanup before rendering.

## Invocation

```bash
cat skills/boundary-snap/examples/request.json | \
  node --import tsx scripts/harness/boundary-snap.ts
```

## Output Contract

- Reads `highlight-candidates.v1.json` and `timestamps.json`.
- Writes `boundary-snap.v1.json`.
- Each candidate includes original and snapped start/end times plus
  reasons for the adjustment.

## Validation Checklist

- Snapped boundaries stay within the source timestamps.
- Duration limits remain respected after snapping.
- Reasons explain why each boundary changed or was retained.
