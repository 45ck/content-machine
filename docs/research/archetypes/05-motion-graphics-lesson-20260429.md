# Motion Graphics Lesson

Date: 2026-04-29
Archetype: programmed visual lesson, quote, or framework
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

This archetype uses animated cards, text, diagrams, 3D/motion effects, or
Manim-style visuals to explain an idea. It is strongest for abstract concepts,
quotes, lessons, math/science ideas, frameworks, and "watch this visual
metaphor" content.

## How Repos Make It

`dr34ming/shorts-project` combines Manim and Remotion. The Manim side uses a
transcript JSON with timed segments, demographic/style profiles, and template
evolution notes. The Remotion side supplies viral title animations, split
screens, and effects.

`calesthio/OpenMontage` is valuable for architecture rather than a single
visual. It treats the agent as the orchestrator, uses pipeline manifests,
stage director skills, style playbooks, and canonical artifacts such as
script, scene plan, asset manifest, edit decisions, and render report.

`DojoCodingLabs/remotion-superpowers` provides practical command docs for
creating 9:16 shorts in Remotion with hook/body/CTA structure, vertical
footage, music, and captions.

## Production Recipe

1. Convert topic/script to timed beats.
2. Choose motion grammar: text cards, diagram, kinetic type, 3D object,
   timeline, comparison, or split-screen.
3. Generate or author scene assets.
4. Render timed animation against voice/caption timestamps.
5. Add final captions and audio.
6. Export vertical MP4 with safe-zone review.

## Asset Strategy

The best reusable assets are templates and scene-type definitions, not raw
renders. Store successful templates, transcript examples, style profiles,
component maps, and contact sheets. Generated frames are useful as visual
evidence but should not become default runtime media.

## What To Pull Into content-machine

- Keep `motion-card-lesson` and `animation-explainer` as distinct lanes.
- Add an artifact for `scene_type` and `motion_grammar` per beat.
- Preserve template evolution notes so winning layouts can be promoted.
- Use Remotion when captions and layout require code-level control; use Manim
  or equivalent where precise geometry and educational animation matter.
