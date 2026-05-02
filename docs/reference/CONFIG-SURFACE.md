# Config Surface

> DO NOT EDIT: generated from `registry/repo-facts.yaml`.

## Files & Locations

## dotenv

- Path: `.env`
- Secrets: `true`
- Purpose: Secrets and local overrides (API keys, etc).

## dotenv-example

- Path: `.env.example`
- Secrets: `false`
- Purpose: Documented environment variable names plus safe placeholder/default values.

## project-config

- Path: `.content-machine.toml`
- Secrets: `false`
- Purpose: Project configuration (non-secret defaults).

## installed-skill-pack

- Path: `./.content-machine/`
- Secrets: `false`
- Purpose: Materialized Content Machine skills, flows, README, and agent instructions installed into another project.

## project-data

- Path: `./.cm/`
- Secrets: `false`
- Purpose: Project-scoped installs (templates/workflows/archetypes/etc).

## user-data

- Path: `~/.cm/`
- Secrets: `false`
- Purpose: User-scoped installs (templates/workflows/archetypes/assets/etc).

## output-dir

- Path: `./output/`
- Secrets: `false`
- Purpose: Default output directory for pipeline artifacts.

## Precedence

- `CLI flags`
- `.env (if present)`
- `.content-machine.toml (if present)`
- `built-in defaults`

## Project Config Candidates

- `.content-machine.toml`
- `content-machine.toml`
- `.cmrc.json`

## User Config Candidates (under home directory)

- `.cm/config.toml`
- `.cm/config.json`
- `.cmrc.json`
