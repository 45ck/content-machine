# TASK-NNN-research: [Research Topic]

**Type:** Research
**Priority:** [P1 | P2 | P3]
**Estimate:** [S | M | L]
**Created:** YYYY-MM-DD
**Owner:** [Name or Unassigned]
**Status:** [Todo | In Progress | Blocked | Done]
**Time Box:** [X hours/days — DO NOT exceed this]

---

## Research Question

**Primary Question:**
[What are we trying to figure out?]

**Success Criteria:**
[How will we know when we have enough information?]

**Constraints:**
- Time: [X hours/days]
- Scope: [What's in/out of scope]
- Deliverable: [Investigation doc with recommendations]

---

## Context

**Why Now:**
[Why is this research needed now?]

**Background:**
[What do we already know?]

**Assumptions:**
[What are we assuming is true?]

---

## 📚 Required Documentation

**Pre-Work:**
- [ ] Review vendored repo: `vendor/[relevant-repo]/README.md`
- [ ] Read existing research: `docs/research/XX-related-topic-YYYYMMDD.md`

**Deliverables:**
- [ ] `docs/investigations/investigation-[topic]-YYYYMMDD.md` — Research report
- [ ] `docs/architecture/adr-NNN-[decision]-YYYYMMDD.md` — ADR (if research leads to decision)
- [ ] Follow-up task(s) in `tasks/todo/` (if implementation needed)

---

## Research Approach

### Phase 1: Discovery (X hours)

- [ ] Read documentation for [tool/pattern/approach A]
- [ ] Read documentation for [tool/pattern/approach B]
- [ ] Review vendored repo: `vendor/[repo-name]/`
- [ ] Test basic example/prototype

### Phase 2: Comparison (X hours)

- [ ] Create comparison matrix (criteria vs options)
- [ ] Document pros/cons of each approach
- [ ] Identify deal-breakers and must-haves

### Phase 3: Recommendation (X hours)

- [ ] Write investigation report
- [ ] Propose recommendation with rationale
- [ ] Create follow-up tasks if needed

---

## Investigation Criteria

**Evaluate each option against:**

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Ease of Integration | High | How hard to add to our stack? |
| Performance | Medium | Does it meet our needs? |
| Maintenance | High | Active development? Community support? |
| Licensing | High | MIT/Apache2/BSD? Commercial restrictions? |
| Learning Curve | Medium | How fast can team adopt? |
| Documentation Quality | Medium | Can we figure it out? |
| [Custom criterion] | [Weight] | [Description] |

---

## Options to Investigate

### Option A: [Approach/Tool A]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Questions:**
- [ ] [Question to answer]

**Vendored Repo:**
- `vendor/[path]/[repo-name]/`

### Option B: [Approach/Tool B]

**Pros:**
- [Advantage 1]

**Cons:**
- [Disadvantage 1]

**Questions:**
- [ ] [Question to answer]

**Vendored Repo:**
- `vendor/[path]/[repo-name]/`

### Option C: [Approach/Tool C]

[Same structure as above]

---

## Experiments/Prototypes

**Planned Experiments:**

- [ ] **Experiment 1:** [Description]
  - **Hypothesis:** [What do we expect?]
  - **Method:** [How will we test?]
  - **Success:** [What result validates this?]

- [ ] **Experiment 2:** [Description]
  - **Hypothesis:** [What do we expect?]
  - **Method:** [How will we test?]
  - **Success:** [What result validates this?]

**Prototype Location:** `experiments/[research-topic]/`

---

## Findings

> **Fill this section as you research**

### Key Discoveries

- [Discovery 1]
- [Discovery 2]
- [Discovery 3]

### Surprises / Gotchas

- [Unexpected finding]
- [Limitation we didn't anticipate]

### Benchmark Results (if applicable)

| Test | Option A | Option B | Option C |
|------|----------|----------|----------|
| Performance | X ms | Y ms | Z ms |
| Memory | X MB | Y MB | Z MB |

---

## Recommendation

> **Final recommendation after research**

**Recommended Approach:** [Option X]

**Rationale:**
1. [Reason 1 - most important]
2. [Reason 2]
3. [Reason 3]

**Trade-offs:**
- [What we're gaining]
- [What we're giving up]

**Confidence Level:** [High | Medium | Low]

**Risks:**
- [Risk 1] - Mitigation: [How to address]
- [Risk 2] - Mitigation: [How to address]

---

## Next Steps

**Immediate Actions:**
- [ ] Create ADR: `docs/architecture/adr-NNN-[decision]-YYYYMMDD.md`
- [ ] Create implementation task: `TASK-NNN-feature-[name]-YYYYMMDD.md`
- [ ] Update research summary: `docs/research/00-SUMMARY.md`

**Follow-up Tasks:**
- [ ] `TASK-XXX`: [Description]
- [ ] `TASK-YYY`: [Description]

---

## ✅ Verification Checklist

**Before moving to `done/`:**

- [ ] Investigation report written (`docs/investigations/`)
- [ ] All options evaluated against criteria
- [ ] Experiments completed (if applicable)
- [ ] Clear recommendation provided
- [ ] Trade-offs documented
- [ ] Risks identified with mitigations
- [ ] Follow-up tasks created
- [ ] Time box respected (did not exceed allocated time)
- [ ] Task moved to `done/`

---

## Related

**Related Research:**
- [Link to related investigations]

**Related Vendored Repos:**
- `vendor/[path]/[repo-name]/`

**Referenced By:**
- [Future ADRs or implementation tasks will reference this]

---

## Notes

**Resources:**
- [External articles/docs consulted]
- [People consulted]

**Open Questions:**
- [Questions that remain unanswered]

---

**Last Updated:** YYYY-MM-DD
