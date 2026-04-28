# Extraction Backlog

Date: 2026-04-29
Goal: convert research into local `content-machine` skills, flows, assets, and
validators without importing whole external codebases.

## High Priority

| Item                         | Source Signal                                     | Local Target                                                                                               |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Text-selection-to-timestamps | `imgly/videoclipper`                              | `text-selection-to-timestamps` skill/harness should match selected transcript text back to word timestamps |
| Crop plan artifact           | `SamurAIGPT`, `ai-clips-maker`, `claude-shorts`   | JSON crop plan emitted by `source-media-analyze` or `boundary-snap`                                        |
| Clip scoring rubric          | `claude-shorts`, `openshorts`, `imgly`            | Shared review rubric for hook, coherence, emotion, density, payoff                                         |
| Platform snapshot config     | Official platform docs plus `claude-shorts` specs | One local export profile reference with configurable duration limits                                       |
| Asset provenance ledger      | Reddit/gameplay and UGC/avatar repos              | Media index fields for source, license, provider, prompt/query, consent                                    |

## Medium Priority

| Item                      | Source Signal                            | Local Target                                                                  |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Niche profile propagation | `rushindrasinha/youtube-shorts-pipeline` | Style profile should shape script, visuals, voice, captions, music, metadata  |
| Motion grammar field      | `dr34ming/shorts-project`, `OpenMontage` | Add `sceneType` / `motionGrammar` to visuals plan                             |
| Caption preset audit      | `claude-shorts`, `raga70`, `openshorts`  | Map bold/bounce/clean/reddit/ugc presets to current renderer                  |
| First-frame/cover asset   | Reels/Shorts reports, OpenShorts gallery | Publish prep should require first-frame/cover review for profile-grid formats |
| Review contact sheet      | OpenMontage/Dojo review patterns         | Generate screenshot/contact sheet per render before publish prep              |

## Low Priority

| Item                           | Source Signal             | Local Target                                                      |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------- |
| Browser non-destructive editor | `imgly/videoclipper`      | Future lab/editor exploration only                                |
| Auto-publishing adapters       | `openshorts`, Reddit bot  | Keep out of core until auth/risk model exists                     |
| Full avatar generation stack   | `openshorts`              | Add only after claim/provenance gates exist                       |
| Manim runtime lane             | `dr34ming/shorts-project` | Consider for math/science examples after Remotion lanes stabilize |

## Do Not Do

- Do not vendor full external repos into runtime modules.
- Do not copy upload-cookie automations.
- Do not use unclear gameplay/background footage as production defaults.
- Do not treat platform duration limits as immutable constants.
- Do not collapse all six archetypes into one generic "short" skill.
