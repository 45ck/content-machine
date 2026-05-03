---
name: platform-packaging
description: Generate platform-specific publish metadata, fit checks, and upload checklists for short-form and social video without auto-uploading.
---

# Platform Packaging

## Use When

- A rendered video, script, or approved draft needs publish-ready
  metadata for TikTok, Instagram Reels, YouTube Shorts, LinkedIn, or X.
- The agent needs to adapt one short to each relevant platform without
  changing the video itself.
- The user wants upload guidance, not an automated publish action.

## Core Approach

1. Read the actual script, transcript, review bundle, or rendered-video
   notes before writing packaging.
2. Choose platforms by fit: entertainment and native short-form for
   TikTok/Reels/Shorts, professional insight for LinkedIn, and concise
   discourse or launch framing for X.
3. Generate platform-specific metadata, not one reused caption pasted
   everywhere.
4. Keep titles, cover text, CTAs, and hashtags truthful to the video and
   avoid claims that were not supported by the source artifact.
5. Include disclosure and rights notes when AI generation, sponsorship,
   affiliate links, sensitive topics, medical/legal/financial content, or
   licensed media may need explicit handling.
6. Never auto-upload, schedule, post, or claim that publishing is
   complete; this skill prepares metadata and checks readiness for a
   human uploader.

## Inputs

- video topic, script, transcript, or `script.json`
- optional rendered video path or publish-prep review bundle
- target platforms, audience, brand voice, and region
- source/provenance notes, sponsorship or affiliate status, and any
  required disclosure language
- optional campaign goal, product URL, CTA target, and banned words

## Outputs

- platform fit summary with recommended, optional, and skip platforms
- title or headline options per platform
- caption/description text per platform
- hashtags, keywords, or search terms appropriate to each platform
- cover text and optional thumbnail angle
- CTA line, first comment or pinned comment ideas, and reply prompts
- disclosure notes and rights caveats
- upload checklist covering assets, metadata, safety, links, captions,
  cover, accessibility, and final human review

## Platform Rules

- `tiktok`: Lead with curiosity, debate, or payoff; use a short caption,
  native hashtags, a comment prompt, and simple cover text.
- `reels`: Make the caption skim-friendly, include creator/brand voice,
  use selective hashtags, and suggest a pinned comment when it improves
  saves or shares.
- `shorts`: Prioritize searchable title, concise description, keywords,
  and a pinned comment that encourages the next watch or source check.
- `linkedin`: Use only when the content has a professional, founder,
  hiring, product, industry, or educational angle; write a more complete
  post with a clear takeaway and restrained hashtags.
- `x`: Use only when the idea can survive as a punchy post or thread
  starter; keep copy compact, include optional thread/reply expansion,
  and avoid hashtag stuffing.

## Output Format

- Prefer a single `platform_packaging.json` or Markdown brief under the
  current output directory when the caller asked for a file.
- Use stable platform keys:
  `tiktok`, `reels`, `shorts`, `linkedin`, `x`.
- For each platform include:
  `fit`, `title`, `caption`, `hashtags`, `keywords`, `coverText`,
  `cta`, `disclosures`, `firstComment`, and `uploadChecklist`.
- Mark unknown or risky items as `needs_review` instead of inventing
  facts.

## Optional Runtime Surface

- Pair after [`publish-prep-review`](../publish-prep-review/SKILL.md)
  when a final MP4 and readiness bundle already exist.
- Pair with [`style-profile-library`](../style-profile-library/SKILL.md)
  when platform copy should follow a saved brand or niche profile.
- Pair with [`asset-ledger`](../asset-ledger/SKILL.md) when disclosure,
  license, attribution, or AI-generation evidence is needed.

## Validation Checklist

- Every selected platform has distinct packaging aligned to that
  platform’s native behavior.
- The metadata matches the actual video and does not add unsupported
  claims.
- Hashtags and keywords are relevant, limited, and not spammy.
- Disclosure, attribution, sponsorship, and AI-generated-media notes are
  visible when needed.
- The upload checklist confirms no upload was attempted and leaves final
  approval to the human publisher.
