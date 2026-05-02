# Creative Sources

Use this when scouting animation sites, component libraries, 3D assets,
stock media, audio, AI video tools, or design inspiration for shorts.

This is optional source scouting, not a quickstart prerequisite and not
license approval. For a first run, start with
[`AGENT-QUICKSTART.md`](AGENT-QUICKSTART.md); come here only when a
video needs stronger external inspiration or assets.

## Fast Path

1. Start from
   [`creative-source-scout`](../../skills/creative-source-scout/SKILL.md).
2. Filter the
   [`1000-site candidate catalog`](../../skills/creative-source-scout/references/creative-source-catalog.v1.json)
   by production need.
3. Verify the current license, attribution, pricing, and watermark rules
   before copying or rendering any external asset.
4. If rights are unclear, use the site as inspiration only and rebuild
   an original local asset or code-native treatment.

## Source To Skill Routing

| Need                       | Use These Sources For                                                                             | Then Use                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hook cards and animated UI | `21st.dev`, Magic UI, Aceternity, React Bits, Motion Primitives, Animata, shadcn/ui, Motion       | [`motion-design-coder`](../../skills/motion-design-coder/SKILL.md), [`hook-overlay`](../../skills/hook-overlay/SKILL.md)                            |
| Motion-card lessons        | card states, counters, flip words, proof strips, bento layouts                                    | [`motion-card-lesson-short`](../../skills/motion-card-lesson-short/SKILL.md)                                                                        |
| 3D/gameplay backgrounds    | Three.js, React Three Fiber, `@remotion/three`, Spline, Poly Haven, ambientCG, Kenney, Quaternius | [`procedural-gameplay-backgrounds`](../../skills/procedural-gameplay-backgrounds/SKILL.md)                                                          |
| AI image/video lanes       | Runway, Luma, Kling/fal, Krea, Replicate, Hugging Face, ComfyUI                                   | [`shot-prompt-builder`](../../skills/shot-prompt-builder/SKILL.md), [`continuity-chain`](../../skills/continuity-chain/SKILL.md)                    |
| Stock footage and audio    | Pexels, Unsplash, Pixabay, Mixkit, Coverr, Videvo, Freesound, Uppbeat                             | [`source-media-review`](../../skills/source-media-review/SKILL.md), [`media-index`](../../skills/media-index/SKILL.md)                              |
| Music and SFX              | YouTube Audio Library, Freesound, OpenGameArt, Pixabay, Mixkit, ZapSplat, Openverse               | [`audio-source-policy`](../../skills/creative-source-scout/references/audio-source-policy.md), [`video-render`](../../skills/video-render/SKILL.md) |
| Fonts and icons            | Google Fonts, Fontsource, Heroicons, Lucide, OpenMoji, Noun Project                               | [`short-form-production-playbook`](../../skills/short-form-production-playbook/SKILL.md)                                                            |
| Creative coding            | p5.js, Book of Shaders, Observable, CodePen, OpenProcessing                                       | [`motion-design-coder`](../../skills/motion-design-coder/SKILL.md), [`animation-explainer-short`](../../skills/animation-explainer-short/SKILL.md)  |

## Best Uses

- Animation and UI sources for hook cards, overlays, explainers, and
  product demos.
- 3D and game asset sources for caption-clean background loops,
  characters, props, environments, and textures.
- Stock and visual sources for B-roll, illustrations, icons, mockups,
  and visual metaphors.
- AI generation sources for provider scouting, model comparison, and
  experimental visual lanes.
- Audio sources for music beds, SFX, voice references, and sound design.

## Technique References

- [`creative-technique-map.md`](../../skills/creative-source-scout/references/creative-technique-map.md)
  turns source-site research into motion, 3D, AI-video, stock, audio,
  font, icon, and creative-coding tactics.
- [`provenance-and-license-gates.md`](../../skills/creative-source-scout/references/provenance-and-license-gates.md)
  defines usage modes, asset-ledger fields, safer defaults, hard
  rejects, and publish gates.
- [`audio-source-policy.md`](../../skills/creative-source-scout/references/audio-source-policy.md)
  defines royalty-free/open-licensed audio tiers, YouTube-origin audio
  rules, Content ID risk fields, and SFX/music handoff gates.

## Audio And SFX

- `royalty-free` is not the same as copyright-free, attribution-free,
  redistributable, or Content-ID-safe.
- Prefer original/local synthesized SFX, CC0/CC BY audio, or official
  libraries with saved license evidence.
- Use YouTube Audio Library as the safe YouTube-native path for
  downloadable music/SFX.
- Treat arbitrary YouTube videos as reference-only unless the user owns
  the upload, has explicit permission, or can document compatible
  license plus permitted access.
- Save asset page, license URL, attribution, retrieval date, local hash,
  certificate/permission evidence, and Content ID risk before publishing.

## Minimum Asset Ledger

Track this before public demos use external assets:

- source URL, provider, author, title, license name, and license URL
- retrieval date, local path, file hash, and modification notes
- usage mode: `inspiration-only`, `code-native-rebuild`,
  `downloaded-asset`, `generated-asset`, or `reference-provider`
- attribution text, rights flags, evidence files, and review status

AI-generated assets also need provider, model, prompt, references, job
id, settings, seed if available, cost, and output hash.

## Hard Rejects

- watermarks, preview badges, sample audio tags, or burned-in source text
- unclear source, missing license, scraper/rehost-only source, or
  inconsistent license page
- `editorial use only`, non-commercial, no-derivatives, personal-use,
  or account-bound assets for public OSS demos
- recognizable people, brands, property, copyrighted characters, or UI
  where releases or trademark rights are unclear
- music likely to trigger Content ID without stored proof
- arbitrary YouTube audio downloads, reuploaded “no copyright” mixes, or
  audio with sample tags/preview watermarks

## Maintenance

```bash
npm run creative-sources:gen
npm run creative-sources:check
```

The catalog is a brainstorm surface, not a legal approval surface.
