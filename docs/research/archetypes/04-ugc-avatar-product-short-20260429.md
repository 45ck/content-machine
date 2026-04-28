# UGC Avatar Product Short

Date: 2026-04-29
Archetype: product/service short with AI actor or avatar
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

This is a marketing short: hook, problem, product proof or demo, benefit, CTA.
It usually imitates user-generated content with an avatar, talking head, voice,
B-roll, subtitles, and platform-native framing.

## How Repos Make It

`mutonby/openshorts` is the main reference. It has a clip generator, AI Shorts
UGC creator, and YouTube Studio. Its AI Shorts pipeline analyzes a website or
manual product description, writes viral scripts, generates/selects an actor,
creates voiceover, produces talking-head/lip-sync video, creates B-roll, then
composites subtitles and hook overlays before publishing.

The key distinction from faceless explainers is that asset generation is
persona-heavy. The avatar image, voice, lip-sync clip, B-roll, hook overlay,
and gallery/publish metadata all need to stay linked.

## Production Recipe

1. Ingest product URL or manual product brief.
2. Extract claims, proof points, audience pain, and CTA.
3. Write a short script in hook/problem/solution/proof/CTA format.
4. Generate or select avatar/actor and voice.
5. Generate talking-head or lip-sync clip.
6. Generate supporting B-roll and product proof frames.
7. Compose captions, hook overlays, and platform export.
8. Store gallery/publish metadata.

## Asset Strategy

This archetype needs strict asset provenance because it touches product claims
and synthetic people. Store:

- product truth/claim bank
- avatar prompt/source image/license
- voice provider and consent/provenance
- generated talking-head clip
- B-roll prompts and outputs
- captions and platform metadata

## What To Pull Into content-machine

- Keep this as a separate `ugc-avatar` lane, not a faceless explainer variant.
- Add a claim/proof gate before rendering product promises.
- Require visible provenance in run artifacts for avatar and voice assets.
- Reuse the copied OpenShorts screenshots only as research references.
