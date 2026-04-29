# Content Machine Skill Pack

This directory is a portable copy of the Content Machine skill pack for coding-agent CLIs.

## Install

```bash
npm install @45ck/content-machine
```

## Use

- Skills live under `skills/`
- Flows live under `flows/`
- The packaged runner lives at `./node_modules/@45ck/content-machine/agent/run-tool.mjs`

Example:

```bash
cat skills/generate-short/examples/request.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs generate-short
```

The copied `SKILL.md` files already point at the packaged runner, so an agent can use them directly from this directory.
