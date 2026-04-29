# Render Runtime Decision Matrix

Date: 2026-04-29

## Purpose

Short-form repos do not converge on one renderer. They converge on choosing a
renderer that matches the product shape: React-driven data videos, FFmpeg
composition, precise vector animation, mobile-editor handoff, or hosted batch
rendering. Content-machine should make that choice explicit before render.

## Source Signals

| Runtime family          | Sources                                                 | Best fit                                                                              | Risk                                                                           |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Remotion                | `rshorts`, OpenReels, Remotion prompt-to-video template | Data-driven shorts, caption-heavy edits, React preview, agent-controlled timeline     | Slower and heavier for simple cuts; license review needed for commercial scale |
| FFmpeg/Editly/MoviePy   | `mifi__editly`, ShortGPT-like repos, faceless factories | Fast declarative assembly, stock footage, audio ducking, overlays, simple transitions | Harder to build rich interactive preview and complex layout logic              |
| Motion Canvas           | `motion-canvas__motion-canvas`                          | Voice-synced diagrams, educational animation, vector explainers                       | Less natural for source-footage clipping                                       |
| CapCut draft/export     | ArcReel-style workflows                                 | Human handoff, mobile-native finishing, template-heavy social edits                   | Requires draft schema/version discipline and cannot be the only runtime        |
| Hosted or Lambda render | `rshorts` and app-style references                      | Queue-based rendering, preview first, user-triggered final render                     | Adds deployment and cost tracking complexity                                   |

## Decision Inputs

A render decision should be based on:

- archetype
- source media type
- caption complexity
- need for human preview/editing
- animation density
- batch size
- expected render duration
- platform target
- commercial licensing constraints
- required output artifacts

## Recommended Defaults

### Reddit Story Gameplay

Default: Remotion.

Reason: this lane needs synchronized captions, title intro, narration, music,
background video, playback-rate controls, and quick visual preview. The
`rshorts` schema maps directly to this model.

Fallback: FFmpeg/Editly when the output is a simple burned-in-caption assembly
and no interactive preview is required.

### Longform Clip Factory

Default: FFmpeg/Editly for final cut assembly plus separate crop/caption plans.

Reason: longform work is source-footage heavy and benefits from fast trims,
audio preservation, crop filters, and batch exports.

Use Remotion when the clip needs rich overlays, custom React captions, or a
browser preview/edit surface.

### Topic To Faceless Explainer

Default: Remotion for timeline-rich explainers, FFmpeg/Editly for simple stock
montage.

Reason: this lane splits into two products. A stock montage can be composed
declaratively; a chart/card/text explainer needs layout and timing control.

### Motion Graphics Lesson

Default: Motion Canvas for precise educational/vector animation.

Use Remotion when the lesson is mostly captions, cards, and media layout
rather than generated vector scenes.

### UGC Or Avatar Product Short

Default: Remotion when combining avatar video, screen capture, captions, and
product overlays.

Use CapCut draft export when the expected workflow is human finishing or
template reuse.

## Required Artifact

`render-runtime-decision.v1.json`:

- `selected_runtime`
- `runtime_family`
- `archetype`
- `platform_profile`
- `options_considered`
- `selection_reason`
- `license_notes`
- `preview_required`
- `human_handoff_required`
- `fallback_runtime`
- `decision_log_ref`

## Quality Gates

- Renderer choice must be recorded before render.
- Render report must name the runtime family and output profile.
- If a commercial license may apply, the decision should include a license
  note and fail open review until resolved.
- A fallback renderer should not silently change caption behavior, crop plan,
  or asset provenance.

## Bead Targets

This report supports:

- `content-machine-ar3`: crop-plan and asset-provenance artifacts.
- `content-machine-ar8`: DirectorScore scene-plan artifact.
- `content-machine-ar12`: render runtime decision gate.
