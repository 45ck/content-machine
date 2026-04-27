# User Guide

Everything you need to use Content Machine.

Content Machine is now a short-form video skill pack. The primary path is repo-local
skills and flows for Claude Code, Codex CLI, and similar coding
agents. Runtime scripts still exist as optional support surfaces. The
old CLI-first guides now live under
[`archive/legacy-cli/`](../../archive/legacy-cli/README.md).

## Primary Path: Claude Code / Codex CLI

1. [Agent Quickstart](AGENT-QUICKSTART.md) — primary path for skills,
   flows, and optional repo-side runners
2. [Configuration](CONFIGURATION.md) — defaults, providers, and
   data-driven resources
3. [Reddit Story Split-Screen](examples/reddit-story-split-screen.md) — current showcase/hybrid example
4. [Examples](EXAMPLES.md) — additional workflows and secondary example outputs

Default Reddit story mode is `reddit-post-over-gameplay`: full-screen
gameplay with a Reddit post card opener and captions, no random clips.
The split-screen page is a showcase for the supported hybrid mode, not
the generic default for every Reddit request.

## Thin `cm` Shell

- `npm run cm -- --help` — remaining shell for `config`, `doctor`, `mcp`, and `render`
- [Legacy CLI Archive](../../archive/legacy-cli/README.md) — frozen command/docs history

## Shared Reference

- [Providers: Google Gemini](providers/gemini.md) — using Gemini as your LLM + visual provider

## Generated References

These are auto-generated from source — do not edit directly:

- [Environment Variables](../reference/ENVIRONMENT-VARIABLES.md)
- [Config Surface](../reference/CONFIG-SURFACE.md)
- [CLI Contract](../reference/CLI-CONTRACT.md)
- [Glossary](../reference/GLOSSARY.md)

## Need Help?

- [Open an issue](https://github.com/45ck/content-machine/issues) with `[question]` in the title
- Include `--verbose` output when reporting bugs
- See [SECURITY.md](../../SECURITY.md) for security reports
