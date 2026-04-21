# Claude Code Templates

## Minimal CLAUDE.md

```markdown
# Project rules

## Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

## Workflow
- For unclear or multi-file tasks, use plan mode first.
- For bug fixes, reproduce with a failing test before fixing when possible.
- After code changes, run targeted tests, then typecheck.
- Summarize changed files, verification run, and residual risk.

## Code style
- Follow existing patterns before adding new abstractions.
- Prefer simple functions over framework-heavy designs.
- Do not introduce new dependencies without asking.

## Safety
- Do not touch production credentials, deployment config, or migrations without explicit approval.
- Do not make marketing claims unless they are supported by product behavior or source docs.
```

## AGENT_POLICY.md

```markdown
# Agent Policy

## Allowed without approval
- Read files in this repo.
- Edit application/test/docs files on a feature branch.
- Run local tests, lint, typecheck, formatters.
- Use `git status`, `git diff`, `git log`.

## Requires approval
- Installing dependencies.
- Running migrations.
- Modifying auth/payment/security code.
- Calling external APIs that mutate data.
- Pushing commits.
- Opening PRs.
- Changing pricing/legal/security/medical/financial claims.

## Forbidden
- Reading secrets unless explicitly provided for a sandbox task.
- Deploying to production.
- Deleting databases or storage buckets.
- Sending customer emails without approval.
- Creating fake testimonials, reviews, logos, customer names, or performance metrics.
```

## Claim ledger template

```csv
claim,page_or_asset,evidence,status,risk,safe_wording,next_proof_needed,owner
"Saves 5 hours/week","landing page","none yet","unproven","high","Automates manual invoice cleanup workflows","Run timing study with 10 users","Calvin"
"Exports invoices to CSV","demo page","working demo /export endpoint","proven","low","Export cleaned invoices to CSV","Add screenshot and test","Calvin"
```

## Eval run log template

```csv
task_id,agent_model,task_family,result,human_interventions,wall_time_minutes,cost_estimate,tests_run,review_blockers,notes
T001,Claude Code + Opus 4.7,bug_fix,pass,1,24,,npm test auth,0,"Good root-cause analysis"
T002,Sonnet,ui_change,partial,3,31,,npm test; screenshot,2,"Layout drift; needed manual CSS review"
```

## Skill template: fix issue

```markdown
---
name: fix-issue
description: Investigate, fix, test, and prepare a PR for a GitHub issue.
---

Analyze and fix issue: $ARGUMENTS

1. Use `gh issue view` to read the issue.
2. Reproduce the problem or write a failing test.
3. Identify root cause.
4. Implement minimal fix.
5. Run targeted tests.
6. Run typecheck/lint if relevant.
7. Summarize changed files, verification, and residual risks.
8. Do not push or open PR without explicit approval.
```

## Skill template: claim audit

```markdown
---
name: claim-audit
description: Audit marketing claims against product evidence.
---

Audit the claims in: $ARGUMENTS

For each claim:
1. Extract exact claim.
2. Classify: proven / supported / unproven / exaggerated / risky.
3. Identify evidence in product/docs/data.
4. Suggest safer wording.
5. List proof needed to make the stronger claim true.
6. Output rows suitable for CLAIM_LEDGER.csv.
```

## Prompt: private eval runner

```text
You are running an eval task. Do not optimize for looking successful. Optimize for a faithful, auditable run.

Task card: [paste]

Rules:
- Log files inspected.
- Log commands run.
- Log failures and retries.
- Ask for approval before forbidden actions.
- At the end, score success, confidence, review risk, and next verification step.
```
