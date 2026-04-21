# Codex Entry Point

Read `AGENTS.md` first.

Use Codex CLI as a local repo operator for this Markdown marketing system.

Codex CLI can read, change, and run code in a selected directory. In this repo, its main job is not heavy application code. Its main job is to maintain Markdown memory, generate artifacts, run validation scripts if added later, and keep the campaign knowledge base clean.

Primary docs:

- https://developers.openai.com/codex/cli
- https://developers.openai.com/codex/config-reference
- https://github.com/openai/codex

## Default mode

- Read relevant Markdown context.
- Create or update Markdown artifacts.
- Keep diffs scoped.
- Use run logs as memory.
- Do not overwrite product facts without citing the source inside Markdown.
