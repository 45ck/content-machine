# Feature: Remotion Extension Packs (Code Templates + Animation Packs)

**Date:** 2026-02-07  
**Status:** Implemented (Code templates + TemplateSDK; animation packs TBD)  
**Owners:** content-machine core

---

## Problem

CM templates are intentionally **data-only** (`template.json`) per ADR-003. This keeps installs safe and reproducible, but it blocks a high-value workflow:

- users want to **reuse Remotion animations/components** (from Remotion templates, community repos, or their own code) without forking CM.
- they want to swap “looks” quickly (transitions, motion, overlays) while still using the CM pipeline inputs (voiceover, word timestamps, visuals).

We need an opt-in way to run _template-provided Remotion code_ and/or import animation libraries, without weakening the default security posture.

---

## Goals

- Keep **data-first templates** as the default and recommended path.
- Add a **trusted mode** to render using a template-provided Remotion project (full power).
- Provide a scalable path to “animation packs” (transitions/motion/overlays) that can be reused across templates.
- Maintain the existing CM render contract (`RenderProps`) so templates stay compatible with the pipeline artifacts.

## Non-goals (v1)

- Running untrusted template code by default.
- A remote marketplace/registry (start with local dirs + zip packs, which we already support).
- Perfect sandboxing for multi-tenant servers (if we do this later, it needs container isolation).

---

## Key Idea: Two Extension Levels

### Level 1: Code Templates (Template-Provided Remotion Project)

Template pack includes a Remotion entrypoint + compositions.

Pros:

- Maximum flexibility: any animations, layouts, overlays.
- “Directly import Remotion animations” becomes straightforward: template authors can copy/paste or install any Remotion animation library and use it in their compositions.

Cons:

- Executes arbitrary JS/TS when bundling and rendering.
- Dependency resolution + caching become important.

### Level 2: Animation Packs (Reusable Building Blocks)

Animation pack is an installable module (or template pack subfolder) that exports:

- transitions (scene-to-scene)
- motion strategies (for still images)
- overlays (lower thirds, badges, progress bars)

The pack is consumed by _either_:

- CM built-in compositions (curated + safe), or
- code templates (full power).

This is how we eventually get “import animations” without forcing every user to build a full template.

---

## Proposed UX

### Template authoring

- `cm templates new <id> --mode data` (existing behavior; data-only)
- `cm templates new <id> --mode code` (new; scaffolds a Remotion project under the template dir)

Template directory layout for code templates:

```
my-template/
  template.json
  remotion/
    index.ts         # Remotion entrypoint (registerRoot)
    root.tsx         # registers compositions
    compositions/
      MyComposition.tsx
  public/            # optional static files
  assets/            # optional template-local assets (fonts/overlays)
```

### Rendering

- Default behavior (safe): `cm render --template <id|path>` uses CM’s built-in entrypoint + compositions.
- Opt-in code templates: `cm render --template <id|path> --allow-template-code`
  - Without the flag, code templates error with a clear message: “This template contains executable code; re-run with `--allow-template-code`.”

### Installing animation packs (future)

- `cm animations install <path|zip|npm>` (optional future command)
- `cm templates install <path|zip>` (already exists; code templates can be distributed as template packs)

---

## Template Spec Changes (Backward Compatible)

Extend `template.json` with an optional `remotion` block.

Example:

```json
{
  "schemaVersion": "1.1.0",
  "id": "my-fancy-template",
  "name": "My Fancy Template",
  "compositionId": "FancyShort",
  "defaults": { "orientation": "portrait", "fps": 30, "captionPreset": "tiktok" },
  "params": { "transition": "wipe", "motionPack": "cinematic-v1" },
  "remotion": {
    "entryPoint": "remotion/index.ts",
    "rootDir": ".",
    "publicDir": "public"
  }
}
```

Semantics:

- If `remotion.entryPoint` is missing: template is **data-only** (today’s behavior).
- If `remotion.entryPoint` is present: template is a **code template** and requires explicit opt-in.

---

## Render Contract Changes (Enabling Templates)

Add template metadata into `RenderProps` (optional fields; safe for existing compositions):

- `templateId?: string`
- `templateParams?: Record<string, unknown>`
- `templateSource?: string` (builtin/user/project/file)

This lets:

- built-in compositions adjust behavior based on template params (no code execution required).
- code templates receive the same information without special CLI parsing.

---

## Dependency / Bundling Strategy (Critical)

Code templates must bundle reliably without forcing users to manage a second `node_modules`.

Recommended model for v1:

- Code templates should be “thin”: import `react`/`remotion` from the host, and import CM’s template SDK helpers.
- CM bundler uses `@remotion/bundler` with a `webpackOverride` to ensure the host `node_modules` (where CM is installed) is on the resolver path.

Optional model (later):

- “Self-contained templates” that include their own `package.json` and dependencies.
- Installer can run `npm ci` in the template dir (heavy; increases surface area and risk).

---

## Security Model

Code templates are arbitrary code. We must make this explicit.

Rules:

- Default: **deny** code templates.
- Allow only with `--allow-template-code` (and optionally a `.content-machine.toml` setting like `render.allowTemplateCode = true`).
- When running as a server (future), restrict to an allowlist or run in containers.

---

## Implementation Plan (Incremental)

### Phase 1: Add Code Template Support (Smallest Viable)

1. Extend `VideoTemplateSchema` to include optional `remotion.entryPoint/rootDir/publicDir`.
2. Extend `RenderVideoOptions` to accept `remotionEntryPoint?: string` and template metadata.
3. Update `src/render/service.ts` bundling to accept a per-render entrypoint:
   - `bundle({ entryPoint, webpackOverride, rootDir, publicDir, enableCaching })`
4. Update CLI:
   - Add `--allow-template-code` to `cm render` and `cm generate`.
   - If template has `remotion.entryPoint` and flag not set: error with fix.
5. Extend `RenderPropsSchema` with `templateId/templateParams/templateSource`.
6. Thread `template.params` into `RenderProps` automatically.

### Phase 2: Template SDK + Scaffolding

1. Add a stable “template SDK” import surface:
   - shared components: captions, audio layers, scene background, safe zone helpers
   - types: `RenderProps`, `CaptionConfig`, etc
2. Add `cm templates new --mode code` to scaffold a working Remotion project wired to `RenderProps`.
3. Add an example code template in-repo for dogfooding (e.g. `templates/fancy-transitions/`).

### Phase 3: Animation Packs (Optional)

1. Define a simple registry contract (IDs -> components) for:
   - scene transitions
   - image motion strategies
   - overlays
2. Allow template params to pick animation IDs.
3. Add “curated packs” shipped with CM (safe, reviewed).
4. Optional: allow external packs for code templates (no extra work; they can import anything).

---

## Open Questions

- Do we want code templates to be allowed for `cm render` only, or also `cm generate` (end-to-end)?
- Should the opt-in be a flag, a config knob, or both?
- What’s the minimum SDK surface area that prevents template authors from copy/pasting CM internals?
- Do we want to support self-contained templates with their own dependencies, or enforce “thin templates” only?
