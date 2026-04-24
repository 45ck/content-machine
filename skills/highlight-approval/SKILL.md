---
name: highlight-approval
description: Approve or reject ranked longform highlight candidates before boundary snapping, clipping, reframing, or rendering.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"candidatesPath":"output/content-machine/highlights/highlight-candidates.v1.json","outputPath":"output/content-machine/highlights/highlight-approval.v1.json","approvedCandidateIds":["highlight-001"],"actor":"local-agent"}'
entrypoint: node --import tsx scripts/harness/highlight-approval.ts
inputs:
  - name: candidatesPath
    description: Path to highlight-candidates.v1.json.
    required: true
  - name: outputPath
    description: Path that will receive highlight-approval.v1.json.
    required: false
  - name: approvedCandidateIds
    description: Candidate ids to approve. Defaults to selectedCandidateId.
    required: false
  - name: rejectedCandidateIds
    description: Candidate ids to reject. Defaults to all non-approved candidates.
    required: false
outputs:
  - name: highlight-approval.v1.json
    description: Explicit approval artifact with decisions, notes, and updated candidate approval status.
---

# Highlight Approval

## Use When

- Candidate moments have been selected and need an explicit local
  decision before expensive or destructive processing.
- You want a stable handoff between discovery and clipping/rendering.
- The user has chosen one or more candidates manually.

## Invocation

```bash
cat skills/highlight-approval/examples/request.json | \
  node --import tsx scripts/harness/highlight-approval.ts
```

## Output Contract

- Reads `highlight-candidates.v1.json`.
- Writes `highlight-approval.v1.json`.
- Marks approved candidates as `approved`, rejected candidates as
  `rejected`, and carries optional approval notes.

## Validation Checklist

- Approved ids exist in the candidate artifact.
- Non-approved candidates are rejected unless explicitly left pending
  by the request.
- Warnings list unknown candidate ids instead of silently accepting
  them.
