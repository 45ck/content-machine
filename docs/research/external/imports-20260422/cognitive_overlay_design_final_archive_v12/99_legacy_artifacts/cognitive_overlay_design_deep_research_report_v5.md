# Cognitive Overlay Design — Deep Research v5

Generated: 2026-04-20

## Core thesis

The strongest current direction is not “Bionic Reading for captions.” It is an adaptive semantic overlay system: semantic compression, signaling, gaze-safe placement, visual-load adaptation, muted-first design, and full accessibility captions.

**Operating law:** do not make viewers read faster; engineer the video so they need fewer fixations to understand more.

## Field hierarchy

| Level | Name | Role |
|---|---|---|
| Broad field | Cognitive Overlay Design | Design of text, placement, timing and motion for video comprehension and retention. |
| Short-form branch | Physiological Retention Typography | Phone-first overlay design grounded in gaze, working memory, saliency, crowding and fatigue. |
| Method family | Semantic Compression Captions | Rewrite speech into compact meaning units. |
| Named method | Bionic Compression Captioning | Semantic compression + operator anchors + bionic concept anchors + beat timing. |
| Advanced protocol | BCC+ | BCC + gaze-safe placement + visual-load adaptation + muted-first design + closed captions. |

## What the literature currently implies

- Captioning/accessibility must remain separate from creative overlays; BCC/BCC+ should not replace closed captions.
- Subtitle speed research supports reducing required reading, not increasing reading speed.
- Partial synchronized captions show that less than the full transcript can preserve comprehension under some conditions.
- Keyword highlighting is more relevant than bionic reading, but sparse highlighting is essential.
- Signaling and redundancy research are stronger foundations than speed-reading claims.
- Visual crowding, foveal/parafoveal reading and working-memory limits imply very short, uncluttered, high-contrast text.
- Video saliency and meaning-map research suggest placement should be driven by where attention is going and what meaning matters.
- Short-form behavior research suggests the overlay should provide fast orientation and quick payoff, but ethical metrics should favor useful comprehension over compulsive watch time.

## Hypothesis cards

### Core BCC

#### H01 — Semantic compression alone will outperform full transcript overlays for gist recall in dense advice/explainer shorts.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Lower word count reduces visual-channel load while preserving meaning.
- **Research interpretation:** This is the core isolation question. The literature supports compression, signaling and low-density highlights, but the combined BCC protocol is not yet directly validated.
- **Predicted direction:** Higher gist recall and lower perceived effort; lower exact wording recall.
- **Caveat / failure mode:** Over-compression can remove nuance. The effect may disappear once semantic compression is isolated; bionic anchors may add noise.
- **Minimum test:** Full transcript vs semantic compression across 12 clips.
- **Metrics:** Gist recall, effort, completion, exact recall
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Estimate marginal lift of compression, anchors and placement separately using factorial design.
- **Sources:** S1;S5;S6;S7;S8;S16;S17;S28;S35

#### H02 — BCC will outperform semantic compression alone only if partial anchors improve recall or orientation beyond clean compression.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Bionic concept anchors act as sparse visual signals.
- **Research interpretation:** This is the core isolation question. The literature supports compression, signaling and low-density highlights, but the combined BCC protocol is not yet directly validated.
- **Predicted direction:** Small gain in memory/subjective clarity; not necessarily speed.
- **Caveat / failure mode:** Bionic effect may be zero or negative. The effect may disappear once semantic compression is isolated; bionic anchors may add noise.
- **Minimum test:** Semantic compression vs BCC.
- **Metrics:** Gist recall, action recall, preference, eye dwell
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Estimate marginal lift of compression, anchors and placement separately using factorial design.
- **Sources:** S8;S16;S17;S5;S6;S7;S28;S35

#### H03 — Heavy bionic formatting will underperform sparse BCC.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Dense visual emphasis increases saccades and visual noise.
- **Research interpretation:** This is the core isolation question. The literature supports compression, signaling and low-density highlights, but the combined BCC protocol is not yet directly validated.
- **Predicted direction:** Lower preference and higher effort for heavy bionic.
- **Caveat / failure mode:** Some users may subjectively prefer heavy styling. The effect may disappear once semantic compression is isolated; bionic anchors may add noise.
- **Minimum test:** BCC vs heavy bionic.
- **Metrics:** Effort, fixation count, completion, preference
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Estimate marginal lift of compression, anchors and placement separately using factorial design.
- **Sources:** S16;S17;S13;S5;S6;S7;S8;S28;S35

### Language structure

#### H04 — Operator-first captions improve contrast recall over keyword-only captions.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Logic words reveal the relationship before concept words are processed.
- **Research interpretation:** The promising mechanism is not isolated keywords; it is rapid recognition of compact phrase relations that preserve logic.
- **Predicted direction:** Better recall of false belief/correction pairs.
- **Caveat / failure mode:** May feel too punchy for nuanced content. Over-short phrases may preserve rhythm but lose grammar or nuance.
- **Minimum test:** Keyword highlight vs Not-X/Y operator-first captions.
- **Metrics:** Contrast recall, gist recall
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Measure whether structured microphrases outperform keyword lists across muted/audio-on modes.
- **Sources:** S4;S9;S12;S35

#### H05 — SVO or relation-preserving microphrases outperform isolated keyword lists.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Basic phrase structure is detected rapidly and supports meaning extraction.
- **Research interpretation:** The promising mechanism is not isolated keywords; it is rapid recognition of compact phrase relations that preserve logic.
- **Predicted direction:** Better gist/action recall than keyword-only overlays.
- **Caveat / failure mode:** Phrases need enough time on screen. Over-short phrases may preserve rhythm but lose grammar or nuance.
- **Minimum test:** SVO phrase vs noun-list vs keyword-only.
- **Metrics:** Gist recall, action recall, perceived clarity
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Measure whether structured microphrases outperform keyword lists across muted/audio-on modes.
- **Sources:** S9;S12;S4;S35

### Prediction timing

#### H06 — Pre-cueing a semantic beat 200–400 ms before speech improves comprehension vs post-cueing.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Predictive semantic priming reduces inference load.
- **Research interpretation:** The overlay may work as a pre-attentive frame if it appears just before the semantic beat, but mistiming can create distraction.
- **Predicted direction:** Higher immediate gist, lower confusion, possibly better retention.
- **Caveat / failure mode:** Early text may feel spoiler-like or mismatched. Pre-cues can spoil the line, fight the speaker or create temporal mismatch.
- **Minimum test:** Pre-cue vs sync vs post-cue.
- **Metrics:** Gist recall, effort, timing preference
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Map the best pre-cue/sync/post-cue window by content type and speech pace.
- **Sources:** S23;S9;S1;S24;S27

#### H07 — Text that lands on visual cuts improves orientation but may increase split attention if cuts are already salient.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Temporal alignment with edit points creates rhythm; too much change competes for gaze.
- **Research interpretation:** The overlay may work as a pre-attentive frame if it appears just before the semantic beat, but mistiming can create distraction.
- **Predicted direction:** Best for simple talking-head clips, worse for complex demos.
- **Caveat / failure mode:** Dependent on editing style. Pre-cues can spoil the line, fight the speaker or create temporal mismatch.
- **Minimum test:** Cut-synced vs speech-synced captions by content type.
- **Metrics:** Completion, effort, visual recall
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Map the best pre-cue/sync/post-cue window by content type and speech pace.
- **Sources:** S18;S3;S1;S9;S23;S24;S27

### Placement

#### H08 — Gaze-safe placement outperforms fixed bottom captions for visual recall and perceived ease in vertical video.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Text closer to relevant content reduces saccades and avoids UI/crowding.
- **Research interpretation:** Placement is likely a major effect because captions steal gaze. The research supports moving text away from critical face/object/action regions.
- **Predicted direction:** Higher visual recall and lower effort without hurting gist.
- **Caveat / failure mode:** Dynamic placement can distract if it jumps. Dynamic placement can become motion noise or land in a cluttered region.
- **Minimum test:** Bottom-fixed vs gaze-safe placement.
- **Metrics:** Visual recall, saccades, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Build vertical-video gaze maps and define safe zones by clip genre.
- **Sources:** S3;S13;S21;S4;S14;S25;S34

#### H09 — Mouth-safe captions improve audio-on comprehension when speech is noisy or fast.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Visible articulation supports speech perception.
- **Research interpretation:** Placement is likely a major effect because captions steal gaze. The research supports moving text away from critical face/object/action regions.
- **Predicted direction:** Higher comprehension and less effort in noisy/low-volume audio.
- **Caveat / failure mode:** Face-safe zones may conflict with available clean background. Dynamic placement can become motion noise or land in a cluttered region.
- **Minimum test:** Mouth-covered vs mouth-safe overlay.
- **Metrics:** Speech comprehension, effort, face dwell
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Build vertical-video gaze maps and define safe zones by clip genre.
- **Sources:** S14;S1;S3;S4;S13;S21;S25;S34

#### H10 — Object-near labels outperform central captions during demonstrations.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Spatial contiguity reduces search cost between instruction and object/action.
- **Research interpretation:** Placement is likely a major effect because captions steal gaze. The research supports moving text away from critical face/object/action regions.
- **Predicted direction:** Better action recall and task understanding.
- **Caveat / failure mode:** Object tracking must be robust. Dynamic placement can become motion noise or land in a cluttered region.
- **Minimum test:** Central BCC vs object-near labels in tutorial clips.
- **Metrics:** Action recall, visual recall
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Build vertical-video gaze maps and define safe zones by clip genre.
- **Sources:** S5;S3;S13;S4;S14;S21;S25;S34

### Visual load

#### H11 — Visual-load adaptive captions outperform fixed-density captions.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Text density should match frame complexity and working-memory demand.
- **Research interpretation:** Density should respond to visual complexity. In busy frames, text competes with the scene and raises channel redundancy/crowding risk.
- **Predicted direction:** Better visual recall and lower perceived effort.
- **Caveat / failure mode:** Manual scoring needed before automation. Adaptive rules may be too complex for editors and may create inconsistency across clips.
- **Minimum test:** Fixed 5-word caption vs adaptive 1–7 word density.
- **Metrics:** Effort, visual recall, completion
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Create a visual complexity score that predicts caption density limits.
- **Sources:** S5;S12;S13;S15;S32;S35

#### H12 — Crowding-aware outlines/background boxes improve legibility in busy frames but reduce aesthetic preference if overused.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Contrast and separation reduce crowding but add visual mass.
- **Research interpretation:** Density should respond to visual complexity. In busy frames, text competes with the scene and raises channel redundancy/crowding risk.
- **Predicted direction:** Improved comprehension in busy scenes; mixed preference.
- **Caveat / failure mode:** Boxes can cover important visuals. Adaptive rules may be too complex for editors and may create inconsistency across clips.
- **Minimum test:** Transparent text vs box/outline by background complexity.
- **Metrics:** Readability, preference, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Create a visual complexity score that predicts caption density limits.
- **Sources:** S13;S15;S5;S12;S32;S35

### Foveal/peripheral

#### H13 — Peripheral text should be replaced by icons/arrows/progress cues for better comprehension.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Peripheral vision handles guidance better than fine reading.
- **Research interpretation:** Detailed words need foveal/parafoveal sampling; peripheral overlay content should become shape/icon/progress cues.
- **Predicted direction:** Higher visual recall and lower effort when peripheral info is symbolic.
- **Caveat / failure mode:** Icons may be ambiguous. Peripheral cues may be too weak for muted comprehension.
- **Minimum test:** Peripheral text vs peripheral icon cue.
- **Metrics:** Visual recall, cue detection, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Quantify which cues can be processed peripherally without stealing foveal gaze.
- **Sources:** S10;S13;S11;S15

#### H14 — Detailed text placed near the expected fixation path beats text placed at platform-safe but semantically unrelated locations.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Foveal sampling determines readable text; meaning regions guide gaze.
- **Research interpretation:** Detailed words need foveal/parafoveal sampling; peripheral overlay content should become shape/icon/progress cues.
- **Predicted direction:** Higher caption completion and lower saccade cost.
- **Caveat / failure mode:** Need eye tracking or proxy saliency. Peripheral cues may be too weak for muted comprehension.
- **Minimum test:** Near-gaze vs unrelated safe-zone captions.
- **Metrics:** Eye dwell, saccades, recall
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Quantify which cues can be processed peripherally without stealing foveal gaze.
- **Sources:** S4;S10;S21;S11;S13;S15

### Memory

#### H15 — Memory-object captions improve delayed recall over ordinary semantic captions.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Rhythmic/contrastive phrasing produces compact retrieval cues.
- **Research interpretation:** These hypotheses target recall objects, not subtitles. The question is whether compressed lines can become durable memory hooks.
- **Predicted direction:** Higher 24-hour recall and share/save intent.
- **Caveat / failure mode:** May sound slogan-like or reduce nuance. Memorable captions can become slogan-like and distort nuance.
- **Minimum test:** Plain compressed caption vs memory-object version.
- **Metrics:** Delayed recall, saves, shares
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Test delayed recall after 10 minutes and 24 hours, not just immediate comprehension.
- **Sources:** S4;S12;S6;S9;S35

#### H16 — Three-beat structures outperform unstructured captions for teaching clips under 45 seconds.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Segmenting reduces working-memory load and supports schema formation.
- **Research interpretation:** These hypotheses target recall objects, not subtitles. The question is whether compressed lines can become durable memory hooks.
- **Predicted direction:** Better sequence/action recall.
- **Caveat / failure mode:** Too many cards can feel like a slide deck. Memorable captions can become slogan-like and distort nuance.
- **Minimum test:** Unstructured captions vs Problem-Cause-Fix beat cards.
- **Metrics:** Sequence recall, action recall
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Test delayed recall after 10 minutes and 24 hours, not just immediate comprehension.
- **Sources:** S5;S12;S6;S9;S35

### Timing rhythm

#### H17 — Micro-rests between caption beats reduce perceived effort compared with continuous caption presence.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Rest gaps let gaze return to face/object and reduce constant reading pressure.
- **Research interpretation:** Caption rhythm should manage transient information and visual fatigue. Pauses may be more useful before complex beats than after them.
- **Predicted direction:** Lower effort and better visual recall; neutral or better completion.
- **Caveat / failure mode:** Rest gaps can reduce muted comprehension if too long. Micro-rests can feel like dead space if the video has low density.
- **Minimum test:** Continuous text vs beat/rest/beat rhythm.
- **Metrics:** Effort, visual recall, completion
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Measure whether micro-rests reduce visual fatigue and preserve visual recall.
- **Sources:** S24;S15;S1;S18;S27;S32

#### H18 — Complex beats should be preceded by a brief visual pause rather than followed by one.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Pre-complexity pause may prepare attention and reduce load.
- **Research interpretation:** Caption rhythm should manage transient information and visual fatigue. Pauses may be more useful before complex beats than after them.
- **Predicted direction:** Lower effort and better action recall.
- **Caveat / failure mode:** Can slow perceived pace. Micro-rests can feel like dead space if the video has low density.
- **Minimum test:** Pause-before vs pause-after complex caption.
- **Metrics:** Effort, recall
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Measure whether micro-rests reduce visual fatigue and preserve visual recall.
- **Sources:** S24;S12;S18;S27;S32

### Motion

#### H19 — Logic-motion captions beat decorative motion captions.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Movement is useful when it expresses sequence or causality.
- **Research interpretation:** Motion is only defensible if it expresses sequence, causality or emphasis. Decorative motion likely increases load.
- **Predicted direction:** Higher clarity and lower fatigue than bouncing/popping every word.
- **Caveat / failure mode:** Motion preferences differ by genre. Motion may increase salience but reduce comprehension or accessibility.
- **Minimum test:** Logic motion vs decorative motion vs static.
- **Metrics:** Gist recall, fatigue, preference
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Dose-test motion types against static BCC and word-by-word captions.
- **Sources:** S18;S5;S35

#### H20 — Karaoke/word-by-word captions underperform semantic beat captions for dense educational content.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Word-by-word tracking consumes attention without compressing meaning.
- **Research interpretation:** Motion is only defensible if it expresses sequence, causality or emphasis. Decorative motion likely increases load.
- **Predicted direction:** Lower gist recall and higher effort for dense clips.
- **Caveat / failure mode:** May work better for comedy/music/rhythm. Motion may increase salience but reduce comprehension or accessibility.
- **Minimum test:** Word-by-word vs semantic beat captions.
- **Metrics:** Gist recall, effort, text dwell
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Dose-test motion types against static BCC and word-by-word captions.
- **Sources:** S5;S6;S18;S35

### Affective

#### H21 — Affective-semantic captions improve tone recognition over plain BCC in emotional or persuasive clips.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Typography/prosody cues encode emotion missing from text.
- **Research interpretation:** Affective overlays are adjacent to BCC but encode tone/prosody rather than semantic structure. They should be layered carefully.
- **Predicted direction:** Higher tone recognition and engagement, no loss if restrained.
- **Caveat / failure mode:** Color/motion can harm accessibility or legibility. Tone cues can conflict with semantic anchors or feel gimmicky.
- **Minimum test:** Plain BCC vs affective-semantic BCC.
- **Metrics:** Tone recognition, preference, recall
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Determine when tone/prosody cues help versus distract from meaning.
- **Sources:** S19;S20;S29;S33

#### H22 — Speech-style cues should be decoupled from semantic anchors to avoid overloading the same word.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** One word cannot carry concept, emotion, motion and timing without clutter.
- **Research interpretation:** Affective overlays are adjacent to BCC but encode tone/prosody rather than semantic structure. They should be layered carefully.
- **Predicted direction:** Lower effort with separated semantic and affective layers.
- **Caveat / failure mode:** Needs careful design prototypes. Tone cues can conflict with semantic anchors or feel gimmicky.
- **Minimum test:** Combined styling vs separated layers.
- **Metrics:** Effort, tone recognition, gist
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Determine when tone/prosody cues help versus distract from meaning.
- **Sources:** S19;S20;S13;S29;S33

### Accessibility

#### H23 — Dual-layer captioning beats overlay-only design for accessibility and retention combined.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Full captions serve access; semantic overlay serves gist.
- **Research interpretation:** Accessibility requires full captions. BCC is a creative overlay and must not become the only channel of speech information.
- **Predicted direction:** Better overall comprehension and inclusivity than either alone.
- **Caveat / failure mode:** Visual stacking can crowd; layers need positioning. Overlay-only designs exclude users who need full captions.
- **Minimum test:** Closed captions only vs BCC overlay only vs dual-layer.
- **Metrics:** Gist, exact recall, DHH/L2 preference
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Validate dual-layer captions with DHH, L2 and muted-viewer groups.
- **Sources:** S1;S5;S8;S25;S26;S27;S28;S29

### Viewer adaptation

#### H24 — Muted viewers need more self-contained overlays than audio-on viewers.

- **Evidence grade:** Strong adjacent evidence
- **Mechanism:** Without audio, the visual channel becomes primary verbal channel.
- **Research interpretation:** Viewer prior knowledge, language, hearing mode and attention state can plausibly change optimal density and explicitness.
- **Predicted direction:** Muted-first overlays improve gist under sound-off conditions.
- **Caveat / failure mode:** May be redundant for audio-on viewers. Adaptation may require data that platforms do not expose.
- **Minimum test:** Audio-on cue overlay vs muted-first overlay under muted viewing.
- **Metrics:** Muted comprehension, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Segment by prior knowledge, language proficiency and audio mode.
- **Sources:** S1;S7;S12;S22;S28

#### H25 — Beginners benefit from more explicit labels; experts benefit from compressed shorthand.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Prior knowledge moderates redundancy and processing load.
- **Research interpretation:** Viewer prior knowledge, language, hearing mode and attention state can plausibly change optimal density and explicitness.
- **Predicted direction:** Interaction effect by expertise.
- **Caveat / failure mode:** Requires audience segmentation. Adaptation may require data that platforms do not expose.
- **Minimum test:** Beginner vs expert overlay variants.
- **Metrics:** Gist/action recall, effort
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Segment by prior knowledge, language proficiency and audio mode.
- **Sources:** S5;S22;S1;S7;S12;S28

#### H26 — L2 viewers may prefer lower lexical density but more complete syntax than native viewers.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Compression reduces load; but too much compression removes grammatical support.
- **Research interpretation:** Viewer prior knowledge, language, hearing mode and attention state can plausibly change optimal density and explicitness.
- **Predicted direction:** Best L2 performance at medium compression, not keyword-only.
- **Caveat / failure mode:** Language proficiency variability. Adaptation may require data that platforms do not expose.
- **Minimum test:** Compression levels by L1/L2 group.
- **Metrics:** Comprehension, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Segment by prior knowledge, language proficiency and audio mode.
- **Sources:** S7;S11;S5;S1;S12;S22;S28

### Short-form behavior

#### H27 — Hook overlays that resolve within 2–3 seconds outperform open-loop hooks that delay payoff.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Short-form viewers need rapid reward prediction.
- **Research interpretation:** Short-form platforms create a rapid reward-orientation loop. The text system should resolve uncertainty quickly, not merely hold attention.
- **Predicted direction:** Higher 3-second hold and lower confusion.
- **Caveat / failure mode:** Platform algorithms may reward open loops differently. Optimizing early payoff can collapse nuance or overfit to engagement.
- **Minimum test:** Fast-resolution hook vs delayed payoff hook.
- **Metrics:** 1s/3s hold, comments confusion
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Relate cognitive metrics to saves/shares instead of only watch time.
- **Sources:** S2;S23;S29;S30;S31;S33

#### H28 — Gist-per-second predicts saves better than watch time alone for educational shorts.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Useful comprehension drives saves; raw retention may reflect confusion.
- **Research interpretation:** Short-form platforms create a rapid reward-orientation loop. The text system should resolve uncertainty quickly, not merely hold attention.
- **Predicted direction:** Higher correlation between gist/action score and saves.
- **Caveat / failure mode:** Requires matching platform data to recall data. Optimizing early payoff can collapse nuance or overfit to engagement.
- **Minimum test:** Platform A/B plus recall survey.
- **Metrics:** Saves, gist recall, watch time
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Relate cognitive metrics to saves/shares instead of only watch time.
- **Sources:** S2;S4;S23;S29;S30;S31;S33

### Ethics

#### H29 — Optimizing for meaning retained per second reduces compulsive design compared with optimizing for watch time alone.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Objective function shifts from capture to comprehension.
- **Research interpretation:** The optimization target matters. Meaning retained per second is safer than raw watch-time maximization.
- **Predicted direction:** Different design choices: fewer fake loops, more payoff.
- **Caveat / failure mode:** Ethical outcomes hard to measure. Ethical metrics are harder to measure than watch time.
- **Minimum test:** Compare optimization variants.
- **Metrics:** Comprehension, trust, retention
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Define guardrails that optimize usefulness without maximizing compulsion.
- **Sources:** S2;S30;S31;S33

### AI placement

#### H30 — Saliency-plus-meaning placement beats saliency-only placement.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Meaning regions matter beyond low-level salience.
- **Research interpretation:** The technical frontier is combining saliency maps, semantic maps, object detection and platform-safe zones.
- **Predicted direction:** Better comprehension without losing visual recall.
- **Caveat / failure mode:** Requires model pipeline. Saliency models may fail on creator-specific styles or UI overlays.
- **Minimum test:** Saliency-only vs saliency+semantic placement.
- **Metrics:** Gist, visual recall, saccade cost
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Fuse saliency, meaning maps, UI detection and object tracking in a placement engine.
- **Sources:** S3;S4;S13;S21;S34

#### H31 — Platform UI-safe zones should be treated as hard constraints, not soft preferences.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Crowding with UI reduces recognizability and creates accidental occlusion.
- **Research interpretation:** The technical frontier is combining saliency maps, semantic maps, object detection and platform-safe zones.
- **Predicted direction:** Higher readability and preference.
- **Caveat / failure mode:** Varies by platform/device. Saliency models may fail on creator-specific styles or UI overlays.
- **Minimum test:** UI-safe vs UI-overlap placement.
- **Metrics:** Readability, completion, complaints
- **Decision rule:** Keep only if platform completion improves and clarification comments do not increase.
- **Next discovery:** Fuse saliency, meaning maps, UI detection and object tracking in a placement engine.
- **Sources:** S13;S15;S3;S4;S21;S34

### AI generation

#### H32 — LLM-generated semantic beats need human review for nuance and factual preservation.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Compression can distort meaning, especially with causality or health claims.
- **Research interpretation:** LLMs can draft semantic beats but require human oversight for nuance, accessibility and factual preservation.
- **Predicted direction:** Human-reviewed variants outperform raw LLM variants.
- **Caveat / failure mode:** Subjective review can be inconsistent. LLMs can over-compress and introduce misleading claims.
- **Minimum test:** Raw LLM BCC vs edited BCC.
- **Metrics:** Accuracy, trust, comprehension
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Create human review criteria for compression accuracy and bias.
- **Sources:** S5;S25;S35

### Measurement

#### H33 — Meaning per fixation is a better lab metric than reading speed.

- **Evidence grade:** Moderate evidence
- **Mechanism:** The objective is efficient comprehension, not word throughput.
- **Research interpretation:** Reading speed is too narrow. The right lab metrics are meaning per fixation, dwell allocation and gist/action recall.
- **Predicted direction:** Better explains recall and preference across variants.
- **Caveat / failure mode:** Requires eye-tracking. Lab metrics may not transfer cleanly to platform performance.
- **Minimum test:** Eye-tracking experiment.
- **Metrics:** Gist/fixation, action/fixation
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Validate meaning-per-fixation against platform metrics.
- **Sources:** S1;S4;S10;S3;S6;S12;S23

#### H34 — Text dwell time should have an inverted-U relationship with comprehension.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Too little text dwell means missed; too much means overload or visual theft.
- **Research interpretation:** Reading speed is too narrow. The right lab metrics are meaning per fixation, dwell allocation and gist/action recall.
- **Predicted direction:** Moderate dwell predicts best gist/action recall.
- **Caveat / failure mode:** Needs eye-tracking or proxy. Lab metrics may not transfer cleanly to platform performance.
- **Minimum test:** Analyze dwell vs recall across variants.
- **Metrics:** Text dwell, recall, visual recall
- **Decision rule:** Keep if visual recall improves ≥10% while gist remains non-inferior.
- **Next discovery:** Validate meaning-per-fixation against platform metrics.
- **Sources:** S1;S6;S21;S3;S12;S23

#### H35 — Comments asking for clarification are a useful platform proxy for comprehension failure.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Confusion appears behaviorally when semantic compression is too aggressive.
- **Research interpretation:** Reading speed is too narrow. The right lab metrics are meaning per fixation, dwell allocation and gist/action recall.
- **Predicted direction:** Higher confusion comments for over-compressed or heavy-motion variants.
- **Caveat / failure mode:** Comments are noisy and biased. Lab metrics may not transfer cleanly to platform performance.
- **Minimum test:** Platform A/B comment coding.
- **Metrics:** Clarification comments, completion
- **Decision rule:** Keep only if platform completion improves and clarification comments do not increase.
- **Next discovery:** Validate meaning-per-fixation against platform metrics.
- **Sources:** S2;S1;S3;S6;S12;S23

### Typography

#### H36 — Contrast and whitespace will outperform complex font treatments for mobile legibility.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Crowding and viewing-distance constraints dominate subtle typography effects.
- **Research interpretation:** Legibility and contrast likely dominate exotic font effects. Bionic anchors are a minor cue, not a core engine.
- **Predicted direction:** Higher readability and preference for clean high-contrast layouts.
- **Caveat / failure mode:** Aesthetic brand styles may conflict. Typography preferences vary; color/contrast constraints limit creativity.
- **Minimum test:** Clean vs complex text styling.
- **Metrics:** Readability, effort
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Find the minimum contrast/size/spacing envelope for phone viewing.
- **Sources:** S13;S15;S16;S17;S26;S32

#### H37 — Bionic anchors are most likely useful on long concept words, not short function words.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Partial emphasis only has a possible cueing role when word recognition could benefit from a stem cue.
- **Research interpretation:** Legibility and contrast likely dominate exotic font effects. Bionic anchors are a minor cue, not a core engine.
- **Predicted direction:** No benefit or harm on short function words; small benefit on long key terms.
- **Caveat / failure mode:** Mechanism uncertain. Typography preferences vary; color/contrast constraints limit creativity.
- **Minimum test:** Long vs short word anchoring.
- **Metrics:** Recall, effort, preference
- **Decision rule:** Keep if perceived effort drops ≥0.4/5 or fixation burden drops without reducing comprehension.
- **Next discovery:** Find the minimum contrast/size/spacing envelope for phone viewing.
- **Sources:** S16;S17;S8;S13;S15;S26;S32

### Narrative content

#### H38 — BCC is weaker for emotional storytelling than for conceptual advice unless paired with affective captions.

- **Evidence grade:** Speculative / needs direct test
- **Mechanism:** Stories rely on nuance, timing and emotion rather than compressed propositional content.
- **Research interpretation:** Narrative clips depend on timing and emotion. BCC may flatten stories unless paired with affective captions.
- **Predicted direction:** Plain BCC underperforms; affective-semantic may recover engagement.
- **Caveat / failure mode:** Genre boundaries fuzzy. Compression may flatten emotional pacing.
- **Minimum test:** Advice vs story clips by overlay type.
- **Metrics:** Emotion recall, completion, preference
- **Decision rule:** Keep only if platform completion improves and clarification comments do not increase.
- **Next discovery:** Test BCC vs affective-semantic captions for emotional/story clips.
- **Sources:** S19;S20;S5;S23;S29

### Tutorial content

#### H39 — Action labels beat sentence captions during hands-on demonstrations.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Visual action must remain primary; text should annotate the step.
- **Research interpretation:** Tutorials are action-driven. Spatial labels near the action may beat abstract sentence overlays.
- **Predicted direction:** Better action recall and visual recall.
- **Caveat / failure mode:** Requires object/hand-aware placement. Object tracking errors can place labels over the action.
- **Minimum test:** Sentence BCC vs action labels.
- **Metrics:** Action recall, visual recall
- **Decision rule:** Keep if it improves gist/action recall ≥10% without increasing perceived effort or reducing visual recall.
- **Next discovery:** Compare object-near labels, central BCC and no overlay during demonstrations.
- **Sources:** S10;S13;S21;S5;S35

### System design

#### H40 — The best product architecture is not a caption generator but a semantic-overlay decision engine.

- **Evidence grade:** Moderate evidence
- **Mechanism:** Captions are one layer; placement, timing, density and semantics drive performance.
- **Research interpretation:** The product should decide when, where and how text is useful; it should not simply style every transcript.
- **Predicted direction:** Tool users produce better overlays when guided by scoring rules.
- **Caveat / failure mode:** More complex UX. A decision engine can become too complex unless the workflow is editor-friendly.
- **Minimum test:** Manual workflow vs automated transcript-to-caption tool.
- **Metrics:** Rubric score, performance metrics
- **Decision rule:** Keep only if primary metric improves and no accessibility/comprehension regression appears.
- **Next discovery:** Prototype the semantic-overlay decision engine with manual override.
- **Sources:** S3;S4;S5;S22;S25;S34;S35

## Source map

| ID | Field | Key finding | URL |
|---|---|---|---|
| S1 | Sound-off subtitle processing | Watching subtitled video without sound increased cognitive load and reduced comprehension, immersion and enjoyment; subtitles became the main verbal information source. | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0306251 |
| S2 | Short-form video cognition | Scroll immersion and short-form video use predicted attention difficulty, working-memory disruption and cognitive fatigue in a 2025 survey study. | https://www.sciencedirect.com/science/article/pii/S0001691825009874 |
| S3 | Video saliency prediction | AIM 2024 introduced AViMoS: 1,500 videos, vertical content, audio tracks and fixation-like mouse tracking from thousands of observers. | https://arxiv.org/abs/2409.14827 |
| S4 | Meaning maps / semantic attention | Meaning maps accounted for unique variance in real-world scene attention beyond low-level image salience. | https://www.nature.com/articles/s41598-018-31894-5 |
| S5 | Multimedia redundancy | A 2023 review of 63 studies separates content redundancy from working-memory-channel redundancy; redundant written/visual streams can overload. | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1148035/full |
| S6 | Subtitle speed | Subtitle-speed research shows faster subtitles can reduce comprehension and produce more incomplete reading and fewer rereads. | https://www.cambridge.org/core/journals/applied-psycholinguistics/article/why-subtitle-speed-matters-evidence-from-word-skipping-and-rereading/A7DB0CBF5910353143738CF9C1721317 |
| S7 | Partial synchronized captions | Partial synchronized captioning achieved full-caption-level comprehension while showing less than 30% of transcript in an L2 video context. | https://www.cambridge.org/core/journals/recall/article/partial-and-synchronized-captioning-a-new-tool-to-assist-learners-in-developing-second-language-listening-skill/9394E3F0AD25FD5F32895F965F7ECCAD |
| S8 | Keyword highlighting in captions | DHH participants rated highlighted captions easier to read/follow and with lower perceived task load in a keyword-highlighting caption study. | https://dl.acm.org/doi/10.1145/3308561.3353781 |
| S9 | At-a-glance language | A 2024 Science Advances paper found at-a-glance language comprehension begins by detecting basic phrase structure rapidly. | https://www.science.org/doi/10.1126/sciadv.adr9951 |
| S10 | Foveal/parafoveal reading | Parafoveal processing supports reading around fixation; fine reading still depends on gaze-adjacent information. | https://link.springer.com/article/10.3758/s13414-011-0219-2 |
| S11 | Perceptual span differences | Fast readers tend to have larger perceptual spans than slow readers in eye-movement research. | https://pmc.ncbi.nlm.nih.gov/articles/PMC3075059/ |
| S12 | Visual working memory | Visual working memory capacity is limited and varies across people; classic/simple displays suggest only a few objects can be retained. | https://www.sciencedirect.com/science/article/abs/pii/S1364661313001265 |
| S13 | Visual crowding | Crowding is a fundamental peripheral-vision limit affecting object recognition, reading, driving and visual search. | https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2024.1332701/full |
| S14 | Speaker face / mouth | Seeing a speaker’s articulatory movements improves spoken-word understanding, especially under noisy conditions. | https://academic.oup.com/cercor/article/17/5/1147/343892 |
| S15 | Smartphone viewing ergonomics | A 2024 smartphone study examined close viewing distance, font size and eyestrain in smartphone users. | https://pmc.ncbi.nlm.nih.gov/articles/PMC11629835/ |
| S16 | Bionic Reading empirical test | A 2024 Acta Psychologica study found no significant reading-time benefit for Bionic Reading over normal text. | https://www.sciencedirect.com/science/article/pii/S0001691824001811 |
| S17 | Bionic Reading eye tracking | A later eye-tracking/usability study found longer reading time in some bionic conditions and no clear legibility advantage. | https://ideas.repec.org/a/sae/sagope/v15y2025i4p21582440251376158.html |
| S18 | Kinetic typography | Kinetic typography can aid learning when it supports logical/sequential presentation; excessive motion can cause fatigue and overload. | https://www.nature.com/articles/s41599-023-01646-6 |
| S19 | Affective speech-style captions | A 2025 caption system visualized speech styles through punctuation, paint-on, color and boldness while preserving legibility. | https://www.sciencedirect.com/science/article/abs/pii/S1071581924001691 |
| S20 | Affective caption design space | Caption Royale explored affective captions using visual typographic modulations for DHH viewers. | https://par.nsf.gov/biblio/10521039-caption-royale-exploring-design-space-affective-captions-from-perspective-deaf-hard-hearing-individuals |
| S21 | Dynamic / speaker-following subtitles | Dynamic subtitles produced gaze patterns closer to no-subtitle baseline than traditional bottom subtitles in eye-tracking research. | https://research.manchester.ac.uk/en/publications/dynamic-subtitles-the-user-experience |
| S22 | User-adaptive visualization | A 2025 state-of-the-art report notes that user traits can modulate visualization accuracy, speed and engagement. | https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.15271 |
| S23 | Predictive visual attention | A 2025 review frames visual attention as inferential, shaped by prior knowledge, goals, uncertainty, confidence and surprise. | https://www.sciencedirect.com/science/article/abs/pii/S014976342500524X |
| S24 | Complexity-determined pauses | Multimedia-pausing research tested pauses before or after complex high-element-interactivity sections. | https://ajet.org.au/index.php/AJET/article/view/7267 |
| S25 | W3C captions accessibility | W3C says captions are text versions of speech and non-speech audio needed to understand content, synchronized with audio. | https://www.w3.org/WAI/media/av/captions/ |
| S26 | WCAG contrast | WCAG 2.2 defines contrast requirements for text and large text. | https://www.w3.org/TR/WCAG22/ |
| S27 | Netflix timed-text timing | Netflix requires minimum subtitle duration around 20 frames and recommends reserving that minimum for one- or two-word subtitles. | https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines |
| S28 | Section 508 caption speed | Section 508 guidance warns speech above about 180 wpm can be too fast for captions. | https://www.section508.gov/create/captions-transcripts/ |
| S29 | TikTok captioning practices | CHI 2024 examined user-driven captioning practices on TikTok and accessibility/enjoyment tensions. | https://dl.acm.org/doi/10.1145/3613904.3642177 |
| S30 | Short video attention EEG | A 2024 EEG study links stronger short-video addiction tendency to diminished executive-control indicators. | https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2024.1383913/full |
| S31 | Short-video cue reactivity fNIRS | A 2025 fNIRS study found higher risk-taking and cue sensitivity among participants with short-video addiction. | https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2025.1542271/full |
| S32 | Digital screen blink / dry eye | Smartphone/screen use is associated with reduced blink frequency and incomplete blinks; blink-training work targets screen-related dry-eye symptoms. | https://www.nature.com/articles/s41746-025-02053-8 |
| S33 | TikTok subtitle style engagement | A 2025 study examined emojis/non-standard typography and engagement on TikTok. | https://www.jatjournal.org/index.php/jat/article/view/339 |
| S34 | Video-saliency dataset homepage | AViMoS dataset includes vertical videos, 1,500 clips and fixation-like traces from over 5,000 observers. | https://github.com/msu-video-group/ECCVW24_Saliency_Prediction |
| S35 | Multimedia design principles | Mayer-style principles include coherence, signaling, spatial/temporal contiguity, segmenting and redundancy management. | https://www.sciencedirect.com/science/article/abs/pii/S2211368121000231 |

## Recommended next sequence

1. Run Semantic Compression vs BCC to isolate whether bionic anchors matter.
2. Run BCC vs BCC+ to isolate placement/adaptive-density value.
3. Run phrase grammar testing: keyword-only vs Not-X/Y vs Problem/Cause/Fix.
4. Run timing-offset testing: pre-cue, sync, post-cue.
5. Run placement mapping by vertical-video genre.
6. Validate with muted, audio-on, DHH, L2, beginner and expert viewers.