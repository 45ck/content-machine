# Autonomy Levels and Control Plane

## Purpose

This file defines the control system that stops an autonomous ad factory from becoming a high-speed liability machine.

## Autonomy matrix

| Action | L1 Drafting | L2 Payload draft | L3 Semi-auto | L4 Bounded auto | L5 Unbounded |
|---|---:|---:|---:|---:|---:|
| Generate ad copy | Yes | Yes | Yes | Yes | Yes |
| Generate landing page copy | Yes | Yes | Yes | Yes | Yes |
| Create image/video prompt | Yes | Yes | Yes | Yes | Yes |
| Publish low-risk variant | No | No | Yes, capped | Yes, capped | Yes |
| Invent new claims | No | No | No | No | Yes |
| Increase budget | No | No | No | Only within cap | Yes |
| Expand audience | No | Draft only | Capped only | Capped only | Yes |
| Change offer/pricing | No | No | No | No | Yes |
| Use customer data for personalisation | No | No | Only approved segments | Only approved segments | Yes |
| Stop losing ads | No | Draft recommendation | Yes | Yes | Yes |
| Escalate policy risk | Yes | Yes | Yes | Yes | Maybe |

## Control-plane components

### 1. Permission registry

Every agent action must be mapped to one of:

- `read_context`
- `draft_asset`
- `validate_claim`
- `request_approval`
- `create_payload`
- `launch_experiment`
- `pause_experiment`
- `increase_budget`
- `change_targeting`
- `change_offer`

Default-deny all actions not listed.

### 2. Claim scope

The agent may only use:

- approved claim IDs,
- approved wording variants,
- approved proof links,
- approved time windows,
- approved disclaimers.

Any output with a non-mapped claim is blocked.

### 3. Budget envelope

Use three nested caps:

- **Variant cap**: max spend per single ad/ad set/ad group.
- **Experiment cap**: max spend per hypothesis test.
- **Account cap**: max daily/monthly spend controlled by the agent.

### 4. Policy-risk scores

Score every proposed ad from 0 to 100.

- 0–20: low risk; can auto-launch if claims are approved.
- 21–50: review required before launch.
- 51–80: legal/compliance review.
- 81–100: blocked.

Risk triggers:

- quantified performance claims,
- competitor comparison,
- security/privacy claims,
- financial/health/legal outcomes,
- urgency/scarcity,
- personal attributes,
- testimonials,
- AI capability claims,
- pricing/discounts,
- guarantees,
- employment/credit/housing targeting.

### 5. Rollback rules

Every launch must include a rollback record:

- who/what created it,
- campaign ID,
- ad IDs,
- asset IDs,
- budget cap,
- kill condition,
- audit log link,
- approval record.

## Mindset

A disciplined autonomous system does not maximise output. It maximises **safe learning under constraint**.
