# guide-video-templates-20260107

Use video templates ("render templates") to quickly switch between different viral short-form video formats (e.g. split-screen Subway Surfers, full-screen captions, audiograms) without retyping a pile of CLI flags.

## When to use this

- You want a one-flag switch between video layouts/styles.
- You want reusable caption/theme defaults across many videos.
- You want to package a format (JSON + assets) and share it with teammates.

## Concepts (quick)

- **Archetype**: affects _script structure + pacing_ (listicle/versus/howto/etc).
- **Template**: affects _render layout + default styling + asset slots_ (split-screen gameplay, audiogram, etc).
- **Caption preset**: a reusable caption style (`tiktok|youtube|reels|bold|minimal|neon`).

## Use a built-in template (proposed UX)

```bash
cm generate "Redis vs Postgres" --archetype versus --template tiktok-captions -o out/video.mp4
cm generate "5 JS tips" --archetype listicle --template brainrot-split-gameplay -o out/video.mp4
```

For render-only:

```bash
cm render -i out/visuals.json --audio out/audio.wav --timestamps out/timestamps.json \
  --template brainrot-split-gameplay -o out/video.mp4
```

## Create a local template (data-only)

1. Create a folder:

```
my-template/
├── template.json
└── assets/
```

2. Start with a minimal `template.json`:

```json
{
  "schemaVersion": "1.0.0",
  "id": "my-template",
  "name": "My Template",
  "compositionId": "ShortVideo",
  "defaults": { "captionPreset": "tiktok", "orientation": "portrait", "fps": 30 }
}
```

3. Use it by path:

```bash
cm render -i visuals.json --audio audio.wav --timestamps timestamps.json \
  --template ./my-template/template.json -o out/video.mp4
```

## Add gameplay backgrounds (Subway Surfers / Minecraft parkour)

Keep gameplay clips outside the repo (copyright compliance). Use the asset library convention:

```
~/.cm/assets/gameplay/
├── subway-surfers/
│   ├── clip-001.mp4
│   └── clip-002.mp4
└── minecraft-parkour/
    └── clip-001.mp4
```

Then point your template at the library:

```json
{
  "assets": {
    "gameplay": { "library": "~/.cm/assets/gameplay", "style": "subway-surfers" }
  }
}
```

## Overriding template defaults (today vs future)

Today, you can override caption look using existing render flags:

```bash
cm render ... --caption-preset neon --caption-font-size 96 --caption-position center
```

Future (recommended) design:

- `--set template.params.splitScreenRatio=0.6`
- `--set template.assets.gameplay.style=subway-surfers`

## Sharing templates (zip packs)

Recommended pack format:

- Zip the template folder (with `template.json` at the root of that folder)
- Name it like `brainrot-split-gameplay.cmtemplate.zip`
- Install to user templates:

```bash
cm templates install brainrot-split-gameplay.cmtemplate.zip
cm templates list
```

## Related

- `docs/features/feature-video-templates-20260107.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/architecture/SYSTEM-DESIGN-20260104.md`
