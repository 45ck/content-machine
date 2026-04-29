# Short-Form Archetype Research Assets 20260429

These files were copied from local `vendor/` research repos so the archetype
reports can be read without reopening every clone. They are research evidence,
not runtime assets. Verify upstream licenses before reusing code, images, or
templates in product output.

## Copied Assets

| Local Copy | Source | Why Copied |
| --- | --- | --- |
| `claude-shorts/SKILL.md` | `vendor/imports-20260423-shortform-downloads-direct/direct-repos/AgriciDaniel__claude-shorts/SKILL.md` | Agent-led longform-to-short pipeline |
| `claude-shorts/caption-styles.md` | `.../AgriciDaniel__claude-shorts/references/caption-styles.md` | Caption visual presets |
| `claude-shorts/platform-specs.md` | `.../AgriciDaniel__claude-shorts/references/platform-specs.md` | Export and safe-zone specs |
| `claude-shorts/remotion-patterns.md` | `.../AgriciDaniel__claude-shorts/references/remotion-patterns.md` | Remotion render/crop patterns |
| `claude-shorts/scoring-rubric.md` | `.../AgriciDaniel__claude-shorts/references/scoring-rubric.md` | Clip selection scoring |
| `dojo-remotion-superpowers/create-short.md` | `.../DojoCodingLabs__remotion-superpowers/commands/create-short.md` | Remotion short command shape |
| `dr34ming-shorts-project/TRANSCRIPT_FORMAT.md` | `vendor/imports-20260423-shortform-github/direct-generators/dr34ming__shorts-project/manim-animations/TRANSCRIPT_FORMAT.md` | Timed motion input format |
| `dr34ming-shorts-project/TEMPLATES_NOTES.md` | `.../dr34ming__shorts-project/manim-animations/TEMPLATES_NOTES.md` | Template evolution strategy |
| `dr34ming-shorts-project/girlboss_example.json` | `.../dr34ming__shorts-project/manim-animations/examples/girlboss_example.json` | Example demographic/style input |
| `dr34ming-shorts-project/hustle_bro_example.json` | `.../dr34ming__shorts-project/manim-animations/examples/hustle_bro_example.json` | Example demographic/style input |
| `dr34ming-shorts-project/innovation_vertical_diverging_v1.py` | `.../dr34ming__shorts-project/manim-animations/templates/successful/innovation_vertical_diverging_v1.py` | Successful Manim template |
| `dr34ming-shorts-project/propaganda_v2_frame.png` | `.../dr34ming__shorts-project/propaganda_v2_frame.png` | Visual evidence for motion-graphics style |
| `openshorts/clip-generator.png` | `vendor/imports-20260423-shortform-github/direct-generators/mutonby__openshorts/screenshots/clip-generator.png` | Clip factory UI reference |
| `openshorts/clip-results.png` | `.../mutonby__openshorts/screenshots/clip-results.png` | Clip result UI reference |
| `openshorts/ai-shorts.png` | `.../mutonby__openshorts/screenshots/ai-shorts.png` | UGC avatar setup reference |
| `openmontage/SCENE_TYPES.md` | `vendor/imports-20260423-shortform-downloads-direct/direct-repos/calesthio__OpenMontage/remotion-composer/SCENE_TYPES.md` | Motion/component scene vocabulary |
| `imgly-videoclipper/README.md` | `vendor/imports-20260423-shortform-github/direct-generators/imgly__videoclipper/README.md` | Browser clip-factory architecture |
| `samurai-ai-shorts/FaceCrop.py` | `vendor/imports-20260423-shortform-github/direct-generators/SamurAIGPT__AI-Youtube-Shorts-Generator/Components/FaceCrop.py` | Face/screen vertical crop logic |
| `samurai-ai-shorts/LanguageTasks.py` | `.../SamurAIGPT__AI-Youtube-Shorts-Generator/Components/LanguageTasks.py` | Highlight selection prompt logic |
| `samurai-ai-shorts/Subtitles.py` | `.../SamurAIGPT__AI-Youtube-Shorts-Generator/Components/Subtitles.py` | Burned-in subtitle implementation |

## Additional Runtime Evidence

| Local Copy | Source | Why Copied |
| --- | --- | --- |
| `gyoridavid-short-video-maker/shorts.ts` | `vendor/imports-20260423-shortform-github/direct-generators/gyoridavid__short-video-maker/src/types/shorts.ts` | Scene/render config schema |
| `gyoridavid-short-video-maker/ShortCreator.ts` | `.../gyoridavid__short-video-maker/src/short-creator/ShortCreator.ts` | End-to-end short creation orchestration |
| `gyoridavid-short-video-maker/PortraitVideo.tsx` | `.../gyoridavid__short-video-maker/src/components/videos/PortraitVideo.tsx` | Remotion portrait composition |
| `gyoridavid-short-video-maker/Pexels.ts` | `.../gyoridavid__short-video-maker/src/short-creator/libraries/Pexels.ts` | Stock video search integration |
| `gyoridavid-short-video-maker/Remotion.ts` | `.../gyoridavid__short-video-maker/src/short-creator/libraries/Remotion.ts` | Render wrapper |
| `openshorts/HookOverlay.tsx` | `vendor/imports-20260423-shortform-github/direct-generators/mutonby__openshorts/remotion/src/compositions/HookOverlay.tsx` | Hook overlay implementation |
| `openshorts/Subtitles.tsx` | `.../mutonby__openshorts/remotion/src/compositions/Subtitles.tsx` | UGC/clip subtitle implementation |
| `openshorts/ShortVideo.tsx` | `.../mutonby__openshorts/remotion/src/compositions/ShortVideo.tsx` | Composite short component |
| `openshorts/VideoEffects.tsx` | `.../mutonby__openshorts/remotion/src/compositions/VideoEffects.tsx` | Effects layer reference |
| `openshorts/hooks.py` | `.../mutonby__openshorts/hooks.py` | Hook generation logic |
| `openshorts/saasshorts.py` | `.../mutonby__openshorts/saasshorts.py` | Product/UGC short pipeline |
| `shortgpt/content_short_engine.py` | `vendor/imports-20260423-shortform-github/direct-generators/RayVentura__ShortGPT/shortGPT/engine/content_short_engine.py` | Engine subclass pipeline |
| `shortgpt/facts_short_engine.py` | `.../RayVentura__ShortGPT/shortGPT/engine/facts_short_engine.py` | Facts short specialization |
| `shortgpt/reddit_short_engine.py` | `.../RayVentura__ShortGPT/shortGPT/engine/reddit_short_engine.py` | Reddit short specialization |
| `shortgpt/make_caption.json` | `.../RayVentura__ShortGPT/shortGPT/editing_framework/editing_steps/make_caption.json` | Declarative caption editing step |
| `shortgpt/crop_1920x1080_to_short.json` | `.../RayVentura__ShortGPT/shortGPT/editing_framework/editing_steps/crop_1920x1080_to_short.json` | Declarative vertical crop step |
| `raga70-reddit-bot/config.template.toml` | `vendor/imports-20260423-shortform-downloads-direct/direct-repos/raga70__FullyAutomatedRedditVideoMakerBot/utils/.config.template.toml` | Reddit/gameplay config surface |
| `raga70-reddit-bot/background_videos.json` | `.../raga70__FullyAutomatedRedditVideoMakerBot/utils/background_videos.json` | Background media pool structure |
| `raga70-reddit-bot/captionGen.py` | `.../raga70__FullyAutomatedRedditVideoMakerBot/captionGen.py` | One-word caption generation |
| `raga70-reddit-bot/final_video.py` | `.../raga70__FullyAutomatedRedditVideoMakerBot/video_creation/final_video.py` | Final assembly reference |
| `imgly-videoclipper/transcript.ts` | `vendor/imports-20260423-shortform-github/direct-generators/imgly__videoclipper/src/lib/transcript.ts` | Text matching / transcript utilities |
| `imgly-videoclipper/engine.ts` | `.../imgly__videoclipper/src/cesdk/engine.ts` | Client-side editor engine wrapper |
| `imgly-videoclipper/use-cesdk-editor.ts` | `.../imgly__videoclipper/src/cesdk/use-cesdk-editor.ts` | Browser editing integration |
| `dojo-remotion-superpowers/video-director.md` | `vendor/imports-20260423-shortform-downloads-direct/direct-repos/DojoCodingLabs__remotion-superpowers/agents/video-director.md` | Agent role contract |
| `dojo-remotion-superpowers/media-scout.md` | `.../DojoCodingLabs__remotion-superpowers/agents/media-scout.md` | Media selection role contract |
| `dojo-remotion-superpowers/review-video.md` | `.../DojoCodingLabs__remotion-superpowers/commands/review-video.md` | Review checklist |
| `ai-clips-maker/README.md` | `vendor/imports-20260423-shortform-github/direct-generators/alperensumeroglu__ai-clips-maker/README.md` | WhisperX/Pyannote clip factory overview |
