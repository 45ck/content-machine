Work only inside the current project directory.

You are running inside an isolated empty-project evaluation for the
local Content Machine skill pack.

Objective:

- produce one real portrait short video at `outputs/final/video.mp4`
- match the shipped Reddit split-screen lane as closely as possible
- use `.content-machine/skills/` rather than repo internals
- use real audio and real moving video
- use the packaged runner under
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs`
- stay inside this project and use the local `reference/*.json` and
  `reference/*.md` files as the contract
- pin command execution to Node `20.x`, not the host shell's older
  default runtime

Style target:

- about `35s` to `50s`
- opening Reddit screenshot-style post card for about `5s`
- top half switches to story-related moving footage after the opener
- bottom half is Subway Surfers gameplay
- captions overlay near the midpoint between lanes
- end on a judgment/comment-bait beat

Hard rules:

- do not modify files outside this project directory
- do not use mock audio, mock visuals, or placeholder renders
- do not accept silent audio
- do not accept fallback-color or static dead backgrounds
- do not hand-draw fake Reddit HTML; use the shipped Reddit card tool
- do not spend time auditing the whole package
- do not read `node_modules/@45ck/content-machine/**` except
  `agent/run-tool.mjs`
- do not read generated `dist/**` package internals

Available local material:

- `.content-machine/skills/`
- `.content-machine/flows/`
- `assets/gameplay/subway.mp4`
- `assets/top/*.mp4`
- `reference/asset-manifest.json`
- `reference/manual-script.example.json`
- `reference/reddit-story-assets.request.example.json`
- `reference/video-render.request.example.json`
- `reference/publish-prep.request.example.json`
- `reference/visuals.example.json`
- `reference/target-contact-sheet.jpg`
- `reference/reference-lane.md`
- `reference/command-patterns.md`

Preferred execution path:

1. inspect only these files first:
   `reference/reference-lane.md`,
   `reference/asset-manifest.json`,
   `reference/command-patterns.md`,
   `.content-machine/skills/reddit-story-short/SKILL.md`,
   `.content-machine/skills/reddit-card-overlay/SKILL.md`,
   `.content-machine/skills/script-to-audio/SKILL.md`,
   `.content-machine/skills/video-render/SKILL.md`,
   `.content-machine/skills/publish-prep-review/SKILL.md`
2. before package commands, run:
   `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"`
   and
   `export npm_config_script_shell=/bin/bash`
3. generate a Reddit card opener asset from
   `reference/reddit-story-assets.request.example.json`
4. write `outputs/work/script.json` in the same shape as
   `reference/manual-script.example.json`
5. run `script-to-audio`
6. write `outputs/work/visuals.json` in the same shape as
   `reference/visuals.example.json`, but expand it to cover the full
   audio duration using the top clips listed in `reference/asset-manifest.json`
7. run `video-render` using
   `reference/video-render.request.example.json`
8. run `publish-prep` using
   `reference/publish-prep.request.example.json`
9. if review fails, fix the actual problem once and rerun
10. write `outputs/final/report.md`

Required deliverables:

- `outputs/final/video.mp4`
- `outputs/final/report.md`
- `outputs/final/publish-prep/`

In the final report include:

- what commands you ran
- whether you used `reddit-story-assets`
- whether `publish-prep` passed
- final output path
