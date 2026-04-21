# Semantic / Compression

| Method Code | Short Code | Canonical Name | Definition / What to try | Mechanism | Minimum Viable Experiment | Primary Metrics |
| --- | --- | --- | --- | --- | --- | --- |
| SEM-001 | SCC | Semantic Compression Captions | Rewrite spoken sentences into shortest meaning-preserving phrases. | Reduces verbal load while preserving gist. | Full transcript vs semantic compression on same clip. | Gist recall; action recall; perceived effort |
| SEM-002 | PEO | Proposition Extraction Overlay | Show the underlying claim rather than the literal words. | Lets viewer process mental model instead of syntax. | Human-coded propositions vs transcript overlay. | Main point accuracy; distortion errors |
| SEM-003 | OFC | Operator-First Captioning | Begin overlay with logical operator: Not, Stop, Less, First, Then. | Reveals relation before content; supports phrase structure. | Keyword-only vs Not-X/Y microphrases. | Contrast recall; completion rate |
| SEM-004 | CPC | Contrast Pair Cards | Use two-line contrasts: Not X / Y, Stop X / Start Y. | Uses binary structure to reduce interpretation cost. | Contrast pair vs normal sentence. | Gist recall; save rate |
| SEM-005 | PCFB | Problem–Cause–Fix Beat Cards | Display three labels across the clip: Problem, Cause, Fix. | Externalizes structure and reduces working-memory demand. | Same explainer with/without beat labels. | Action recall; perceived structure |
| SEM-006 | REN | Rule–Example–Nonexample Captions | Show a rule, a good example, then a wrong example. | Creates classification boundaries. | Learning clip with rule-only vs rule-example-nonexample. | Transfer question; completion |
| SEM-007 | CEP | Claim–Evidence–Payoff Overlay | Label claim, proof, and takeaway as separate beats. | Helps viewers trust and encode the argument. | Advice clip with claim/payoff labels vs no labels. | Credibility rating; saves |
| SEM-008 | TFO | Takeaway-First Overlay | Show the final point in the first second, then explain. | Reduces uncertainty and raises reward prediction. | Hook-first vs takeaway-first variants. | 1s/3s hold; completion |
| SEM-009 | AOO | Action-Only Overlay | For advice clips, show only the next action, not explanation. | Turns passive consumption into instruction. | Action-only vs explanation captions. | Action recall; saves |
| SEM-010 | MOC | Memory Object Captions | End with a short, repeatable phrase: Systems beat mood. | Creates a verbal chunk for later recall. | With/without end memory phrase. | Delayed recall; shares |
| SEM-011 | MVC | Minimal Verb Captioning | Preserve verbs over nouns when showing fewer words. | Actions drive what to do next. | Verb-heavy vs noun-heavy compression. | Action recall |
| SEM-012 | SBT | Semantic Breadcrumb Trail | Display one small concept per beat that accumulates meaning. | Supports continuity without sentence blocks. | Breadcrumb vs independent captions. | Sequence recall; effort rating |
| SEM-013 | CLC | Concept Ladder Captions | Move from concrete to abstract: shoes → start → habit. | Builds schema progressively. | Beginner viewers: ladder vs direct concept. | Novice gist recall |
| SEM-014 | CRL | Compression Ratio Ladder | Test 100%, 60%, 30%, 15%, and 5% transcript equivalents. | Finds minimum viable text. | Same clip at multiple compression ratios. | Gist recall; text dwell; effort |
| SEM-015 | KMC | Keyword-to-Microphrase Conversion | Convert isolated keywords into 2–4 word phrase chunks. | Keeps syntax while staying sparse. | Keywords vs microphrases. | Gist recall; visual recall |
| SEM-016 | OIOS | One Idea, One Screen Rule | Never show two unrelated ideas in one overlay event. | Respects working-memory limits. | Multi-idea vs one-idea overlay. | Effort; sequence recall |
| SEM-017 | GET | Gist vs Exact Mode Toggle | Use gist overlay for retention, closed captions for exact speech. | Separates creative and accessibility functions. | Full captions plus gist overlay vs overlay alone. | Preference; comprehension; access rating |
| SEM-018 | AFC | Anti-Filler Captioning | Remove basically, actually, kind of, really, and redundant phrases. | Reduces visual noise. | Auto-filler removal vs verbatim. | Effort; clarity rating |
| SEM-019 | CT | Certainty Tags | Mark claims as Rule, Hypothesis, Example, Warning, Tested. | Prevents overclaiming and adds epistemic clarity. | Claims with/without certainty tags. | Trust rating; misunderstanding rate |
| SEM-020 | QTA | Question-to-Answer Captions | Open with a concise question, answer one beat later. | Uses prediction and curiosity without clickbait. | Question-answer vs statement overlay. | 3s hold; completion; trust |
