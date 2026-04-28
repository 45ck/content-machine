# Asset Inventory And Provenance

Date: 2026-04-29
Bundle: local research import from `docs/research/archetypes/assets/20260429/`

Raw copied vendor files were used as local research evidence but are not the
product surface. The committed surface is the summarized repo cards, recipes,
manifests, and the `short-form-archetype-research` skill pack.

## Asset Classes

| Class                  | Examples In Bundle                                                              | Use                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Agent instructions     | `claude-shorts/SKILL.md`, `dojo-remotion-superpowers/*.md`                      | Mine for stage contracts and review checklists                         |
| Caption/export specs   | `caption-styles.md`, `platform-specs.md`, `remotion-patterns.md`                | Compare against local caption/export presets                           |
| Runtime code excerpts  | `FaceCrop.py`, `ShortCreator.ts`, `PortraitVideo.tsx`, `ShortVideo.tsx`         | Understand algorithms; do not copy into runtime without license review |
| Prompt/engine patterns | `LanguageTasks.py`, `shortgpt/*engine.py`, editing JSON                         | Extract prompt structure and pipeline boundaries                       |
| Scene/template assets  | `SCENE_TYPES.md`, `TRANSCRIPT_FORMAT.md`, `innovation_vertical_diverging_v1.py` | Build local motion grammar vocabulary                                  |
| Visual evidence        | `openshorts/*.png`, `propaganda_v2_frame.png`                                   | Screenshot/reference only                                              |
| Config examples        | `config.template.toml`, `background_videos.json`, `shorts.ts`                   | Map useful fields into local skills, recipes, and quality checks       |

## Provenance Rules

- Every copied file should be tracked in the local evidence inventory before
  being summarized into a committed repo card or recipe.
- Copied files are evidence, not vendored dependencies.
- Large media and full repo clones remain in `vendor/`, not tracked research docs.
- Screenshots are for internal visual comparison only.
- Any runtime reuse needs upstream license review and attribution.

## Missing Asset Classes

The research did not copy:

- full source repos
- API keys, tokens, cookies, or upload credentials
- large generated videos/GIFs
- copyrighted background/gameplay footage
- package lockfiles
- third-party model weights

## Recommended Local Asset Model

For future production work, assets should be separated from evidence:

| Asset Type                | Storage Recommendation                                       |
| ------------------------- | ------------------------------------------------------------ |
| Source long video         | run-local artifact with source URL/license/provenance        |
| Transcript                | JSON artifact with segment and word timestamps               |
| Crop plan                 | JSON artifact keyed by clip and speaker/content type         |
| Caption plan              | JSON plus generated ASS/SRT                                  |
| Hook overlays             | code-native component props, not screenshots                 |
| Stock/generated visuals   | media index with provider, prompt/query, license, cache path |
| Gameplay/background loops | curated media library with explicit rights                   |
| Avatar/voice assets       | product/consent/provenance ledger                            |
