# Agent Prompting Patterns

Use this when Claude Code, Codex CLI, Cursor, or another coding agent is
being asked to create SVG, HTML, CSS, React, or Remotion animation.

## Why Agents Drift

Agents make weaker motion when the prompt asks for vague polish:

- "make it premium"
- "add smooth animations"
- "make it look like TikTok"
- "make it more dynamic"

These prompts usually produce decorative motion, layout-shifting CSS,
unbounded values, unreadable text, and no review frames. Ask for a motion
system instead.

## Prompt Contract

Use this shape:

```text
Create a motion-led 1080x1920 short scene.

Before coding, write a motion brief with:
- fps and duration
- beat frames
- text hierarchy
- moving elements and why each moves
- entry, hold, transition, and exit timing
- caption and platform safe zones
- blocked effects
- review frames

Then implement with:
- frame-driven Remotion animation using useCurrentFrame/useVideoConfig
- clamped interpolate() values
- spring() only for short readable entrances
- transform/opacity over layout properties
- deterministic seeded variety only
- no CSS animation clocks inside Remotion
- no Math.random()
- no moving captions and moving cards at the same time

After coding, provide:
- files changed
- frame/time ranges to inspect
- known performance risks
- what would fail the motion-quality gates
```

## Good Agent Tasks

- "Build a kinetic headline card where the headline settles by frame 18,
  the proof chip enters at frame 26, and captions remain in
  `y=900..1380`."
- "Convert this static SVG card to frame-driven Remotion: path draw-on,
  two staggered labels, then a 20-frame hold."
- "Create a reusable motion token map for card entrance, word pop,
  diagram draw, scene reset, and CTA pulse."
- "Review this rendered MP4 contact sheet for jitter, black gutters,
  text collisions, and overanimated captions."

## Bad Agent Tasks

- "Add animations everywhere."
- "Use Framer Motion to make it smooth."
- "Use CSS keyframes for the Remotion scene."
- "Make all the text bounce."
- "Add random particles."

## Required Agent Review Loop

Do not accept code-only completion for animation work. Require:

- representative frame list
- contact sheet or frame samples when a render exists
- safe-zone statement
- audio/caption collision statement
- performance risk statement
- one revision pass if text is hard to read at phone size

## Claude/Codex Handoff

When installing this skill into a fresh project, include:

- the selected archetype
- target platform and resolution
- caption safe zone
- source media strategy
- whether animation is Remotion-native, standalone SVG, or HTML/CSS asset
- existing examples to imitate
- hard rejects: jitter, layout shifts, CSS clocks in Remotion, gutters,
  unreadable text, missing audio, missing captions

## Review Language

Use specific send-backs:

- "At frame 42 the caption overlaps the card CTA; move the CTA or delay
  its entrance."
- "The headline is still scaling during the active-word caption; freeze
  headline scale after frame 18."
- "The path draw is decorative; tie it to the spoken cause/effect beat or
  remove it."
- "The render uses CSS animation time; port it to frame-derived values."
- "The card enters smoothly but never holds; add a readable hold state."
