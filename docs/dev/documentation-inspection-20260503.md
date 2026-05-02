# Documentation Inspection - 2026-05-03

This is a Fagan-style documentation inspection of the repo's public
documentation and organization. It combines five independent review passes
with a local inventory of the Markdown corpus.

## Scope

| Surface                                  |                                                          Count | Inspection Treatment                                                                    |
| ---------------------------------------- | -------------------------------------------------------------: | --------------------------------------------------------------------------------------- |
| All Markdown files                       |                                                          2,736 | Inventoried and grouped by surface                                                      |
| `docs/` Markdown files                   |                                                          2,423 | Public/user/dev/reference surfaces inspected; imported research grouped                 |
| `docs/research/` Markdown files          |                                                          2,182 | Grouped as research corpus, not user onboarding docs                                    |
| `docs/research/external/` Markdown files |                                                          1,869 | Grouped as imported source material                                                     |
| `docs/user/` Markdown files              |                                                             32 | Independently rated                                                                     |
| `docs/reference/` Markdown files         |                                                             36 | Representative generated references rated                                               |
| `docs/direction/` Markdown files         |                                                             23 | Grouped; active direction docs sampled                                                  |
| `skills/` Markdown files                 |                                                            155 | `skills/README.md` and representative `SKILL.md` docs rated; all skill docs inventoried |
| Shipped skill docs                       |                                           61 plus one template | Catalog-level inspection                                                                |
| Flow docs                                | 4 operator docs, 4 `.flow` manifests, one template, one README | Independently rated                                                                     |

The repo has enough imported and generated material that "every Markdown file
is a user doc" is the wrong organizing model. The useful distinction is:

- **onboarding docs**: explain what Content Machine is and how to start
- **agent operation docs**: teach Codex CLI, Claude Code, or similar harnesses
  how to use the skill pack
- **skill and flow docs**: define actual agent behavior
- **reference docs**: generated from registries and not edited by hand
- **research/import docs**: source material that should not compete with
  onboarding
- **archive/legacy docs**: useful history but not the current product surface

Imported, generated, and historical files are grouped deliberately to avoid
false precision. If any of those files becomes an active onboarding, install,
skill, flow, or showcase doc, it should get an individual row in the scorecard.

## Criteria

Scores are `1` to `5`, where `5` is strongest. For `Maintainability`, `5`
means low drift risk and easy ownership.

| Criterion           | Question                                                                       |
| ------------------- | ------------------------------------------------------------------------------ |
| `P` Purpose         | Can a reader tell why this doc exists within ten seconds?                      |
| `Aud` Audience      | Is it clear whether the reader is a user, agent, contributor, or maintainer?   |
| `Acc` Accuracy      | Do commands, counts, status labels, and source-of-truth claims match the repo? |
| `Act` Actionability | Does the doc give the next command, artifact, or decision point?               |
| `Scan` Scan ease    | Can a low-attention reader find the relevant path fast?                        |
| `Maintainability`   | Is the doc unlikely to drift, duplicate, or become stale?                      |

Dependent inspection scores use the same `1` to `5` scale and ask whether a
reader can move across docs without contradiction.

## Executive Verdict

The docs are not thin; they are over-complete. The main issue is not lack of
documentation. The main issue is that several good entry points compete with
each other, and some execution docs have drifted from the harness runtime.

Best current reader path:

1. `README.md` for the short pitch and visual proof.
2. `docs/user/AGENT-HARNESS-INSTALL.md` for installing into an agent project.
3. `docs/user/showcase/README.md` for what the system can make.
4. `skills/README.md` and `flows/README.md` for the agent-facing surface.
5. `scripts/harness/README.md` only when implementing or debugging runtime
   calls.

Highest priority fixes:

1. Fix flow docs/runtime drift, especially `flows/doctor.flow`.
2. Reduce competing onboarding routes in `README.md`.
3. Move verification earlier in the agent quickstart.
4. Split `skills/README.md` into job-based discovery categories.
5. Make showcase maturity/status come from one canonical source.

## Independent Ratings - Root And Onboarding

| Doc                   |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                          |
| --------------------- | --: | --: | --: | --: | ---: | --------------: | -------------------------------------------------------------- |
| `README.md`           |   4 |   3 |   4 |   4 |    2 |               2 | Strong pitch, but too many "start here" sections compete.      |
| `docs/README.md`      |   4 |   4 |   4 |   3 |    4 |               3 | Good docs map; should stay secondary to user quickstart.       |
| `docs/user/README.md` |   5 |   5 |   4 |   4 |    4 |               4 | Clearest ordered user index.                                   |
| `AGENTS.md`           |   5 |   5 |   4 |   5 |    4 |               3 | Useful for agents; static entrypoint list can drift.           |
| `CLAUDE.md`           |   4 |   5 |   5 |   3 |    5 |               4 | Minimal generated pointer; good low-risk Claude entry.         |
| `DIRECTION.md`        |   3 |   3 |   3 |   2 |    4 |               2 | Directional value, but stale counts and historical wording.    |
| `CONTRIBUTING.md`     |   4 |   4 |   3 |   4 |    5 |               3 | Clean contributor doc; quality and Node version wording drift. |
| `CHANGELOG.md`        |   4 |   4 |   4 |   3 |    4 |               3 | Useful release history, not an onboarding surface.             |
| `CODE_OF_CONDUCT.md`  |   5 |   5 |   5 |   4 |    5 |               4 | Standard and clear.                                            |
| `SECURITY.md`         |   5 |   5 |   4 |   4 |    5 |               4 | Clear disclosure path; verify contact/process before release.  |
| `SUPPORT.md`          |   5 |   5 |   4 |   4 |    5 |               4 | Clear support routing.                                         |
| `VENDORING.md`        |   4 |   4 |   4 |   4 |    4 |               3 | Useful governance doc; keep linked from source-media guidance. |

## Independent Ratings - Install And Agent Operation

| Doc                                  |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                                    |
| ------------------------------------ | --: | --: | --: | --: | ---: | --------------: | ------------------------------------------------------------------------ |
| `docs/user/AGENT-HARNESS-INSTALL.md` |   5 |   5 |   4 |   4 |    4 |               3 | Strong install doc; diagnostics should appear before generation.         |
| `docs/user/AGENT-QUICKSTART.md`      |   4 |   4 |   4 |   3 |    3 |               2 | Useful but mixes install, repo checkout, generation, and reinstall loop. |
| `docs/user/INSTALLATION.md`          |   5 |   4 |   3 |   4 |    4 |               3 | Good setup doc; Whisper section describes a check as an install.         |
| `docs/user/CONFIGURATION.md`         |   4 |   4 |   4 |   4 |    4 |               3 | Useful once installed; should keep pointing to generated env reference.  |
| `docs/user/providers/gemini.md`      |   4 |   4 |   4 |   4 |    4 |               3 | Focused provider doc; should stay tied to provider config facts.         |
| `scripts/harness/README.md`          |   5 |   5 |   4 |   4 |    5 |               4 | Good maintainer/runtime entry; not the first user doc.                   |

Dependent score for `install -> verify -> generate -> review`: **3/5**.
Install is clear. Verification and review are present, but not consistently
adjacent to the commands a first-time agent runs.

## Independent Ratings - Showcase, Examples, And Review

| Doc                                                     |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                              |
| ------------------------------------------------------- | --: | --: | --: | --: | ---: | --------------: | ------------------------------------------------------------------ |
| `docs/user/showcase/README.md`                          |   5 |   5 |   4 |   4 |    5 |               3 | Strong visual menu; keep it as human gallery.                      |
| `docs/demo/README.md`                                   |   5 |   5 |   4 |   4 |    4 |               4 | Good generated demo index; dense by design.                        |
| `docs/demo/provenance/README.md`                        |   5 |   4 |   4 |   4 |    5 |               4 | Strong audit trail.                                                |
| `docs/user/QUALITY-AND-REVIEW.md`                       |   5 |   5 |   4 |   5 |    5 |               3 | Good publish gate; conflicts with one golden label.                |
| `docs/user/ARCHETYPES.md`                               |   5 |   5 |   4 |   4 |    4 |               3 | Useful status matrix; should be source-backed.                     |
| `docs/user/CREATIVE-SOURCES.md`                         |   5 |   4 |   5 |   4 |    5 |               2 | Valuable source catalog; external-source churn creates drift risk. |
| `docs/user/EXAMPLES.md`                                 |   4 |   4 |   4 |   4 |    4 |               3 | Good bridge; should prefer harness-first examples.                 |
| `docs/user/examples/README.md`                          |   5 |   4 |   5 |   4 |    5 |               4 | Strong example index.                                              |
| `docs/user/examples/content-machine-self-demo.md`       |   5 |   5 |   5 |   5 |    4 |               3 | Best repo-explainer recipe.                                        |
| `docs/user/examples/reddit-post-over-gameplay.md`       |   5 |   5 |   4 |   4 |    5 |               2 | Flagship page, but golden status conflicts with OCR-gate text.     |
| `docs/user/examples/reddit-story-split-screen.md`       |   5 |   5 |   5 |   4 |    5 |               4 | Strong lane doc.                                                   |
| `docs/user/examples/procedural-gameplay-backgrounds.md` |   5 |   5 |   5 |   4 |    5 |               4 | Strong additive 3D/procedural example.                             |
| `docs/user/examples/motion-card-lesson.md`              |   5 |   4 |   5 |   5 |    4 |               3 | Runnable and clear.                                                |
| `docs/user/examples/split-screen-gameplay.md`           |   4 |   4 |   4 |   5 |    4 |               3 | Actionable but overlaps story-gameplay docs.                       |
| `docs/user/examples/latest-news-listicle.md`            |   4 |   3 |   3 |   4 |    4 |               1 | Older command style; high drift.                                   |
| `docs/user/examples/nanobanana-veo.md`                  |   4 |   4 |   4 |   4 |    5 |               1 | Useful but provider/status churn risk.                             |
| `docs/user/examples/nanobanana-kenburns.md`             |   4 |   4 |   4 |   4 |    5 |               2 | Useful visual example; provider naming can drift.                  |
| `docs/user/examples/complex-plane-rotation.md`          |   4 |   3 |   4 |   3 |    4 |               2 | Good niche example; not central onboarding.                        |
| `docs/user/examples/import-render-templates.md`         |   3 |   3 |   4 |   3 |    4 |               2 | Useful migration note; legacy surface risk.                        |
| `docs/user/examples/gemini-image-shorts.md`             |   4 |   3 |   4 |   3 |    4 |               1 | Provider-specific and higher drift.                                |
| `docs/user/examples/graphics-archetype-remake-plan.md`  |   4 |   4 |   5 |   3 |    4 |               2 | Good plan doc; less directly runnable.                             |
| `docs/user/examples/faceless-mixed-short.md`            |   4 |   4 |   5 |   3 |    5 |               3 | Clear lane description; add runnable request block.                |
| `docs/user/examples/facts-listicle.md`                  |   4 |   4 |   5 |   3 |    5 |               3 | Clear lane description; add runnable request block.                |
| `docs/user/examples/micro-doc-breakdown.md`             |   4 |   4 |   5 |   3 |    5 |               3 | Clear lane description; add runnable request block.                |
| `docs/user/examples/saas-problem-solution.md`           |   4 |   4 |   5 |   3 |    5 |               3 | Clear lane description; add runnable request block.                |
| `docs/user/examples/stock-footage-edutainment.md`       |   4 |   4 |   5 |   3 |    5 |               3 | Clear lane description; add runnable request block.                |
| `docs/user/examples/subway-confession-story.md`         |   4 |   4 |   5 |   3 |    5 |               2 | Good example; term/source status can drift.                        |
| `docs/user/examples/text-message-drama.md`              |   4 |   4 |   4 |   3 |    5 |               2 | Good lane doc; add stronger reproduction path.                     |

Dependent score for `showcase -> runnable example -> provenance -> review`:
**3.5/5**. The audit trail is strong. Reproducibility is uneven because
some flagship pages describe outcomes better than commands or agent prompts.

## Independent Ratings - Skills

| Doc                                               |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                                                                                                   |
| ------------------------------------------------- | --: | --: | --: | --: | ---: | --------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/README.md`                                |   4 |   4 |   4 |   3 |    3 |               2 | Complete catalog, but categories mix lanes, utilities, review, assets, and orchestration.                                               |
| `skills/_template/SKILL.md`                       |   4 |   4 |   5 |   4 |    5 |               4 | Good authoring baseline.                                                                                                                |
| `skills/generate-short/SKILL.md`                  |   5 |   5 |   4 |   5 |    4 |               3 | Strong primary orchestration skill.                                                                                                     |
| `skills/skill-catalog/SKILL.md`                   |   4 |   5 |   3 |   5 |    5 |               4 | Good discovery skill; entrypoint wording overstates runtime coverage.                                                                   |
| `skills/short-form-production-playbook/SKILL.md`  |   5 |   5 |   4 |   4 |    5 |               4 | Strong craft/review guide.                                                                                                              |
| `skills/longform-to-shorts/SKILL.md`              |   4 |   4 |   4 |   3 |    4 |               3 | Useful chain doc; needs clearer execution bridge to render inputs.                                                                      |
| `skills/longform-highlight-select/SKILL.md`       |   5 |   5 |   5 |   5 |    5 |               4 | Strong runtime-backed stage doc.                                                                                                        |
| `skills/source-media-analyze/SKILL.md`            |   5 |   5 |   4 |   5 |    5 |               3 | Strong runtime-backed stage doc.                                                                                                        |
| `skills/video-render/SKILL.md`                    |   5 |   5 |   4 |   5 |    4 |               3 | Good render contract; keep synced with harness schema.                                                                                  |
| `skills/publish-prep-review/SKILL.md`             |   5 |   5 |   4 |   5 |    4 |               3 | Good review gate; align naming with `publish-prep` alias.                                                                               |
| `skills/reddit-story-short/SKILL.md`              |   5 |   5 |   4 |   4 |    4 |               3 | Strong lane doc.                                                                                                                        |
| `skills/reddit-post-over-gameplay-short/SKILL.md` |   5 |   5 |   4 |   4 |    4 |               3 | Strong flagship lane doc.                                                                                                               |
| `skills/procedural-gameplay-backgrounds/SKILL.md` |   5 |   5 |   4 |   4 |    4 |               3 | Strong additive visual skill.                                                                                                           |
| `skills/motion-design-coder/SKILL.md`             |   5 |   5 |   4 |   4 |    5 |               3 | Strong coding skill for motion systems.                                                                                                 |
| `skills/short-form-archetype-research/SKILL.md`   |   4 |   4 |   3 |   3 |    2 |               1 | Powerful but too much reference fanout for fast routing.                                                                                |
| `skills/style-profile-library/SKILL.md`           |   3 |   3 |   4 |   2 |    2 |               3 | Below the current skill readiness bar.                                                                                                  |
| Runtime-backed pipeline skills                    |   5 |   5 |   4 |   5 |    4 |               3 | `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`, `media-index`, `boundary-snap`, and related stages are generally strong. |
| Review and retry skills                           |   5 |   5 |   4 |   4 |    4 |               3 | Clear intent, but should be grouped separately from visual treatments.                                                                  |
| Caption and timing skills                         |   5 |   5 |   4 |   4 |    4 |               3 | Strong domain coverage; keep safe-zone and timestamp language consistent.                                                               |
| Source and rights skills                          |   4 |   4 |   4 |   4 |    4 |               2 | Good coverage; external-source policies need ongoing maintenance.                                                                       |
| Asset lifecycle skills                            |   4 |   4 |   4 |   4 |    3 |               3 | Useful but spread across several categories.                                                                                            |

Dependent score for `user request -> skill selection -> runtime entrypoint ->
artifact`: **3.5/5**. Individual skill docs are strong, but the catalog needs
job-based grouping:

- executable pipeline stages
- content lanes/archetypes
- production playbooks
- caption/audio/timing
- source governance and rights
- asset lifecycle
- review, retry, and regeneration
- visual treatments and 3D/procedural graphics

## Independent Ratings - Flows, Harness, And References

| Doc                                       |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                                                        |
| ----------------------------------------- | --: | --: | --: | --: | ---: | --------------: | -------------------------------------------------------------------------------------------- |
| `flows/README.md`                         |   5 |   4 |   3 |   4 |    4 |               3 | Useful flow index; one entry skill is wrong.                                                 |
| `flows/_template/FLOW.md`                 |   4 |   4 |   5 |   4 |    5 |               4 | Good expected-flow template.                                                                 |
| `flows/doctor.md`                         |   4 |   4 |   2 |   2 |    5 |               2 | Status claims do not match `run-flow` behavior.                                              |
| `flows/doctor.flow`                       |   4 |   3 |   1 |   1 |    5 |               1 | Critical drift: default output handling breaks run-scoped doctor calls.                      |
| `flows/generate-short.md`                 |   4 |   4 |   4 |   4 |    4 |               4 | Good current executable flow doc.                                                            |
| `flows/generate-short.flow`               |   4 |   3 |   4 |   3 |    5 |               3 | Works, but under-lists supported runtime inputs.                                             |
| `flows/reverse-engineer-winner.md`        |   4 |   4 |   3 |   3 |    5 |               3 | Describes follow-up skill call as part of flow, but runtime does not.                        |
| `flows/reverse-engineer-winner.flow`      |   4 |   3 |   4 |   3 |    5 |               4 | Manifest is mostly aligned with current runtime.                                             |
| `flows/showcase-content-machine.md`       |   5 |   4 |   3 |   4 |    4 |               3 | Good operator note; ensure it mirrors manifest entry skill.                                  |
| `flows/showcase-content-machine.flow`     |   5 |   3 |   4 |   3 |    5 |               3 | Manifest routes to `generate-short`, correctly.                                              |
| `scripts/harness/README.md`               |   5 |   5 |   4 |   4 |    5 |               4 | Strong runtime map for contributors and agent harness authors.                               |
| `docs/reference/REPO-FACTS.md`            |   4 |   3 |   5 |   3 |    4 |               5 | Good generated source of truth.                                                              |
| `docs/reference/ENVIRONMENT-VARIABLES.md` |   4 |   4 |   5 |   4 |    4 |               5 | Useful generated setup reference.                                                            |
| `docs/reference/GLOSSARY.md`              |   5 |   4 |   5 |   4 |    4 |               5 | Strong terminology source of truth.                                                          |
| `docs/reference/QUALITY-GATES.md`         |   4 |   3 |   3 |   3 |    4 |               3 | Generated, but coverage omits `flows/*.md`, `flows/*.flow`, and `scripts/harness/README.md`. |
| `docs/reference/CONFIG-SURFACE.md`        |   4 |   3 |   5 |   3 |    4 |               5 | Strong reference doc.                                                                        |
| `docs/reference/ARTIFACT-CONTRACTS.md`    |   3 |   3 |   4 |   2 |    5 |               4 | Useful but less action-oriented.                                                             |

Dependent score for `flow doc -> .flow manifest -> run-flow -> artifacts`:
**2.5/5**. The model is sound, but the doctor flow is currently the highest
priority docs/runtime inconsistency.

## Group Ratings - Large Doc Families

| Family                    |   P | Aud | Acc | Act | Scan | Maintainability | Notes                                                                                    |
| ------------------------- | --: | --: | --: | --: | ---: | --------------: | ---------------------------------------------------------------------------------------- |
| `docs/dev/architecture/`  |   4 |   4 |   3 |   3 |    3 |               2 | Useful historical architecture; must keep demoted-surface status visible.                |
| `docs/dev/features/`      |   4 |   4 |   3 |   3 |    3 |               2 | Valuable design history; high risk if mistaken for current behavior.                     |
| `docs/dev/specs/`         |   4 |   4 |   3 |   3 |    3 |               2 | Good design substrate; needs status labels.                                              |
| `docs/direction/`         |   4 |   4 |   3 |   3 |    4 |               3 | Strong migration context; several historical docs need clearer non-authoritative labels. |
| `docs/research/`          |   4 |   3 |   4 |   2 |    2 |               2 | Important evidence corpus; too large to be part of default browsing.                     |
| `docs/research/external/` |   3 |   2 |   3 |   1 |    1 |               1 | Imported material; should be quarantined from onboarding and default search.             |
| `archive/`                |   4 |   3 |   3 |   2 |    3 |               3 | Good landing zone; archive boundary should remain explicit.                              |

## Dependent Ratings

| Chain                                         | Score | Result                                                                     |
| --------------------------------------------- | ----: | -------------------------------------------------------------------------- |
| New visitor -> understands repo in one minute |     3 | Visual proof is strong, but root README has too many routes.               |
| Agent install -> generated root instructions  |     4 | Recent install docs are clear and mostly harness-agnostic.                 |
| Install -> verify -> generate -> review       |     3 | Verification should move before generation in quickstart and harness docs. |
| Skill selection -> runtime-backed stage       |   3.5 | Strong individual docs; catalog categories hide the shortest path.         |
| Flow manifest -> `run-flow` execution         |   2.5 | Doctor flow is broken; several operator notes overclaim.                   |
| Showcase -> example -> provenance -> review   |   3.5 | Good audit chain; golden status conflicts with review-gate language.       |
| Registry -> generated reference docs          |     4 | Good source-of-truth model; generated coverage should include flow docs.   |
| Active docs -> research/archive boundary      |     3 | Boundary exists but huge research corpus dominates Markdown count.         |

## Defect List

| Severity | Finding                                                                                                    | Evidence                                                                             | Recommended Fix                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| S1       | `doctor.flow` run-scoped output is inconsistent with `doctor-report` schema.                               | `flows/doctor.flow`, `src/harness/flow-runner.ts`, `src/harness/doctor-report.ts`    | Either bind `outputPath` instead of `outputDir`, or let `doctor-report` accept `outputDir`. Then update `doctor.md`. |
| S1       | Golden showcase label conflicts with OCR review gate.                                                      | `docs/user/examples/reddit-post-over-gameplay.md`, `docs/user/QUALITY-AND-REVIEW.md` | Downgrade status to candidate until gate passes, or update gate evidence if it now passes.                           |
| S2       | Root onboarding has too many competing starts.                                                             | `README.md` headings around install, quick start, how to use, visitor map, docs      | Collapse to one golden path plus secondary links.                                                                    |
| S2       | Quickstart places install-into-another-project after generation.                                           | `docs/user/AGENT-QUICKSTART.md`                                                      | Move install mode decision to the top and make external install an appendix after the first path is clear.           |
| S2       | Verification is not consistently first-class.                                                              | `docs/user/AGENT-QUICKSTART.md`, `docs/user/AGENT-HARNESS-INSTALL.md`                | Add one golden command chain: Node check, install, `cm-agent list`, `doctor-report`, generate, publish prep.         |
| S2       | `CONTRIBUTING.md` quality wording drifts from package scripts.                                             | `CONTRIBUTING.md`, `package.json`                                                    | Align Node version and clarify that duplication check is separate unless added to `npm run quality`.                 |
| S2       | Direction doc is stale.                                                                                    | `DIRECTION.md`                                                                       | Update skill count and remove "new" wording where the pivot is now established.                                      |
| S2       | Flow README lists showcase entry skill incorrectly.                                                        | `flows/README.md`, `flows/showcase-content-machine.flow`                             | Change table entry to `generate-short`.                                                                              |
| S2       | Reverse-engineer flow doc describes a follow-up call that runtime does not execute.                        | `flows/reverse-engineer-winner.md`, `flows/reverse-engineer-winner.flow`             | Separate "current flow" from "next manual step".                                                                     |
| S2       | Skill catalog categories mix unlike concepts.                                                              | `skills/README.md`                                                                   | Reorganize by user job and pipeline role, not one flat catalog.                                                      |
| S2       | Status/maturity is duplicated across showcase, archetypes, examples, generated demo docs, and review docs. | `docs/user/showcase/README.md`, `docs/user/ARCHETYPES.md`, `docs/demo/README.md`     | Generate status tables from one manifest.                                                                            |
| S3       | Large imported research corpus can pollute repo search and mental model.                                   | `docs/research/external/`                                                            | Add a short quarantine/index note and exclude from default doc navigation.                                           |
| S3       | Older `cm` examples remain in user examples.                                                               | Several `docs/user/examples/*.md` files                                              | Mark legacy examples or convert top examples to harness-first prompts.                                               |
| S3       | `style-profile-library` skill is below the readiness pattern.                                              | `skills/style-profile-library/SKILL.md`                                              | Add standard sections, validation behavior, and clearer outputs.                                                     |

## Recommended Work Order

1. **Fix executable drift**: repair `doctor.flow`, correct flow README entry
   skill, and clarify reverse-engineer flow status.
2. **Tighten first-run docs**: add one canonical golden command chain to
   `AGENT-QUICKSTART.md` and `AGENT-HARNESS-INSTALL.md`.
3. **Collapse README onboarding**: keep the pitch and one path; move repeated
   surface explanations behind `docs/user/README.md`.
4. **Rework skill discovery**: add a job-based matrix to `skills/README.md`
   before the exhaustive catalog.
5. **Unify showcase status**: drive maturity labels from a single manifest and
   make `golden`, `candidate`, and `experimental` mechanically checkable.
6. **Label large doc families**: make research/import/archive status visible so
   agents do not mistake evidence dumps for current user docs.

## Signoff

This inspection found a strong documentation base with real product proof,
agent install docs, skill docs, examples, and provenance. The next improvement
is not more prose. The next improvement is reducing drift and making one
obvious path for a new reader or agent.
