# Data Encapsulation Model

## Goal

Every useful piece of research should become an agent-usable Markdown object.

Do not leave knowledge trapped in long prose, PDFs, links, chats, or raw exports.

## Object types

### Source Note

Location: `research/source-notes/`

Purpose: preserve source, summary, use cases, and cautions.

### Tactic Card

Location: `tactics/`

Purpose: give the agent an executable marketing method.

### Buyer Card

Location: `buyers/`

Purpose: capture a buyer persona, buying state, pains, triggers, objections, and message style.

### Campaign Card

Location: `campaigns/`

Purpose: hold generated campaign plan and assets.

### Experiment Card

Location: `experiments/`

Purpose: define hypothesis, variants, budget, metric, result, decision.

### Run Log

Location: `runs/`

Purpose: record what the agent did and what files changed.

## Markdown schema discipline

Each object should have fixed headings. This lets agents scan and update files reliably.

## Use source notes to transform research into tactics

The agent should not merely summarize sources.

It should convert sources into:

- tactic implications;
- channel implications;
- buyer-state implications;
- experiment ideas;
- copy patterns;
- failure modes.

## Example transformation

Source: Google Ads API Responsive Search Ads docs.

Raw fact: RSA requires at least 3 headlines, 2 descriptions, and final URL.

Agent-usable tactic:

- Always generate at least 15 headlines and 4 descriptions per RSA draft.
- Tag each headline by role: pain, outcome, mechanism, proof, CTA.
- Keep final URLs message-matched to query intent.
