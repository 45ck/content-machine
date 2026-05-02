# Procedural Gameplay Backgrounds

Status: `skill-backed; experimental preview`

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

- `demo-20` is an experimental preview: `720x1280`, `24fps`, H.264/AAC.
- The current demo-video audit intentionally flags it with
  `error:wrong-resolution`; see
  [`experiments/video-quality-review-demo`](../../../experiments/video-quality-review-demo/README.md).
- Use it to explain the direction, not as the final quality bar.
- A promoted version should render at `1080x1920`, include contact-sheet
  review, and pass the demo-video and publish-prep gates.
- Keep JavaScript/Three.js code inside trusted templates until the repo
  has a first-party 3D render path with tests.
