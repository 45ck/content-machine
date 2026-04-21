# Example Project: Autonomous Ads for a SaaS Product

## Product

A fictional SaaS tool called TicketForge.

Promise:

> Turn messy support emails into clean Linear/Jira issues with customer context, urgency, and reproduction steps.

## Product facts

| Claim ID | Claim | Evidence | Risk |
|---|---|---|---|
| CLM-001 | Connects Gmail inboxes | docs/integrations/gmail | low |
| CLM-002 | Creates Linear issues | docs/integrations/linear | low |
| CLM-003 | Creates Jira issues | docs/integrations/jira | low |
| CLM-004 | Extracts customer name, urgency, and reproduction steps | product docs | medium |
| CLM-005 | No credit card required for demo workspace | pricing/signup page | low |
| CLM-006 | SOC 2 report available on request | security page | medium |

Blocked claims:

- Saves 10 hours per week.
- Solves all support triage.
- Never misses important tickets.
- AI triage with human-level accuracy.

## Buyer states

### Problem-aware

Pain: support emails create manual triage work.

Ad job: make the waste visible.

Proof path: show before/after workflow.

### Solution-aware

Pain: buyer is comparing automation tools.

Ad job: prove integration and workflow fit.

Proof path: interactive demo.

### Active evaluator

Pain: buyer worries about security and adoption.

Ad job: reduce risk.

Proof path: security docs, no-card demo, integration list.

## Hypothesis

```text
HYP-001: For solution-aware engineering/support leads, ads showing the exact email-to-Linear transformation will drive higher qualified demo starts than generic "automate support" copy.
```

## Google Search ad assets

Headlines:

- Email to Linear Issues
- Triage Support Emails
- Support Inbox to Jira
- Try TicketForge Demo
- No Card Demo Workspace
- Turn Emails Into Issues
- Gmail to Linear Workflow
- AI Support Triage Demo

Descriptions:

- Paste a support email and preview the Linear issue before signup.
- Connect Gmail and turn messy requests into structured Jira issues.
- See customer, urgency, and reproduction steps extracted in a demo.
- Built for support and engineering teams that triage inboxes manually.

Final URL:

```text
https://ticketforge.example/demo/email-to-linear
```

Claim IDs used:

- CLM-001
- CLM-002
- CLM-003
- CLM-004
- CLM-005

## Meta ad variant

Primary text:

```text
A support email is not a ticket yet. Paste one into TicketForge and see it become a Linear issue with customer, urgency, and reproduction steps filled in.
```

Headline:

```text
Turn Support Emails Into Issues
```

CTA:

```text
Try Demo
```

Visual brief:

```text
Split-screen product demo. Left: messy support email. Right: structured Linear issue fields. No fake customer names. Use synthetic placeholder data labeled as sample data.
```

## LinkedIn variant

Primary text:

```text
Support triage often fails before engineering sees the issue. TicketForge converts inbound Gmail support requests into structured Linear or Jira issues so teams can review the workflow before adding another tool.
```

Headline:

```text
Demo: Gmail Support Email to Linear Issue
```

CTA:

```text
Watch workflow
```

## Compliance gate result

Status: needs revision.

Issue:

- "AI Support Triage Demo" may imply broader AI capability than claim ledger supports.

Revision:

- Replace with "Support Triage Demo" unless AI feature documentation is added.

## Experiment plan

Type: A/B/n fixed split for first test.

Variants:

- A: workflow transformation.
- B: objection/risk reduction.
- C: generic productivity control.

Primary metric:

- qualified demo starts.

Guardrails:

- landing page bounce,
- policy rejection,
- invalid lead rate,
- cost per qualified demo,
- comment sentiment for social.

Kill rule:

- pause any variant with spend > AUD 150 and zero qualified demo starts after tracking verified.

Scale rule:

- move budget toward variant with lower cost per qualified demo and equal/better demo completion.

## Learning memo template

```text
Did workflow-specific copy beat generic productivity copy?
Did demo-start quality improve?
Which objections appeared in form/sales notes?
Did ad promise match page behavior?
What claim should be added, qualified, or removed?
What should the next proof asset be?
```

## Why this example matters

The ad does not ask the buyer to believe a grand claim. It asks them to inspect a specific transformation. That is the correct pattern for skeptical software buyers.
