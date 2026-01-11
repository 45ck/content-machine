# IMPL: On-Demand Assets & Dependency Management (20260111)

**Date:** 2026-01-11  
**Status:** Draft  
**Owners:** content-machine maintainers

---

## 0. Executive Summary

The project already contains multiple “download only what you need” mechanisms:

1. **Render-time per-URL downloads** (remote stock footage) with a cache and a `--no-download-assets` escape hatch.
2. **Explicit setup** for heavyweight runtime deps (Whisper: `cm setup whisper`).
3. **Targeted per-item downloads** for libraries (hooks: `cm hooks download <id>` / `--download-hook`).

This is the right direction, but UX is inconsistent because:

- Preflight does not surface missing assets (Whisper/hook clips) as actionable checks.
- Download policy is fragmented (some things download automatically, others never do).
- Cache locations differ by subsystem (project `.cache/*` vs `~/.cm/*`).

### Recommendation (phased, lowest risk)

- **Phase 1:** Standardize preflight checks + fix lines for missing assets across `generate`/`render`/`audio`/`timestamps`.
- **Phase 2:** Add a minimal shared “download policy” layer (`--offline`, `--yes`) and unify cache conventions incrementally (still subsystem-owned downloaders).
- **Phase 3 (optional):** Introduce a centralized Asset Manager only if/when we add remotely hosted packs (templates/fonts/audio packs) and duplication becomes painful.

---

## 1. Problem Definition

We want:

- A small install that doesn’t imply “download all videos/fonts/models”.
- Targeted downloads (only the assets a chosen run actually requires).
- Automatic acquisition _as part of the process_ only when explicitly allowed (avoid surprise multi-GB downloads).
- Consistent, scriptable behavior (`--json`, stable stdout, meaningful exit codes).

Constraints from existing CLI standards:

- stdout is reserved for the primary artifact (path/JSON).
- stderr is for progress and human summaries.
- errors must include a one-line `Fix:` suggestion (and `context.fix` in JSON mode).

---

## 2. Current System Deep Dive (What Exists Today)

### 2.1 Distribution / Install

Current developer install:

- `git clone …`
- `npm install`
- `npm run cm -- <command>`

Planned user install (npm):

- `npm i -g content-machine` or `npx content-machine`
- package should ship only `dist/**` + small `assets/**` (no `vendor/`, docs, tests).

### 2.2 Asset types in this product

| Asset type             | Example                         | Size profile | Determinism                   | Licensing risk | “Must have”?               |
| ---------------------- | ------------------------------- | -----------: | ----------------------------- | -------------- | -------------------------- |
| Runtime model + binary | Whisper model + whisper.cpp     |        large | pinned version possible       | low            | required for audio-first   |
| Hook library clips     | transitionalhooks `no-crunch`   |       medium | pinned URL, checksum optional | medium         | optional                   |
| Stock footage          | Pexels URLs from `visuals.json` | medium/large | dynamic                       | medium         | optional                   |
| Fonts                  | Inter woff2                     |        small | deterministic                 | low            | practically yes (captions) |
| Template packs         | zip template + assets           |       medium | deterministic                 | depends        | optional                   |
| Music/SFX packs        | audio files                     | medium/large | deterministic                 | high           | optional                   |

Key observation: not all “assets” are the same. Some are versionable and deterministic (fonts, templates, Whisper), others are provider-driven (stock footage), and some are licensing-sensitive (music/SFX).

### 2.3 Existing downloaders & caches

#### Remote stock footage (render-time)

- Downloads only referenced URLs when `--download-assets` (default true).
- Cache root defaults to `./.cache/content-machine/assets` (project-local), override via `CM_ASSET_CACHE_DIR`.
- Failures are best-effort: if a download fails, render falls back to streaming URLs.

Relevant modules:

- `src/render/assets/remote-assets.ts`
- `src/render/service.ts` (`resolveAssetCacheRoot()` and bundling pipeline)

#### Whisper (runtime dependency)

- Setup: `cm setup whisper` downloads a model and installs whisper.cpp via `@remotion/install-whisper-cpp`.
- Runtime: ASR tries whisper; auto-install is **opt-in** only via `CM_WHISPER_AUTO_INSTALL=1`.
- Whisper folder is currently `./.cache/whisper` (project-local).

Relevant modules:

- `src/cli/commands/setup.ts`
- `src/audio/asr/index.ts`

#### Hooks (library + per-item download)

- Hook definitions live in a typed library list (`HookDefinition[]`).
- `cm hooks download <id>` downloads a single clip to `~/.cm/assets/hooks/<library>/<filename>`.
- `--download-hook` on `cm generate`/`cm render` downloads missing hook clip when `--hook <id>` refers to the library.

Relevant modules:

- `src/cli/commands/hooks.ts`
- `src/hooks/libraries/transitionalhooks.ts`
- `src/hooks/resolve.ts`

#### Templates (local install only)

- `cm templates install <path.zip|dir>` installs into `~/.cm/templates/<id>/`.
- No remote registry / download mechanism.

Relevant modules:

- `src/cli/commands/templates.ts`
- `src/render/templates/installer.ts`

### 2.4 Preflight coverage

`cm generate --preflight` currently checks:

- workflow/template resolution errors
- input file presence + schema validation for provided artifacts
- env vars for LLM + visuals provider
- gameplay path requirements

It does **not** check:

- Whisper availability relative to pipeline mode
- hook clip availability (library id mode)
- ffmpeg/ffprobe presence for relevant operations

---

## 3. Design Space (Approaches)

There are three orthogonal axes:

1. **How assets are delivered**
2. **Where assets are cached**
3. **When/how assets are acquired**

### 3.1 Delivery mechanisms

1. Bundle inside npm package (good for small assets; bad for large media/models).
2. Runtime download by CLI (good for Whisper; needs integrity/hosting).
3. Local pack install (good for enterprise/internal distribution).
4. Separate distributables (Docker images, packaged binaries).
5. System package manager prerequisites (apt/brew/choco).
6. Remote services instead of local assets (e.g., hosted ASR).
7. NPM “asset packs” as companion packages (optional dependencies).

### 3.2 Cache location strategies

A) Project-local cache (`./.cache/...`)  
B) User-global cache (`~/.cm/...`)  
C) Content-addressable store (`sha256/<hash>` + metadata)

### 3.3 Acquisition/trigger strategies

α) Explicit setup only  
β) Auto-download on first use (opt-in)  
γ) Preflight-first (report missing deps + fixes)  
δ) Interactive prompts (TTY only; must degrade for `--json`/CI)

---

## 4. Options Matrix (Rated)

### 4.1 Scoring rubric

Scores: 1 (poor) to 5 (excellent).

Criteria:

- **UX (first run):** minimal friction for creator-operators.
- **Automation:** works in CI/non-interactive/`--json`.
- **Minimal downloads:** users only fetch what’s needed.
- **Determinism:** pinned versions, reproducible runs.
- **Security:** integrity verification, safe extraction, minimized supply-chain risk.
- **Complexity:** implementation and maintenance cost.

### 4.2 Options (dominant strategies)

#### Option 0 — Status quo (subsystem-specific, ad hoc)

- Keep downloads where they are, no new shared policy or planning.

#### Option 1 — Standardize within the current architecture (recommended)

- Keep subsystem-owned downloaders.
- Add missing preflight checks + consistent fix lines.
- Add minimal shared policy flags (`--offline`, `--yes`) and unify cache conventions incrementally.

#### Option 2 — Requirements graph + delegated installers (moderate uplift)

- Introduce an internal “requirements” layer (pure functions) used by preflight and commands.
- Keep downloaders in subsystems, but unify discovery/planning and policy gating.

#### Option 3 — Central Asset Manager (local registry only)

- Add `cm assets ...` and local registry/state store.
- Downloaders move behind a shared interface.
- Remote registry is out-of-scope initially.

#### Option 4 — Central Asset Manager + remote registry/packs

- Full “asset platform”: remote manifest, checksums, packs (templates/fonts/audio).

#### Option 5 — Container-first distribution (Docker)

- Provide images with prebaked assets; CLI becomes thin wrapper.

#### Option 6 — NPM “asset packs” (optional dependencies / companion packages)

- Publish heavyweight assets as separate npm packages; users opt in by installing pack(s).

#### Option 7 — System package manager prerequisites

- Rely on apt/brew/choco to install prerequisites (ffmpeg, whisper binaries, potentially models).

#### Option 8 — Remote ASR (service instead of local Whisper)

- Replace local whisper.cpp with a hosted transcription API for word timestamps.

### 4.3 Ratings (1–5)

| Option                    | UX (first run) | Automation | Minimal downloads | Determinism | Security | Complexity | Notes                                         |
| ------------------------- | -------------: | ---------: | ----------------: | ----------: | -------: | ---------: | --------------------------------------------- |
| 0 Status quo              |              2 |          3 |                 3 |           2 |        2 |          1 | inconsistent policies; hidden surprises       |
| 1 Standardize + preflight |              4 |          5 |                 4 |           4 |        4 |          2 | best ROI; aligns with current code            |
| 2 Requirements graph      |              4 |          5 |                 4 |           4 |        4 |          3 | cleaner long-term, still incremental          |
| 3 Asset Manager (local)   |              3 |          5 |                 5 |           5 |        5 |          4 | strong platform, significant refactor         |
| 4 Asset Manager (remote)  |              4 |          5 |                 5 |           5 |        5 |          5 | needs hosting, signing, ops burden            |
| 5 Docker-first            |              4 |          4 |                 2 |           4 |        4 |          3 | “downloads” become image pulls                |
| 6 NPM asset packs         |              2 |          4 |                 2 |           5 |        4 |          3 | coarse-grained packs; npm bloat risk          |
| 7 System packages         |              2 |          4 |                 4 |           3 |        5 |          2 | cross-platform docs burden; variable versions |
| 8 Remote ASR              |              4 |          5 |                 5 |           2 |        3 |          3 | adds cost/privacy/network dependency          |

Interpretation:

- If the goal is “don’t download the entire library”, **Option 1/2** are sufficient.
- Asset Manager options (3/4) become attractive when we add multiple remotely hosted packs and need unified lifecycle management.
- Remote ASR (8) is a valid “no local downloads” path, but trades offline/privacy/cost for convenience.

---

## 5. Recommended Architecture (Detailed)

### 5.1 Near-term target (Option 1 → Option 2)

Keep downloads in subsystems, but standardize:

1. **Requirement discovery (pure)**

- “Given options, what assets/deps are required?”
- Used by `--preflight`, and by commands for better error messages.

2. **Policy**

- A minimal shared policy surface:
  - `--offline`: never download; fail with fix
  - `--yes`: allow safe downloads non-interactively (only where we already have an installer)
  - env/config toggles where appropriate (e.g., Whisper)

3. **Cache path conventions**

- Keep existing env override patterns.
- Move toward stable defaults with two scopes:
  - user-global: `~/.cm/…` for heavyweight reusable deps
  - project-local: `./.cache/…` for render-bundle caches

### 5.2 API sketch (internal)

```ts
type RequirementSeverity = 'required' | 'optional';

type Requirement = {
  id: string;
  severity: RequirementSeverity;
  reason: string;
  fix?: string;
  // Must be safe to run during preflight (no network / no side effects).
  check: () => Promise<{ ok: boolean; detail?: string }>;
  // Only invoked when policy allows.
  install?: () => Promise<void>;
};
```

### 5.3 Mapping to existing preflight checks

Current `PreflightCheck` is already close:

- `label` → human summary
- `status` → ok/warn/fail
- `fix` → one-line recovery command
- `code` → stable error code

Extend preflight with checks such as:

- **Whisper requirement**
  - if pipeline is audio-first or `--require-whisper`:
    - check model file presence at configured location
    - check whisper binary presence (as available via library API)
  - fix: `cm setup whisper --model <model>`
- **Hook requirement**
  - if `--hook <id>` resolves to library entry:
    - check file exists in hooks dir
  - fix: `cm hooks download <id> --library <lib>`

---

## 6. Download Policy (What “Auto” Means)

We need to avoid the worst case:

> user runs `cm generate`, CLI silently downloads 1–3GB of models and a pile of media.

Policy rules (recommended):

- Default behavior is **no heavyweight auto-download**.
- Auto-download requires an explicit signal:
  - command flag (e.g., `--download-hook`)
  - env var (e.g., `CM_WHISPER_AUTO_INSTALL=1`)
  - future config `assets.autoDownload = true`
- Interactive prompts are allowed later, but must be disabled in:
  - `--json`
  - non-TTY
  - CI

---

## 7. Integrity, Security, and Legal

### 7.1 Integrity

Current hook/stock downloads are “best effort” and do not verify checksums.

If we add remote packs (templates/fonts/audio), require:

- manifest with `sha256` for each file
- atomic downloads (`.part` → rename)
- safe extraction (path traversal protection)

### 7.2 Security

- Treat downloaded zips as untrusted (path traversal, zip bombs).
- Be careful with “download arbitrary URL” features (SSRF risk in server contexts).
- Ensure “Fix:” lines do not encourage unsafe shell patterns.

### 7.3 Licensing

- Music/SFX packs should remain explicit user-provided or explicitly installed; never auto-download by default.
- Stock providers have their own terms; preserve attribution metadata where possible.

---

## 8. Testing Strategy

- Unit: requirement checks are pure; downloaders use mocked `fetch`.
- Integration: `--preflight` includes missing asset checks and emits fix lines; `--json` outputs a single envelope.
- V&V: first-run drills in TTY, non-TTY, and `--json`.

---

## 9. Rollout Plan

1. Expand preflight checks (surface missing assets).
2. Add `--offline` and `--yes` (policy surface) once checks are trustworthy.
3. Unify cache defaults (whisper/hooks/asset cache), keeping env overrides for backwards compatibility.
4. Re-evaluate whether an Asset Manager is justified once downloadable packs beyond Whisper/hooks exist.

---

## 10. Related

- Feature spec: `docs/features/feature-on-demand-assets-20260111.md`
- CLI UX standards: `docs/guides/guide-cli-ux-standards-20260106.md`
- Errors + fix lines: `docs/guides/guide-cli-errors-and-fix-lines-20260107.md`
- Existing code:
  - `src/audio/asr/index.ts`
  - `src/hooks/resolve.ts`
  - `src/render/assets/remote-assets.ts`
  - `src/cli/commands/generate.ts` (preflight)
