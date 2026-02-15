# Composition

**Purpose:** A **composition** is a Remotion composition id that defines a video layout and rendering behavior (React component + timeline).

**Canonical terms:**

- **Composition** (preferred)
- Avoid: "layout" (composition is broader than layout)

**Data shape:**

- Selected by template `compositionId`
- Receives `RenderProps` as input props at render time

**Code references:**

- Remotion root registry: `src/render/remotion/root.tsx`
- Built-in compositions:
  - `src/render/remotion/ShortVideo.tsx` (`id="ShortVideo"`)
  - `src/render/remotion/SplitScreenGameplay.tsx` (`id="SplitScreenGameplay"`)
- Props schema: `src/render/schema.ts` (`RenderPropsSchema`)

**Related:**

- `docs/reference/video-templates-reference-20260107.md`
