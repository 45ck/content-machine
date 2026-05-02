# Audio Source Policy

Use this when selecting music beds, sound effects, ambience, stingers,
UI sounds, extracted audio, or YouTube-origin audio for a public demo or
published short.

This is practical engineering guidance, not legal advice.

## Core Rules

- `royalty-free` does not mean copyright-free, attribution-free,
  commercially safe, redistributable, or claim-free.
- Treat audio as higher risk than still images because the same sound
  can be fingerprinted, reuploaded, remixed, or registered with Content
  ID by another party.
- Prefer original/local synthesis, CC0, CC BY with clear attribution, or
  an official platform library with a saved license/certificate.
- Verify the exact asset page, not just the source site's general
  marketing claim.
- Keep audio source evidence beside the render artifacts so a platform
  claim can be answered without reconstructing the sourcing history.

## Source Tiers

| Tier                        | Default Use                                                                 | Notes                                                                                        |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Original/local synthesis    | Clicks, whooshes, risers, UI blips, drones, simple music beds               | Lowest rights friction when generated or recorded specifically for the short.                |
| Open-licensed libraries     | Freesound, OpenGameArt, Wikimedia Commons, Openverse results                | Prefer CC0 or CC BY. Reject NC, ND, unclear uploads, and assets with inconsistent metadata.  |
| Official platform libraries | YouTube Audio Library, Pixabay, Mixkit, ZapSplat, Free Music Archive        | Per-asset terms vary. Save attribution text, license page, certificate, and claim notes.     |
| Paid royalty-free libraries | Epidemic Sound, Artlist, Envato Elements, Soundstripe, Storyblocks, Uppbeat | Only use when the account/license scope covers the exact project and public distribution.    |
| YouTube user uploads        | Reference only by default                                                   | Download/extract only with explicit rights and permitted access. Do not rip arbitrary audio. |
| Rehosts and compilations    | Reject                                                                      | A “no copyright music” upload is not proof of rights.                                        |

## Official Checks

Before using a source, open the official terms or asset page and save
the evidence:

- YouTube Terms:
  `https://www.youtube.com/t/terms`
- YouTube Audio Library help:
  `https://support.google.com/youtube/answer/3376882`
- YouTube Creative Commons license help:
  `https://support.google.com/youtube/answer/2797468`
- YouTube API developer policies:
  `https://developers.google.com/youtube/terms/developer-policies`
- Freesound FAQ:
  `https://freesound.org/help/faq/`
- OpenGameArt FAQ:
  `https://opengameart.org/content/faq`
- Pixabay license summary:
  `https://pixabay.com/service/license-summary/`
- Mixkit license:
  `https://mixkit.co/license/`
- ZapSplat standard license:
  `https://www.zapsplat.com/license-type/standard-license/`
- Openverse docs:
  `https://docs.openverse.org/api/reference/made_with_ov.html`

## YouTube-Origin Audio

Default stance: YouTube is a reference/search surface, not an audio
asset source.

Allowed only when one of these is true:

- the user owns the uploaded content and has the underlying music/SFX
  rights;
- YouTube itself provides an official download/export path for the
  asset, such as Audio Library downloads;
- the creator or rights holder gives explicit permission and the access
  method is allowed by YouTube and applicable law;
- the source is marked with a compatible Creative Commons license and
  the rights, attribution, originality, and download/access method are
  all documented.

Hard blocks:

- Do not add generic “download any YouTube audio” workflows.
- Do not bypass paywalls, login gates, copy protection, unavailable
  videos, or platform restrictions.
- Do not extract commercial songs, TV/movie/game audio, influencer
  background music, or meme sounds unless the rights are explicit.
- Do not treat a Creative Commons label as enough by itself. Confirm the
  channel appears to be the rights holder, no Content ID conflict is
  visible, and attribution can be carried into the published video.

If a downloader is used for user-owned or permissioned material, record:

- original video URL, channel, title, license/permission basis, and
  retrieval date
- command/tool name and version
- extracted time range
- resulting local path, file hash, and any transcode settings
- whether the audio is `direct-use`, `reference-only`, or `rejected`

## Recommended Audio Fields

Extend the asset ledger or media index with:

- `assetType`: `music`, `sfx`, `ambience`, `stinger`, `voice-reference`,
  or `extracted-audio`
- `platformSource`: `youtube-audio-library`, `youtube-user-upload`,
  `freesound`, `pixabay`, `mixkit`, `zapsplat`, `opengameart`, etc.
- `originalVideoUrl` when audio was extracted from a video source
- `extractRange` when only part of a source was used
- `licenseCertificatePath` or `permissionEvidencePath`
- `contentIdRisk`: `none-known`, `possible`, `claimed`, or `unknown`
- `attributionPlacement`: `description`, `credits-card`,
  `repo-source-notes`, or `not-required`
- `mixRole`: `bed`, `accent`, `transition`, `impact`, `ambience`, or
  `reference`

## Fast Safe Defaults

- For product/repo demo shorts, prefer quiet original synthesized beds
  and locally generated UI SFX over famous “viral” sounds.
- For one-shot SFX, prefer Freesound CC0/CC BY or ZapSplat/Mixkit only
  after per-asset license evidence is saved.
- For music, prefer YouTube Audio Library, clearly CC BY sources, or
  paid libraries with active project coverage and proof.
- For public OSS docs, avoid assets that require account-bound access to
  prove rights later unless the license/certificate can be archived.
- If attribution is required, put it in source notes and the platform
  description before the render is marked publish-ready.

## Rejects

- sample tags, preview voiceovers, audible watermarks, or library brand
  callouts
- “copyright free”, “no copyright”, or reuploaded compilation claims
  without an official asset page
- non-commercial, no-derivatives, personal-use, editorial-only, or
  unclear permission for public demos
- music/SFX with known unresolved Content ID claims and no certificate
  or permission trail
- clips whose license cannot survive transformations, remixing, caption
  overlays, commercial platform upload, or repo redistribution

## Production Handoff

Before the audio enters `video-render` or a demo doc:

- mark each audio asset `approved`, `reference-only`, or `rejected`;
- save the source/license/certificate evidence;
- confirm the planned platform can receive the asset without violating
  account or library terms;
- ensure the mix supports narration and captions instead of competing
  with them;
- route uncertain assets back to local synthesis or a code-native sound
  design pass instead of shipping risky audio.
