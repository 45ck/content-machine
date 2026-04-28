# Short-form GitHub Import Batch 20260423

This batch now uses the newer downloaded CSV at
`/home/calvin/Downloads/short_form_video_repos_179.csv` as the default
source list, then hydrates a focused local corpus of repos for
analysis. The earlier `short_form_video_github_repos_166.csv` export
is still compatible with the importer, but it is no longer the default
because the new file has broader coverage and a refreshed schema.

The goal is not to mirror every repo in the CSV. The goal is to pull
the repos most likely to teach us how to:

- generate shorts/reels end-to-end
- clip long-form media into vertical assets
- render and style captions/subtitles
- align speech, word timestamps, and overlays
- replace bespoke TypeScript orchestration with raw `ffmpeg`,
  Remotion, and skill/prompt-driven flows where that is actually
  viable

This corpus is reference-only. The in-repo product direction is not
"bring these codebases into our runtime." The direction is:

- the agent is the harness
- this repo ships skills, guides, checklists, and reusable recipes
- old CLI/control-plane logic gets archived unless it is needed as a
  thin compatibility layer
- upstream repos are mined for prompts, `ffmpeg` commands, Remotion
  patterns, caption strategies, and evaluation ideas

## Local Hydration Path

Local clones are hydrated into the ignored `vendor/` tree so upstream
code stays available for analysis without bloating this repo's tracked
history:

```text
vendor/imports-20260423-shortform-github/
```

Use the importer:

```bash
node scripts/research/clone-shortform-github-repos.mjs
```

Pass `--update` to refresh existing local clones.

## Curated Repo Set

### Direct generators

- `alperensumeroglu/ai-clips-maker`
- `ArcReel/ArcReel`
- `Dark2C/Viral-Faceless-Shorts-Generator`
- `dr34ming/shorts-project`
- `gyoridavid/short-video-maker`
- `imgly/videoclipper`
- `mutonby/openshorts`
- `RayVentura/ShortGPT`
- `SaarD00/AI-Youtube-Shorts-Generator`
- `SamurAIGPT/AI-Youtube-Shorts-Generator`
- `SamurAIGPT/Clip-Anything`
- `zhouxiaoka/autoclip`

### Captions / subtitles

- `Aegisub/Aegisub`
- `absadiki/subsai`
- `agermanidis/autosub`
- `baxtree/subaligner`
- `ggml-org/whisper.cpp`
- `jianfch/stable-ts`
- `kaegi/alass`
- `libass/libass`
- `linto-ai/whisper-timestamped`
- `m-bain/whisperX`
- `m1guelpf/auto-subtitle`
- `pysubs2/pysubs2`
- `smacke/ffsubsync`
- `SubtitleEdit/subtitleedit`
- `SYSTRAN/faster-whisper`

### Rendering / editing

- `designcombo/react-video-editor`
- `ffmpeg/ffmpeg`
- `mifi/editly`
- `motion-canvas/motion-canvas`
- `PySceneDetect/PySceneDetect`
- `remotion-dev/remotion`
- `remotion-dev/template-prompt-to-video`
- `trykimu/videoeditor`
- `WyattBlue/auto-editor`

## Why This Batch

This mix deliberately covers four layers:

- end-to-end pipeline repos we can decompose into reusable skills
- caption/subtitle repos that may replace or simplify current overlay
  logic
- ASR repos that define timestamp fidelity and alignment quality
- Remotion/FFmpeg repos that show what can stay as raw runtime
  commands instead of custom orchestration code

This should be enough to build a concrete skill extraction backlog
without drowning the repo in low-signal clones.
