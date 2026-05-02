# User Guide

Everything you need to use Content Machine.

Content Machine is now a short-form video skill pack. The primary path
is repo-local skills and flows for Claude Code, Codex CLI, and similar
coding agents. Runtime scripts still exist as optional support
surfaces. The old CLI-first guides now live under
[`archive/legacy-cli/`](../../archive/legacy-cli/README.md).

## Primary Path: Claude Code / Codex CLI

1. [Installation](INSTALLATION.md) — local setup, optional dependencies,
   and install checks
2. [Agent Harness Install](AGENT-HARNESS-INSTALL.md) — copy-paste
   install prompt and materialized `.content-machine/` usage for Codex
   CLI, Claude Code, Cursor, and similar harnesses
3. [Agent Quickstart](AGENT-QUICKSTART.md) — primary path for skills,
   flows, and optional repo-side runners
4. [Archetypes](ARCHETYPES.md) — choose the lane before scripting,
   sourcing media, or rendering
5. [Showcase Gallery](showcase/README.md) — fast visual map of demos,
   skills, maturity, and what each lane proves
6. [Quality And Review](QUALITY-AND-REVIEW.md) — review gates for
   captions, audio, motion, safe zones, and promotion status
7. [Configuration](CONFIGURATION.md) — defaults, providers, and
   data-driven resources
8. [Creative Sources](CREATIVE-SOURCES.md) — resource scouting for
   animation, 3D, stock, audio, and AI generation sites
9. [Reddit Post Over Gameplay](examples/reddit-post-over-gameplay.md) —
   default Reddit story example
10. [Examples](EXAMPLES.md) — status summary and selected runnable
    walkthroughs
11. [Example Pages](examples/README.md) — categorized index of every
    page under `docs/user/examples/`

Default Reddit story mode is `reddit-post-over-gameplay`: full-screen
gameplay with a Reddit post card opener and captions, no random clips.
The split-screen page is a showcase for the supported hybrid mode, not
the generic default for every Reddit request.

Index roles:

- `showcase/README.md`: visual map for low-attention scanning.
- `EXAMPLES.md`: status summary plus curated runnable walkthroughs.
- `examples/README.md`: categorized file index for all example pages.

## Thin `cm` Shell

- `npm run cm -- --help` — remaining shell for `config`, `doctor`, `mcp`, and `render`
- [Legacy CLI Archive](../../archive/legacy-cli/README.md) — frozen command/docs history

## Shared Reference

- [Providers: Google Gemini](providers/gemini.md) — using Gemini as your LLM + visual provider
- [Demo Gallery](../demo/README.md) — tracked preview assets and maturity
  labels
- [Creative Sources](CREATIVE-SOURCES.md) — external source scouting
  rules plus the `1000`-site candidate catalog
- [Short-Form Archetype Research](../research/archetypes/README.md) —
  vendor/repo-derived archetype research, workflows, and quality rubrics
- [Vendor Archetype Backlog](../direction/09-vendor-archetype-backlog-20260429.md) —
  lanes to build next, one at a time

## Generated References

These are auto-generated from source — do not edit directly:

- [Environment Variables](../reference/ENVIRONMENT-VARIABLES.md)
- [Config Surface](../reference/CONFIG-SURFACE.md)
- [CLI Contract](../reference/CLI-CONTRACT.md)
- [Glossary](../reference/GLOSSARY.md)

## Need Help?

- [Open an issue](https://github.com/45ck/content-machine/issues) with `[question]` in the title
- Include the JSON output from
  [`doctor-report`](../../skills/doctor-report/SKILL.md), the command
  you ran, relevant env var names, and artifact paths under `runs/`
  when reporting bugs.
- See [SECURITY.md](../../SECURITY.md) for security reports
