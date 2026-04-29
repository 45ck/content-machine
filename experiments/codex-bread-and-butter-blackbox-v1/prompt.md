Work only inside the current project directory.

You are running inside an isolated black-box evaluation for the local
Content Machine skill pack.

Objective:

- produce one real portrait short video under `outputs/final/video.mp4`
- lane: Reddit-style story short
- use the local skill pack under `.content-machine/`
- use real audio, not silent audio
- use real moving background visuals, not fallback color and not a
  static dead background
- captions must be present and readable
- final output must pass `publish-prep`

This is an execution task, not a repo-audit task.

- Do not spend time reading package internals unless a tool run fails and
  you need one specific answer.
- Prefer running the installed skill-pack entrypoints directly through
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs`.
- Produce artifacts first, inspect internals only if blocked.

Hard constraints:

- Do not modify files outside this project directory.
- Do not use mock audio, mock visuals, or mock render.
- Do not accept a result that uses fallback-color scenes.
- Do not accept a result that has no scene changes or no audible speech.
- If a full automatic path is blocked by missing provider keys, fall back
  to a manual skill-driven path inside this project.

Available local material:

- `.content-machine/skills/`
- `.content-machine/flows/`
- `assets/motion/` contains real local portrait video clips
- `reference/` contains prior repo examples you can inspect
- `reference/command-patterns.md` contains exact runner command patterns
- `reference/video-only-visuals.example.json` shows the local-video
  visuals shape; replace the placeholder paths with absolute paths inside
  this project

Preferred path:

1. inspect only the local skill docs/examples you need
2. create a strong manual script artifact for a Reddit-style story short
3. run real TTS/timestamps
4. build a visuals plan that uses the local moving clips in
   `assets/motion/`
5. render a real MP4
6. run `publish-prep`
7. if review fails, revise once and rerun
8. write a concise report to `outputs/final/report.md`

Recommended execution pattern:

1. write `outputs/work/script.json`
2. run `script-to-audio`
3. write `outputs/work/visuals.json` using only `assets/motion/*.mp4`
4. run `video-render`
5. run `publish-prep`
6. if it fails, fix the actual cause and rerun once

Topic guidance:

- make it feel like a bread-and-butter short-form post, not a generic
  explainer
- use a believable Reddit-style story premise with a clear judgment turn
- use this premise unless blocked:
  "My sister told the whole family I owed her free wedding photos because
  I shoot part-time, so I cancelled two days before the event after she
  kept rewriting the deal and calling me selfish."
- strong hook in the first sentence
- 35s to 50s target
- keep pace aggressive enough to avoid slow-cadence failure
- end with a comment-bait verdict or judgment beat

Script shape:

- write a JSON artifact like `reference/manual-script.example.json`
- use `schemaVersion`, `title`, `hook`, `hashtags`, `meta`, and a
  `scenes` array
- each scene should have:
  `id`, `text`, `visualDirection`, `duration`

Execution rules:

- do not call `brief-to-script`; write `outputs/work/script.json`
  manually
- do not use fallback-color anywhere
- do not use images-only visuals; use `assetType: "video"` scenes from
  `assets/motion/*.mp4`
- use absolute `assetPath` values in `outputs/work/visuals.json`
- keep `downloadAssets: false` in render
- once the first render exists, run `publish-prep`; if it fails once,
  fix the actual problem and rerun one time

Deliverables:

- `outputs/final/video.mp4`
- `outputs/final/report.md`
- any intermediate artifacts under `outputs/`

In the final report, include:

- what path you used
- what commands you ran
- whether `publish-prep` passed
- final output path
