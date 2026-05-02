---
name: creative-source-scout
description: Use when brainstorming, selecting, or verifying external creative websites for content-machine videos, including animation/component libraries, design inspiration, stock media, 3D models/textures, AI image/video tools, music/SFX, fonts, icons, and other source assets.
---

# Creative Source Scout

## Use When

- The user asks for sites like `21st.dev`, animation libraries, UI
  component sources, 3D assets, stock media, AI video tools, music, SFX,
  fonts, icons, or broader creative resource discovery.
- A short needs stronger visuals and the agent should scout outside
  inspiration or asset sources before coding or rendering.
- A skill needs a source list but should not pretend that discovery is
  the same thing as license approval.

## Core Rule

Site discovery is not license approval. Treat every catalog entry as a
candidate until its current terms, watermark rules, attribution needs,
pricing, and download rights are checked.

## Catalog

Use `references/creative-source-catalog.v1.json` for a broad
`1000`-site candidate brainstorm. The catalog is intentionally raw and
wide so agents can filter by category instead of relying on memory.

Regenerate or check it with:

```bash
npm run creative-sources:gen
npm run creative-sources:check
```

## Workflow

1. Choose the production need first:
   `ui-components`, `animation-motion`, `3d-assets`, `game-dev-assets`,
   `ai-generation`, `visual-assets`, `audio-music`, `fonts-icons`,
   `inspiration`, `creative-coding`, or `design-tools`.
2. Filter the catalog to `5-12` plausible candidates for the task.
3. Browse the official site or license page before using anything in a
   public render.
4. Prefer code-native inspiration when licenses are unclear: study the
   pattern, then rebuild an original Remotion/SVG/HTML/Three.js version.
5. For copied or downloaded assets, record source URL, author/provider,
   license, attribution text, retrieval date, transforms, and output
   path in the run's asset ledger or source notes.
6. Hand off to the relevant production skill:
   `motion-design-coder`, `procedural-gameplay-backgrounds`,
   `short-form-production-playbook`, `video-render`, or
   `publish-prep-review`.

## Deep References

- Do not open deep policy refs for a brainstorm-only shortlist.
- Open provenance gates before copying, downloading, generating,
  packaging, or public use.
- Open audio policy only for music, SFX, ambience, extracted audio, or
  YouTube-origin audio.
- Use [creative-technique-map.md](references/creative-technique-map.md)
  when converting source-site research into concrete short-form motion,
  3D, AI-video, stock, audio, font, icon, or creative-coding tactics.
- Use
  [provenance-and-license-gates.md](references/provenance-and-license-gates.md)
  before copying, downloading, packaging, or publishing external assets.
- Use [audio-source-policy.md](references/audio-source-policy.md) when
  scouting royalty-free, open-licensed, SFX, music, or YouTube-origin
  audio.

## Handoff Contract

Return this shape before downstream work uses any source:

- `selectedSource`: site, component, model, track, font, or provider URL
- `usageMode`: `inspiration-only`, `code-native-rebuild`,
  `downloaded-asset`, `generated-asset`, or `reference-provider`
- `licenseStatus`: `verified`, `needs-review`, or `rejected`
- `attribution`: author, title, license, license URL, and source URL
- `policyRoute`: quick map, provenance gate, audio policy, or none
- `evidencePath`: source notes, license file, certificate, or review
  bundle path when known
- `nextGate`: source-media review, media-index, video-render, or
  publish-prep-review
- `fallback`: safest original/local alternative if rights are unclear
- `downstreamSkill`: target skill and why it should receive this source

## High-Leverage Buckets

- **Animation/UI**: use for hook cards, explainer overlays, product UI
  demos, and landing-page-style motion.
- **3D/game assets**: use for rights-cleared gameplay-like loops,
  props, characters, materials, and environment references.
- **Stock/visual assets**: use for B-roll, icons, illustrations,
  mockups, texture layers, and visual metaphors.
- **AI generation**: use for providers, APIs, model references, and
  experimental visual lanes when deterministic local assets are not
  enough.
- **Audio/music**: use for SFX, music beds, voice references, and
  platform-native sound texture; route exact asset choices through the
  audio source policy before direct use.
- **Inspiration/creative coding**: use for style direction, not as
  copy-paste permission.

## Hard Blocks

- Do not use a catalog entry as proof that the asset is free or safe.
- Do not copy a published component, model, track, or clip into this
  repo without a license and attribution note.
- Do not use watermarked previews in public demos.
- Do not rip arbitrary YouTube audio or treat “no copyright” uploads as
  rights evidence.
- Do not add paid or gated assets as required defaults.
- Do not replace the chosen content lane just because a source site has
  a cool asset.

## Output Expectations

When advising, return:

- category selected
- shortlist of candidate sites
- why each site fits the current video
- license/current-availability checks still required
- safest fallback if rights are unclear

When executing, produce:

- source shortlist or selected asset notes
- asset ledger entries for anything copied or downloaded
- original code-native recreations when assets are not clearly reusable
- review notes for watermark, attribution, and safe-zone risk

## Validation Checklist

- The selected sites match the actual short-form lane.
- Current terms were checked before any asset was copied.
- Source and attribution notes exist for every external asset.
- The final render has no unexpected watermark or burned-in source text.
- External inspiration was rebuilt as original work when rights were
  ambiguous.
