# Multi-Provider Orchestration Roadmap (20260212)

## Scope

Implement production-safe multi-provider orchestration for the `visuals` stage while preserving CM's existing Ubiquitous Language and Pipeline Artifact contracts.

This roadmap uses existing CM terms only:

- Pipeline Workflow
- Pipeline Artifact (`timestamps.json`, `visuals.json`)
- Provider
- Motion Strategy

## Current Increment (implemented)

### Delivered capabilities

1. `Provider Routing Policy` in visuals stage

- Supported policies: `configured`, `balanced`, `cost-first`, `quality-first`
- Config surface: `visuals.routingPolicy`
- CLI surface: `cm visuals --routing-policy <policy>`

2. Budget-aware provider routing

- Image Providers are skipped when remaining generation budget cannot cover per-asset cost.
- Hard budget mode enforces deterministic sequencing by forcing visuals generation concurrency to `1` when needed.

3. Routing provenance in `visuals.json`

- Scene-level routing metadata in `matchReasoning`:
  - `selectedProvider`
  - `providerAttempts`
  - `routingPolicy`
  - `routingRationale`
  - `skippedProviders`
- Output-level metadata:
  - `providerRoutingPolicy`
  - `providerChain`

4. `cm generate` and Workflow default wiring

- `cm generate` now accepts:
  - `--visuals-provider <providerOrChain>`
  - `--visuals-fallback-providers <providers>`
  - `--visuals-routing-policy <policy>`
  - `--visuals-max-generation-cost-usd <amount>`
- Workflow defaults can set the same options to control orchestration policy per Workflow.

5. Provider outcome telemetry

- Visuals routing writes append-only telemetry records (`JSONL`) with per-provider attempts/success/failure/latency summary.
- Default path: `~/.cm/telemetry/visuals-routing.jsonl`

6. Asset lineage persistence

- Selected visual assets are recorded as append-only lineage records (`JSONL`) for downstream traceability.
- Default path: `~/.cm/assets/lineage/visual-assets.jsonl`

### Why this slice first

- Minimal blast radius: constrained to one Pipeline Stage (`visuals`).
- No breaking changes: fields are additive and optional.
- Enables policy tuning, auditability, and deterministic cost control now.

## Next increments

1. Cross-stage policy object in `cm generate`

- Normalize policy/config shape into one explicit object shared across stages (not just visuals).

2. Query and reporting tools for telemetry/lineage

- Add `cm` commands for viewing telemetry trends and lineage lookup by asset/scene/pipeline.

3. Policy gates

- Add pre/post generation policy gates with machine-readable gate outcomes in artifacts.

4. Evaluation loop

- Record provider outcomes (latency, success rate, fallbacks, cost) to tune router decisions empirically.

## Success criteria

- Visuals stage can enforce a hard generation budget without race conditions.
- `visuals.json` contains enough routing provenance to reconstruct provider decisions offline.
- Policy changes can be made through config/CLI without code changes.
