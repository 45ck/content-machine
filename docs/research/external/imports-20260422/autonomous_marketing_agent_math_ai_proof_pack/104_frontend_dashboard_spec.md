# Frontend Dashboard Specification

## Main screens

### 1. Control Tower

Shows:

- live spend vs cap,
- experiments active,
- blocked assets,
- approvals waiting,
- policy incidents,
- top learnings,
- kill-switch status.

### 2. Claim Bank

Shows:

- approved claims,
- expired claims,
- blocked claims,
- proof links,
- jurisdictions,
- owners,
- required disclaimers.

### 3. Hypothesis Board

Columns:

- backlog,
- drafted,
- policy review,
- approved,
- launched,
- learning complete,
- archived.

### 4. Creative Lab

For each variant:

- copy,
- asset preview,
- buyer state,
- angle,
- offer,
- claim IDs,
- risk score,
- landing page,
- approval status.

### 5. Experiment Monitor

Shows:

- spend,
- CTR,
- CVR,
- CPA,
- activated trials,
- pipeline,
- revenue,
- guardrails,
- decision status.

### 6. Learning Memory

Searchable lessons:

- what worked,
- for whom,
- on which channel,
- with what offer,
- what proof,
- under what constraints.

## Critical UI rule

The dashboard must make it impossible to confuse:

- generated,
- approved,
- launched,
- winning,
- incrementally proven.

## Status labels

Use strict labels:

- Draft
- Policy blocked
- Needs proof
- Needs approval
- Launch-ready
- Active
- Paused by kill rule
- Completed: winner
- Completed: loser
- Completed: inconclusive
- Incrementality proven
- Not incrementality-tested

## Mindset

The dashboard is an accountability surface, not a vanity metrics board.
