# Archetype Routing Guide

Date: 2026-04-29
Purpose: choose the right short-form production lane from a user request.

## Routing Table

| User Request Shape                                    | Route To                    | Why                                                                                     |
| ----------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| "Turn this podcast/interview/video into clips"        | `longform-clip-factory`     | Source media already contains the content; the job is selection, crop, captions, export |
| "Make a Reddit/TikTok story over gameplay"            | `reddit-story-gameplay`     | Needs story text, TTS, background loop, Reddit/card/opening grammar                     |
| "Make a short about this topic/headline"              | `topic-faceless-explainer`  | Needs brief, script, voice, B-roll, captions, music                                     |
| "Make an ad/testimonial/UGC for this product"         | `ugc-avatar-product-short`  | Needs product claims, actor/avatar, proof, CTA, compliance gates                        |
| "Explain this concept visually / make a micro lesson" | `motion-graphics-lesson`    | Needs timed beats and designed scene/motion grammar                                     |
| "Fix captions/export/safe zones"                      | `caption-export-primitives` | Shared primitive lane; usually supports another archetype                               |

## Ambiguous Requests

If the user gives a topic but also supplies source footage, prefer
`longform-clip-factory` if the source footage contains the main message.
Prefer `topic-faceless-explainer` if the footage is only background material.

If the user asks for a "viral clip" without source media, route to
`topic-faceless-explainer` or `reddit-story-gameplay` depending on whether
they want information or story drama.

If the user asks for "TikTok ad", "UGC", "product demo", or "avatar", route to
`ugc-avatar-product-short` and require claim/provenance review.

## Required Clarifying Inputs

Avoid asking broad questions. Ask only for the missing blocker:

| Route                      | Missing Blocker                                 |
| -------------------------- | ----------------------------------------------- |
| `longform-clip-factory`    | source video path/URL                           |
| `reddit-story-gameplay`    | story/post text and background media preference |
| `topic-faceless-explainer` | topic and audience/niche                        |
| `ugc-avatar-product-short` | product URL/brief and allowed claims            |
| `motion-graphics-lesson`   | concept/script and desired tone                 |

## Local Skill Mapping

| Route                      | Existing Skills                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `longform-clip-factory`    | `source-media-analyze`, `longform-highlight-select`, `boundary-snap`, `highlight-approval`, `video-render`, `publish-prep-review` |
| `reddit-story-gameplay`    | `reddit-post-over-gameplay-short`, `reddit-story-short`, `gameplay-confession-short`, `short-form-captions`, `video-render`       |
| `topic-faceless-explainer` | `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`, `stock-footage-edutainment-short`, `video-render`                  |
| `ugc-avatar-product-short` | `ugc-avatar-short`, `saas-problem-solution-short`, `short-form-captions`, `publish-prep-review`                                   |
| `motion-graphics-lesson`   | `motion-card-lesson-short`, `animation-explainer-short`, `micro-doc-breakdown-short`, `video-render`                              |
