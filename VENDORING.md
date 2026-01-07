# Vendoring Policy

Content Machine vendors external repositories for stability and offline development.

## Vendored Repositories

| Repo                 | Purpose                             | Branch | Notes                       |
| -------------------- | ----------------------------------- | ------ | --------------------------- |
| `remotion`           | Video composition framework         | main   | Core dependency             |
| `short-video-maker`  | Reference patterns (Pexels, Kokoro) | main   | Patterns only, not imported |
| `open-deep-research` | Deep research agent patterns        | main   | Reference for weekly job    |

### Prompt Libraries (`vendor/prompt-libraries/`)

| Repo                                           | Purpose                        | Branch |
| ---------------------------------------------- | ------------------------------ | ------ |
| `awesome-nanobanana-pro`                       | Master Nano Banana Pro prompts | main   |
| `awesome-nano-banana-pro-prompts`              | 1000+ prompts with images      | main   |
| `awesome-nano-banana-pro-prompts-and-examples` | Daily updated examples         | main   |
| `Awesome-Nano-Banana-images`                   | Case library with results      | main   |
| `awesome-nano-banana-jimmylv`                  | Flash-specific prompts         | main   |
| `awesome-nano-banana-supermaker`               | Playbook and tutorials         | main   |
| `nanoBananaPrompts`                            | Reproducible prompt gallery    | main   |
| `awesome-gemini-ai`                            | Broader Gemini patterns        | main   |

### Gemini/Veo Tools (`vendor/gemini/`)

| Repo                        | Purpose                          | Branch |
| --------------------------- | -------------------------------- | ------ |
| `cookbook`                  | Official Google notebooks        | main   |
| `veo-nanobanana-quickstart` | Next.js UI for Veo + Nano Banana | main   |
| `GeminiGenerator`           | Python batch generation          | master |

### Video Effects (`vendor/video-effects/`)

| Repo                      | Purpose                      | Branch |
| ------------------------- | ---------------------------- | ------ |
| `DepthFlow`               | 2.5D parallax animations     | main   |
| `ComfyUI-Depthflow-Nodes` | ComfyUI workflow integration | main   |
| `kburns-slideshow`        | Ken Burns effect generator   | main   |
| `ffmpeg_video_generation` | FFmpeg zoom/pan patterns     | main   |
| `ffmpeg-cheatsheet`       | FFmpeg command reference     | main   |

### Frame Interpolation (`vendor/frame-interpolation/`)

| Repo   | Purpose                       | Branch |
| ------ | ----------------------------- | ------ |
| `FILM` | Google's frame interpolation  | main   |
| `RIFE` | Real-time frame interpolation | main   |

### Awesome Lists (`vendor/awesome-lists/`)

| Repo                       | Purpose                   | Branch |
| -------------------------- | ------------------------- | ------ |
| `awesome-image-to-video`   | Image-to-video tools list | main   |
| `awesome-video-generation` | Video generation research | main   |
| `Awesome-Video-Diffusion`  | Diffusion video ecosystem | main   |

## Adding a Vendor

```bash
# Add as submodule
git submodule add https://github.com/owner/repo.git vendor/repo-name

# Update .gitmodules if needed
git config -f .gitmodules submodule.vendor/repo-name.shallow true

# Commit
git add .gitmodules vendor/repo-name
git commit -m "vendor: add repo-name"
```

## Updating Vendors

```bash
# Update all
git submodule update --remote --merge

# Update specific
cd vendor/repo-name
git fetch origin main
git checkout origin/main
cd ../..
git add vendor/repo-name
git commit -m "vendor: update repo-name"
```

## Policy

1. **Read the README first** - Always check vendor's docs before using
2. **Prefer upstream PRs** - Don't fork and edit; contribute back
3. **Document deviations** - If you must patch, document in this file
4. **Pin versions** - Use specific commits, not floating branches

## Current Patches

None yet.
