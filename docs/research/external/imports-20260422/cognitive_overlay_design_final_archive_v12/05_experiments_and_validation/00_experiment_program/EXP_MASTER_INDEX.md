# EXP Master Index — Deep Experiment Suite v12

This suite defines **30 experiments**. Each file in `01_deep_experiment_protocols/` includes purpose, mechanism bundle, conditions, hypotheses, design, metrics, analysis plan, pass/fail rules, and guardrails.

## Highest-priority run order

1. EXP-001 — Core Overlay Superiority Trial
2. EXP-002 — SCC vs BCC Ablation Trial
3. EXP-013 — Operator-First Syntax Microphrase Trial
4. EXP-014 — Compression Ratio Ladder Trial
5. EXP-015 — Highlight and Bionic Dose-Response Trial
6. EXP-003 — Gaze-Safe Placement Trial
7. EXP-004 — Visual-Load Adaptive Density Trial
8. EXP-005 — Predictive Timing Offset Trial
9. EXP-007 — Muted-First Comprehension Trial
10. EXP-009 — Accessibility Non-Inferiority Trial

## Full experiment list

| EXP | Title | Priority | Phase | Methods | Primary metric | Primary pass logic |
| --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | Core Overlay Superiority Trial | P0 | Pilot first | NCO, FTO, KHT, SCC, BCC, BCC+, HBC | Gist recall + action recall composite. | Pass if SCC beats FTO and/or BCC+ beats BCC by practical threshold without visual recall or accessibility regression. BCC passes only if it beats SCC on a pre-declared metric. |
| EXP-002 | SCC vs BCC Ablation Trial | P0 | Pilot first | SCC, BCC, HBC | Gist recall and concept-word recall. | BCC passes if it improves concept recall or attention efficiency over SCC without increasing effort. |
| EXP-003 | Gaze-Safe Placement Trial | P0 | Pilot first | BFP, GSP, MSP, ASP, USP | Visual recall + gist/action recall composite. | GSP passes if it improves visual recall or reduces obstruction without reducing gist recall. |
| EXP-004 | Visual-Load Adaptive Density Trial | P0 | Pilot first | VLAC, FDC, AOL, OML | Action recall in visually busy clips; gist recall in simple clips. | VLAC passes if it improves recall/effort in high-load frames without hurting low-load frames. |
| EXP-005 | Predictive Timing Offset Trial | P0 | Pilot first | PSP, SLSB, PCC | Gist recall and perceived smoothness. | Predictive priming passes if a pre-cue condition beats sync/post without mismatch penalty. |
| EXP-006 | Kinetic Restraint Trial | P1 | Pilot second | LKM, WPM, KCF, DMC, KT | Gist recall and perceived effort. | Kinetic method passes only if recall improves without effort/fatigue penalty. |
| EXP-007 | Muted-First Comprehension Trial | P0 | Pilot first | MFC, DLC, SCC, BCC+, FTO | Muted gist/action recall. | Muted-first method passes if it improves muted gist/action recall without accessibility regression. |
| EXP-008 | Caption Crowding Stress Test | P0 | Pilot first | CAC, CBU, SOF, ACAC, USP | Readability accuracy and gist recall. | Crowding rules pass if clutter harms performance and rescue methods restore it. |
| EXP-009 | Accessibility Non-Inferiority Trial | P0 | Pilot first | DLC, CCP, NSS, ACAC, LMOM | Accessibility adequacy and full-content comprehension. | DLC variants pass if they preserve access and do not obstruct critical content. |
| EXP-010 | Segmented Platform A/B Test | P1 | Pilot second | NCO, FTO, SCC, BCC, BCC+, MRR, GSP | Completion rate and 3-second hold, with comprehension guardrail when measured. | Method passes platform screen if it produces practical uplift and no confusion/comprehension regression. |
| EXP-011 | Adaptive Router / Bandit Pilot | P2 | Explore later | ASOE, CER, MFM, VLAC, GSP, SCC, BCC+ | Composite performance by segment: recall + completion + effort. | Router passes if it beats global winner by practical threshold and avoids known bad variants. |
| EXP-012 | Memory Object Delayed Recall Trial | P1 | Pilot second | MOC, LFMS, RTPC, SCC, BCC | Delayed gist/action recall after 24–72 hours. | Memory methods pass if delayed recall improves without lowering immediate comprehension. |
| EXP-013 | Operator-First Syntax Microphrase Trial | P0 | Pilot first | OFC, CPC, PCFB, KMC | Contrast recall and gist recall. | Structured microphrases pass if they improve contrast/gist recall without extra effort. |
| EXP-014 | Compression Ratio Ladder Trial | P0 | Pilot first | CRL, SCC, KOC, GET, L2SM | Gist recall and distortion/error rate. | Adopt compression bands only where gist remains above threshold and effort drops. |
| EXP-015 | Highlight and Bionic Dose-Response Trial | P0 | Pilot first | SKH, BCA, BDG, HBC, DWC | Concept recall and perceived effort. | Use the lowest emphasis density that improves concept recall. |
| EXP-016 | Micro-Rest Rhythm Fatigue Trial | P1 | Pilot second | MRR, OBS, CRP, LFMS | Perceived effort and visual recall. | MRR passes if effort drops or visual recall improves without gist loss. |
| EXP-017 | Foveal–Peripheral Overlay Architecture Trial | P1 | Pilot second | FPA, IWP, PIL, PMM | Orientation accuracy and visual recall. | Adopt peripheral cues only when they improve orientation without readability cost. |
| EXP-018 | Mouth-Safe Captioning Trial | P0 | Pilot first | MSP, GSP, DLC, BFP | Speech comprehension and perceived obstruction. | Mouth-safe placement becomes a guardrail if mouth-covered condition harms comprehension/effort. |
| EXP-019 | Action-Mode Minimal Labels Trial | P1 | Pilot second | AOL, OML, ASP, VLAC | Action recall and task-step accuracy. | Action labels pass if task-step recall or visual recall improves without gist loss. |
| EXP-020 | Affective-Semantic Caption Trial | P2 | Explore later | ASE, ESC, ASC, SVC | Tone recognition accuracy. | Affective methods pass only for segments where tone is central and clarity is preserved. |
| EXP-021 | L2 Simplified Overlay Trial | P1 | Pilot second | L2SM, GET, SCC, MFC, DLC | L2 gist/action recall and distortion rate. | L2 mode passes if it reduces distortion/errors and effort. |
| EXP-022 | Expertise-Adaptive Caption Trial | P2 | Explore later | AEC, GET, CRL, SCC, BCC+ | Gist/action recall by expertise group. | Adaptive expertise mode passes if segment-specific variants outperform global style. |
| EXP-023 | Progress-Mapped Microlearning Trial | P1 | Pilot second | PMM, SBT, PCFB, TBC | Completion rate + structure recall. | Progress mapping passes if it improves structure recall/completion without clutter penalty. |
| EXP-024 | Semantic Precue Window Fine Mapping | P1 | Pilot second | PSP, SLSB, PCC | Gist recall + smoothness rating. | Adopt the window that maximizes recall and smoothness with low mismatch. |
| EXP-025 | Visual Recall Non-Interference Trial | P1 | Pilot second | GSP, VLAC, DLC, NIOG | Visual recall of key scene/object/action details. | Overlay passes only if visual recall is non-inferior to baseline while target meaning improves. |
| EXP-026 | Caption Conflict Detector Validation | P2 | Explore later | CCD, ROIS, CAS, ACAC, USP | Detector precision/recall against human ratings and viewer readability outcomes. | Detector passes if high-risk conflicts are caught with acceptable false-negative rate. |
| EXP-027 | Eye-Tracking Efficiency Trial | P2 | Explore later | SCC, BCC, BCC+, GSP, VLAC, MRR | Meaning per fixation and text dwell per correct gist/action item. | Method passes if meaning efficiency improves and critical ROI gaze is preserved. |
| EXP-028 | Platform-Specific Safe Zone Trial | P1 | Pilot second | USP, GSP, BFP, PLSQ | Readability and obstruction rating. | Adopt platform-specific safe zone presets when they reduce obstruction/readability errors. |
| EXP-029 | Ethical Retention Filter Trial | P1 | Pilot second | ERF, CMF, USF, MPS | Useful retention composite: completion + gist/action recall + low confusion. | Only variants improving retention and comprehension pass. |
| EXP-030 | ASOE End-to-End System Trial | P2 | Explore later | ASOE, SBE, PDE, GSP, VLAC, MRR, DLC | Composite: gist/action recall + visual recall + perceived effort + production time. | ASOE passes MVP if it improves consistency/time and does not increase semantic/accessibility errors. |
