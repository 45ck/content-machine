Work only inside the current project directory.

You are running inside an isolated empty-project evaluation for the
local Content Machine skill pack.

Objective:

- produce one real portrait short video at `outputs/final/video.mp4`
- use the shipped `text-message-drama-short` skill as the creative
  target
- use only the installed local skill pack plus the local `reference/`
  files as the contract
- use real audio and real moving video
- use the packaged runner under
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs`
- keep the work inside this project
- pin command execution to Node `20.x`, not the host shell's older
  default runtime

Style target:

- about `35s` to `50s`
- first visible message creates immediate suspicion or tension
- top half is mainly controlled message-card assets, not generic stock
  footage
- bottom half is continuous Subway Surfers gameplay
- captions overlay near the midpoint between lanes
- ending beat lands on a reveal or judgment hook

Hard rules:

- do not modify files outside this project directory
- do not use mock audio, mock visuals, or placeholder renders
- do not accept silent audio
- do not accept fallback-color or static dead backgrounds
- do not handwave the message UI; create actual controlled message-card
  assets inside `assets/messages/`

Available local material after setup:

- `assets/gameplay/subway.mp4`
- `assets/top/*.mp4`
- `package.json`
- `reference/asset-manifest.json`
- `reference/manual-script.example.json`
- `reference/video-render.request.example.json`
- `reference/publish-prep.request.example.json`
- `reference/resolve-video-render-request.mjs`
- `reference/reference-lane.md`
- `reference/command-patterns.md`

Preferred execution path:

1. before package commands, run:
   `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"`
   and
   `export npm_config_script_shell=/bin/bash`
2. run `npm install`
3. run the local skill-pack installer so `.content-machine/skills/`
   exists
4. inspect only:
   `reference/reference-lane.md`,
   `reference/asset-manifest.json`,
   `reference/command-patterns.md`,
   `.content-machine/skills/text-message-drama-short/SKILL.md`,
   `.content-machine/skills/script-to-audio/SKILL.md`,
   `.content-machine/skills/video-render/SKILL.md`,
   `.content-machine/skills/publish-prep-review/SKILL.md`
5. write `outputs/work/script.json` in the same shape as
   `reference/manual-script.example.json`
6. create actual message-card assets under `assets/messages/` as SVG or
   PNG files and use them as the top-lane primary assets
7. run `script-to-audio`
8. write `outputs/work/visuals.json` to cover the full audio duration
   using your message-card assets, optional `assets/top/*.mp4` support,
   and the gameplay clip
9. run `video-render` using
   `reference/resolve-video-render-request.mjs`
10. run `publish-prep` using
    `reference/publish-prep.request.example.json`
11. if review fails, fix the real problem once and rerun
12. write `outputs/final/report.md`

Required deliverables:

- `outputs/final/video.mp4`
- `outputs/final/report.md`
- `outputs/final/publish-prep/`

In the final report include:

- what commands you ran
- whether you created real message-card assets
- whether `publish-prep` passed
- final output path
