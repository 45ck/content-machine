# cm-mcp reference (20260126)

Start an MCP (Model Context Protocol) server that exposes Content Machine pipeline stages as agent-callable tools.

## Synopsis

```bash
cm mcp [options]
```

## Options

- `--transport <type>`: `stdio | httpStream` (default: `stdio`)
- `--host <host>`: HTTP host (only for `httpStream`, default: `127.0.0.1`)
- `--port <number>`: HTTP port (only for `httpStream`, default: `8080`)
- `--endpoint <path>`: HTTP endpoint path (only for `httpStream`, default: `/mcp`)
- `--stateless`: stateless mode (only for `httpStream`)
- `--unsafe-allow-network`: allow binding `httpStream` to a non-loopback host (default: off)
- `--artifacts-dir <path>`: artifacts root directory (default: `output/mcp` or `$CM_MCP_ARTIFACTS_DIR`)
- `--session-ttl-ms <ms>`: evict inactive sessions after ms (0 disables; default: 24h)
- `--max-sessions <n>`: max sessions to keep in memory (LRU eviction; default: 50)
- `--cleanup-artifacts-on-evict`: delete `output/mcp/<sessionId>/` when evicting sessions (default: off)
- `--sweep-interval-ms <ms>`: minimum interval between eviction sweeps (0 = every access; default: 60s)

## Tools exposed

- `research`: multi-source research (structured evidence)
- `generate_script`: topic → `script.json` (ScriptOutput)
- `generate_audio`: script → `audio.wav` + `timestamps.json` (AudioOutput)
- `match_visuals`: timestamps → visuals plan (VisualsOutput)
- `render_video`: visuals + timestamps + audio → `video.mp4` (RenderOutput)
- `get_session`: show what’s stored in session memory
- `reset_session`: clear in-memory session state

## Session + artifacts

- Default artifacts location: `output/mcp/<sessionId>/` (configurable via `$CM_MCP_ARTIFACTS_DIR` or `--artifacts-dir`)
- `stdio` transport runs as a single in-process session (all tool calls share one session context)
- `httpStream` transport supports per-client sessions (tool calls can share state via session IDs via the `Mcp-Session-Id` header)
- When `--stateless` is enabled (or when a client does not provide a session ID), tool calls do **not** share in-memory state between requests
- Any tool parameters ending in `Path` are restricted to the session artifacts directory (`output/mcp/<sessionId>/`). Relative paths are resolved under that directory.

## Examples

```bash
# Recommended for desktop/stdio clients (spawned per client)
cm mcp --transport stdio

# Run as an HTTP server
cm mcp --transport httpStream --port 8080

# Bind to all interfaces (be careful: exposes to your network)
cm mcp --transport httpStream --host 0.0.0.0 --port 8080 --unsafe-allow-network
```

## See also

- `docs/reference/cm-script-reference-20260106.md`
- `docs/reference/cm-audio-reference-20260106.md`
- `docs/reference/cm-visuals-reference-20260106.md`
- `docs/reference/cm-render-reference-20260106.md`
