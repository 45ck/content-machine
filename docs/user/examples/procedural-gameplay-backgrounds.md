# Procedural Gameplay Backgrounds

Status: `supporting showcase candidate`

Use this when a short needs gameplay-like retention motion, but the
user did not provide rights-cleared gameplay footage. The output should
be a caption-clean background or gameplay lane that can be reused by the
normal render stack.

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-20-content-machine-3d-runner.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-20-content-machine-3d-runner.gif" alt="Procedural 3D gameplay runner preview" width="240" />
  </a>
</p>

## What It Shows

- 3D/procedural motion can be generated as a background rail.
- The gameplay layer is additive; it does not replace the story,
  captions, cards, stock clips, source media, or review gates.
- A normal MP4 is still the safest interchange format for existing
  `gameplayClip` and split-screen render paths.
- External models, textures, or clips need source and license notes
  before any public promotion.

## Skill

Start with
[`procedural-gameplay-backgrounds`](../../../skills/procedural-gameplay-backgrounds/SKILL.md).

The example request lives at
[`skills/procedural-gameplay-backgrounds/examples/request.json`](../../../skills/procedural-gameplay-backgrounds/examples/request.json).

## Example Request Shape

```json
{
  "style": "low-poly-3d-runner",
  "duration": 18,
  "fps": 30,
  "resolution": {
    "width": 1080,
    "height": 1920
  },
  "layout": "full-screen-background",
  "sourcePolicy": "code-native-original"
}
```

## Promotion Notes

- `demo-20` is a supporting showcase: `1080x1920`, `24fps`, H.264/AAC,
  and `31s`.
- The current demo-video audit passes it with no automated issues; see
  [`experiments/video-quality-review-demo`](../../../experiments/video-quality-review-demo/README.md).
- Publish-prep also passes for the tracked script, MP4, and asset
  ledger under
  [`docs/demo/provenance/demo-20-content-machine-3d-runner`](../../demo/provenance/demo-20-content-machine-3d-runner/asset-ledger.json).
- Use it to prove the direction, but keep it additive: the chosen short
  archetype still owns the story, captions, and review gates.
- Keep JavaScript/Three.js code inside trusted templates until the repo
  has a first-party 3D render path with tests.
