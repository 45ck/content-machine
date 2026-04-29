# Research Evidence And Briefing Deep Dive

Date: 2026-04-29

## Purpose

Short-form scripts are only as good as the evidence and angle selection behind
them. The repo already has research schemas and tools for web, Reddit,
Hacker News, Tavily, and source metadata. This report defines how research
should become a brief, not loose prompt context.

## Source Signals

| Source                             | Signal                                                                 | Content-machine takeaway                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/research/schema.ts`           | Evidence, trending topics, content angles, and research output schemas | Research output should be a typed artifact consumed by script generation |
| `src/research/tools/web-search.ts` | Brave Search wrapper with relevance scoring and freshness options      | Search evidence needs query, source, relevance, and time metadata        |
| `src/research/tools/reddit.ts`     | Reddit source support                                                  | Community examples should be evidence, not copied scripts                |
| `src/research/tools/hackernews.ts` | Hacker News source support                                             | Technical topics can use discussion velocity as angle input              |
| `src/research/tools/tavily.ts`     | Tavily source support                                                  | Provider-specific research should normalize to the same evidence schema  |
| YouTube reference corpus research  | Public video links are metadata-only references                        | Public examples should feed patterns and metadata, not downloaded assets |

## Briefing Model

Recommended lifecycle:

1. Define research query, platform, niche, and freshness needs.
2. Collect evidence from available sources.
3. Normalize every hit into a source record with relevance and published time.
4. Cluster evidence into topic claims, risks, and angle candidates.
5. Select a content angle with cited evidence.
6. Hand a compact brief to script generation.

## Artifact Stack

### `research-query-plan.v1.json`

Purpose: declare what to search and why.

Fields:

- `topic`
- `platform`
- `niche`
- `queries`
- `sources`
- `freshness`
- `must_include`
- `must_exclude`

### `evidence-pack.v1.json`

Purpose: normalized evidence bundle.

Fields:

- `query`
- `searched_at`
- `sources`
- `evidence`
- `trending_topics`
- `total_results`
- `collection_warnings`

### `claim-map.v1.json`

Purpose: group evidence into usable claims.

Fields:

- `claims`
- `supporting_evidence_ids`
- `contradicting_evidence_ids`
- `confidence`
- `risk_notes`
- `freshness_status`

### `angle-selection.v1.json`

Purpose: select the script angle before writing.

Fields:

- `selected_angle`
- `hook`
- `archetype`
- `target_emotion`
- `evidence_ids`
- `rejected_angles`
- `reason`
- `risk_notes`

### `brief-package.v1.json`

Purpose: compact handoff to script generation.

Fields:

- `topic`
- `angle_selection_path`
- `claim_map_path`
- `evidence_pack_path`
- `audience`
- `tone`
- `constraints`
- `do_not_claim`

## Implementation Delta

Current research schemas can represent evidence and angles, but the generation
path needs a richer bridge from raw search results to a cited brief. The brief
package should be optional for evergreen topics and required for newsy,
technical, financial, medical, legal, or otherwise high-risk claims.

## Quality Gates

- Claims that depend on recent facts must cite dated evidence.
- Public YouTube, TikTok, or Reels references must remain metadata-only unless
  rights are cleared.
- Scripts should not include unsupported claims from raw search snippets.
- Angle selection should name rejected angles when a safer or more specific
  angle wins.
- Brief packages should include `do_not_claim` when evidence is uncertain.

## Bead Targets

This report supports:

- `content-machine-ar11`: prompt and schema contracts.
- `content-machine-ar19`: hook and narrative packaging.
- `content-machine-ar27`: public reference gates.
- `content-machine-ar31`: research query, evidence pack, claim map, angle
  selection, and brief package artifacts.
