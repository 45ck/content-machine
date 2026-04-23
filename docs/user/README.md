# User Guide

Everything you need to use Content Machine.

Content Machine is now harness-first. The primary path is repo-local
skills, flows, and JSON-stdio harness scripts for Claude Code, Codex
CLI, and similar coding agents. The old CLI-first guides now live under
[`archive/legacy-cli/`](../../archive/legacy-cli/README.md).

## Primary Path: Claude Code / Codex CLI

1. [Harness Quickstart](HARNESS-QUICKSTART.md) — primary path for skills,
   flows, and harness scripts
2. [Configuration](CONFIGURATION.md) — defaults, providers, and
   data-driven resources
3. [Examples](EXAMPLES.md) — workflows and example outputs

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
