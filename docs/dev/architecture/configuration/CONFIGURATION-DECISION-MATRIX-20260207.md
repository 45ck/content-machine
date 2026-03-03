# Configuration Decision Matrix (v2) - 20260207

This document intentionally explores multiple approaches and scores them against criteria to minimize future rewrites.

## Criteria

We score each alternative (1-5) across:

- **Maintainability:** minimal duplication, easy to evolve safely
- **UX:** discoverable, readable, ergonomic for repeated iteration
- **Reproducibility:** deterministic and replayable
- **Extensibility:** supports packs, new fields, new subsystems
- **Safety:** avoids accidental code execution and footguns
- **Effort:** how quickly we can ship without breaking users

## Decision 1: Config File Format

Problem: current `src/core/config.ts` uses a simplified TOML parser, which blocks nested sections/arrays and therefore blocks "fully configurable" configs.

Alternatives (10):

1. Keep simplified TOML, add more ad-hoc parsing
2. Keep simplified TOML + recommend `.cmrc.json` for advanced
3. Adopt a real TOML parser library (parse full TOML)
4. Switch to JSON only
5. Support YAML
6. Support TS config (`content-machine.config.ts`)
7. Support "dotenv style" flat keys (`CM_CAPTIONS__FONT_SIZE=...`)
8. Support both TOML + JSON + env overrides (real parsers)
9. Use JSON5 (comments + trailing commas)
10. Use a "recipe" spec file only, no project config

Recommendation:

- **Pick #8** (TOML + JSON + env overrides), implemented incrementally.
  - TOML stays primary (human-friendly).
  - JSON remains supported for advanced/nesting parity and tooling.
  - Env override support remains "power-user" but makes CI and experiments easy.

Why not TS config (#6) as default: it executes code, complicates trust/safety and reproducibility; can be a future opt-in.

Scores (1-5, higher is better; effort=lower engineering cost):

| #   | Alternative                     | Maint |  UX | Repro | Ext | Safe | Effort | Total |
| --- | ------------------------------- | ----: | --: | ----: | --: | ---: | -----: | ----: |
| 1   | simplified TOML + ad-hoc        |     1 |   2 |     2 |   1 |    4 |      5 |    15 |
| 2   | simplified TOML + JSON advanced |     2 |   3 |     3 |   2 |    4 |      4 |    18 |
| 3   | real TOML parser                |     4 |   4 |     4 |   4 |    4 |      3 |    23 |
| 4   | JSON only                       |     3 |   2 |     4 |   4 |    4 |      4 |    21 |
| 5   | YAML                            |     2 |   3 |     4 |   4 |    4 |      3 |    20 |
| 6   | TS config                       |     3 |   4 |     3 |   5 |    1 |      3 |    19 |
| 7   | env flat keys only              |     2 |   1 |     3 |   3 |    4 |      4 |    17 |
| 8   | TOML + JSON + env               |     4 |   4 |     5 |   5 |    4 |      2 |    24 |
| 9   | JSON5                           |     3 |   3 |     4 |   4 |    4 |      3 |    21 |
| 10  | recipe only                     |     3 |   2 |     5 |   4 |    4 |      2 |    20 |

## Decision 2: Precedence Model

Problem: multiple surfaces exist (config file, templates, workflows, CLI). Without a clear merge order, users can't predict outcomes.

Alternatives (10):

1. CLI only (no config)
2. Config only (no CLI overrides)
3. Template-only (everything is a template)
4. Workflow-only (everything is a workflow)
5. "Last writer wins" merge across all sources
6. CSS-like cascade with explicit order and source tracking
7. Stage-local config only (script/audio/render each reads its own file)
8. Immutable recipes only (you must create a spec file for each run)
9. "Profiles" only (tiktok/reels/shorts), minimal overrides
10. Hybrid: cascade + recipes + optional profiles

Recommendation:

- **Pick #10**: cascade + recipes + profiles (optional).
  - Cascade provides sane defaults and simple overrides.
  - Recipes enable reproducible experiments and sharing a single run config.
  - Profiles provide ergonomic "platform presets" without complexity.

Scores:

| #   | Alternative                           | Maint |  UX | Repro | Ext | Safe | Effort | Total |
| --- | ------------------------------------- | ----: | --: | ----: | --: | ---: | -----: | ----: |
| 1   | CLI only                              |     2 |   2 |     1 |   2 |    4 |      5 |    16 |
| 2   | config only                           |     3 |   3 |     4 |   3 |    4 |      3 |    20 |
| 3   | template only                         |     3 |   3 |     4 |   3 |    4 |      3 |    20 |
| 4   | workflow only                         |     2 |   2 |     3 |   3 |    3 |      3 |    16 |
| 5   | last-writer-wins                      |     2 |   2 |     3 |   3 |    4 |      4 |    18 |
| 6   | cascade + source tracking             |     4 |   4 |     5 |   5 |    4 |      2 |    24 |
| 7   | stage-local configs                   |     2 |   2 |     3 |   3 |    4 |      3 |    17 |
| 8   | immutable recipes only                |     3 |   2 |     5 |   4 |    4 |      2 |    20 |
| 9   | profiles only                         |     3 |   4 |     3 |   2 |    4 |      4 |    20 |
| 10  | hybrid (cascade + recipes + profiles) |     4 |   5 |     5 |   5 |    4 |      2 |    25 |

## Decision 3: Shareability Mechanism

Problem: users want to share a complete "look": templates + captions + audio mix + prompts.

Alternatives (10):

1. Copy/paste config files repo-to-repo
2. Git submodules with `config/` folder
3. NPM packages containing JSON presets
4. Zip pack installer (like templates/workflows already do)
5. Remote registry (future)
6. "Pack directories" searched locally in standard paths
7. Pure code plugins (Node modules)
8. Hybrid: data packs + optional code plugins
9. Only support templates/workflows; everything else via CLI
10. Use "recipes" as the only shareable unit

Recommendation:

- **Pick #8**: data packs first, optional code plugins later.
  - Data packs solve 80%: caption presets, mix presets, assets.
  - Code plugins are powerful but risky; keep gated.

Scores:

| #   | Alternative                   | Maint |  UX | Repro | Ext | Safe | Effort | Total |
| --- | ----------------------------- | ----: | --: | ----: | --: | ---: | -----: | ----: |
| 1   | copy/paste files              |     1 |   2 |     2 |   1 |    4 |      5 |    15 |
| 2   | git submodules                |     3 |   2 |     4 |   3 |    4 |      3 |    19 |
| 3   | npm packages (data)           |     4 |   3 |     4 |   4 |    4 |      2 |    21 |
| 4   | zip pack installer            |     4 |   4 |     4 |   4 |    4 |      3 |    23 |
| 5   | remote registry               |     3 |   4 |     4 |   5 |    3 |      1 |    20 |
| 6   | search local pack dirs        |     3 |   3 |     3 |   4 |    4 |      3 |    20 |
| 7   | code plugins only             |     3 |   3 |     3 |   5 |    1 |      2 |    17 |
| 8   | data packs + optional plugins |     4 |   4 |     5 |   5 |    3 |      2 |    23 |
| 9   | templates/workflows only      |     3 |   2 |     3 |   2 |    4 |      4 |    18 |
| 10  | recipes only                  |     3 |   3 |     5 |   3 |    4 |      2 |    20 |

## Decision 4: Avoiding Duplication (Write-Once)

Problem: flags, config schema, docs, and UI controls can easily drift.

Alternatives (10):

1. Manual updates (status quo)
2. Generate docs from Commander flags
3. Generate flags from Zod schema
4. Introduce a "ConfigKey registry" as SSoT and generate schema/flags/docs/UI
5. Keep separate but add a linter to detect missing docs
6. Restrict to config-only (no flags) to reduce duplication
7. Restrict to flags-only (no config) and teach users shell aliases
8. Use JSON schema as SSoT
9. Use OpenAPI-like spec for config
10. Keep duplication but add lots of tests

Recommendation:

- **Start with #3** (expand config schema, map to CLI selectively), then graduate to **#4** if/when needed.
  - A full registry is great but expensive.
  - Zod schema already exists and is idiomatic in this repo; leverage it.

Scores:

| #   | Alternative              | Maint |  UX | Repro | Ext | Safe | Effort | Total |
| --- | ------------------------ | ----: | --: | ----: | --: | ---: | -----: | ----: |
| 1   | manual updates           |     1 |   2 |     2 |   1 |    4 |      5 |    15 |
| 2   | docs from commander      |     2 |   2 |     2 |   2 |    4 |      4 |    16 |
| 3   | flags from Zod           |     3 |   3 |     3 |   4 |    4 |      2 |    19 |
| 4   | config key registry SSoT |     5 |   4 |     5 |   5 |    4 |      1 |    24 |
| 5   | separate + linter        |     3 |   2 |     3 |   3 |    4 |      3 |    18 |
| 6   | config-only              |     4 |   2 |     4 |   3 |    4 |      2 |    19 |
| 7   | flags-only               |     2 |   2 |     2 |   2 |    4 |      4 |    16 |
| 8   | JSON schema SSoT         |     4 |   3 |     4 |   4 |    4 |      2 |    21 |
| 9   | OpenAPI-like spec        |     3 |   2 |     4 |   4 |    4 |      1 |    18 |
| 10  | duplication + tests      |     2 |   2 |     3 |   2 |    4 |      3 |    16 |

## Decision 5: How Users Customize Captions

Problem: captions are the main quality driver; users want deep control, but must avoid jitter and unsafe layouts.

Alternatives (10):

1. Hard-code presets only
2. CLI flags only
3. Template defaults only
4. Config file `captions` section that supports `captionPreset + captionConfig overrides`
5. External "caption preset pack" files (data)
6. In-Lab editor that writes a preset file
7. "Brand kit" that affects typography/colors only
8. Full theme system (design tokens)
9. Render component plugins
10. A/B-only tuning without permanent config

Recommendation:

- **Pick #4 + #5 + #7**:
  - Project config chooses preset and overrides.
  - Packs provide reusable presets.
  - Brand kits provide safe typography/color consistency.

Scores:

| #   | Alternative                   | Maint |  UX | Repro | Ext | Safe | Effort | Total |
| --- | ----------------------------- | ----: | --: | ----: | --: | ---: | -----: | ----: |
| 1   | presets hard-coded            |     3 |   2 |     3 |   2 |    4 |      4 |    18 |
| 2   | CLI flags only                |     2 |   2 |     2 |   3 |    4 |      4 |    17 |
| 3   | template defaults only        |     3 |   3 |     4 |   3 |    4 |      3 |    20 |
| 4   | config preset + overrides     |     4 |   4 |     4 |   4 |    4 |      3 |    23 |
| 5   | caption preset packs          |     4 |   4 |     4 |   5 |    4 |      2 |    23 |
| 6   | in-lab editor writes preset   |     3 |   5 |     4 |   4 |    4 |      1 |    21 |
| 7   | brand kit (typography/colors) |     5 |   4 |     4 |   3 |    4 |      3 |    23 |
| 8   | full theme tokens             |     4 |   4 |     5 |   5 |    4 |      1 |    23 |
| 9   | render component plugins      |     2 |   3 |     3 |   5 |    2 |      1 |    16 |
| 10  | A/B only, no persistence      |     3 |   3 |     2 |   2 |    4 |      3 |    17 |
