# Phase 6 — Rewrite product story and docs

**Bead:** `content-machine-7tf.7` · **Priority:** P0
**Source:** findings doc section 12 Phase 6
**Blocked by:** Phase 5

## Goal

Update `README.md`, `docs/user/`, and `docs/dev/` so the public story
matches the harness-first identity. Kill the monolithic "AI content
agent" framing.

## Actions

1. Rewrite the README opener: Content Machine as
   runtime + contracts + evaluator + skills substrate that harnesses
   call into.
2. Replace "install the CLI to generate videos" framing with "load the
   skill in your harness" as the default path; CLI reference drops to
   a sub-page.
3. Move stale how-to docs out of user-facing navigation. Preserve
   reference docs under `docs/reference/` but mark deprecated paths.
4. Link every major doc entry to the bead that owns its area.

## Acceptance

- Top of `README.md` reframes the product per the north star in
  [`../00-overview.md`](../00-overview.md).
- Outdated monolith language removed from user-facing docs.
- Navigation points first at skills + runtime + scripts; CLI is a
  demoted sub-link.
