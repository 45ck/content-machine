# Capstone Build Spec — Full Autonomous Ad Factory

## Goal

Build a bounded autonomous ad factory for one software product that can generate, validate, and prepare launch-ready campaigns across at least two channels.

## Required components

### 1. Product truth system

- product brief,
- feature list,
- claim bank,
- proof links,
- limitations,
- prohibited claims.

### 2. Buyer intelligence system

- 25 buyer insights,
- 10 objections,
- 10 proof requirements,
- buyer-state map.

### 3. Hypothesis engine

Generate at least 30 hypotheses across:

- search,
- social,
- LinkedIn/B2B,
- retargeting.

### 4. Creative generator

Generate:

- 30 text ads,
- 10 static creative briefs,
- 5 video storyboards,
- 5 landing page outlines.

### 5. Policy engine

Validate:

- claim IDs,
- prohibited wording,
- risk score,
- disclaimer requirement,
- landing page consistency.

### 6. Platform payloads

Produce mock payloads for:

- Google responsive search ads,
- Meta creative/campaign draft,
- LinkedIn sponsored content,
- TikTok video creative brief.

### 7. Experiment system

Define:

- metrics,
- budget caps,
- kill rules,
- runtime,
- learning memo template.

### 8. Dashboard

At minimum:

- active experiments,
- spend vs cap,
- approvals,
- policy blocks,
- learnings.

## Passing standard

The system passes only if:

- no generated ad contains unsupported claims,
- every ad maps to buyer state and proof path,
- launch payloads are separated from approval,
- budget increase cannot happen through model reasoning alone,
- learning memos separate evidence from speculation.

## Final deliverable

A demo where the user enters a product brief and receives:

- buyer-state diagnosis,
- campaign hypotheses,
- ad variants,
- landing page modules,
- policy review,
- experiment plan,
- platform payload drafts.
