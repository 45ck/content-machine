# Cognitive Overlay Design — Big Idea Bank v6

This report expands the research program into a broad list of overlay/caption mechanisms to test for TikTok/Reels/Shorts.

## Core thesis

> Do not make viewers read faster. Engineer the video so they need fewer fixations to understand more.

## Field hierarchy

- **Field:** Cognitive Overlay Design
- **Short-form branch:** Physiological Retention Typography
- **Method family:** Semantic Compression Captions
- **Named method:** Bionic Compression Captioning
- **Advanced protocol:** BCC+

## Highest-priority ideas

### H001 — Semantic Compression Captions

**Category:** Semantic / Compression  

**Try:** Rewrite spoken sentences into shortest meaning-preserving phrases.  

**Mechanism:** Reduces verbal load while preserving gist.  

**Minimum experiment:** Full transcript vs semantic compression on same clip.  

**Metrics:** Gist recall; action recall; perceived effort  

**Source IDs:** S06; S07; S09; S10; S27

### H005 — Problem–Cause–Fix Beat Cards

**Category:** Semantic / Compression  

**Try:** Display three labels across the clip: Problem, Cause, Fix.  

**Mechanism:** Externalizes structure and reduces working-memory demand.  

**Minimum experiment:** Same explainer with/without beat labels.  

**Metrics:** Action recall; perceived structure  

**Source IDs:** S06; S07; S09; S10; S27

### H014 — Compression Ratio Ladder

**Category:** Semantic / Compression  

**Try:** Test 100%, 60%, 30%, 15%, and 5% transcript equivalents.  

**Mechanism:** Finds minimum viable text.  

**Minimum experiment:** Same clip at multiple compression ratios.  

**Metrics:** Gist recall; text dwell; effort  

**Source IDs:** S06; S07; S09; S10; S27

### H016 — One Idea, One Screen Rule

**Category:** Semantic / Compression  

**Try:** Never show two unrelated ideas in one overlay event.  

**Mechanism:** Respects working-memory limits.  

**Minimum experiment:** Multi-idea vs one-idea overlay.  

**Metrics:** Effort; sequence recall  

**Source IDs:** S06; S07; S09; S10; S27

### H017 — Gist vs Exact Mode Toggle

**Category:** Semantic / Compression  

**Try:** Use gist overlay for retention, closed captions for exact speech.  

**Mechanism:** Separates creative and accessibility functions.  

**Minimum experiment:** Full captions plus gist overlay vs overlay alone.  

**Metrics:** Preference; comprehension; access rating  

**Source IDs:** S01; S05; S09; S10

### H023 — Sparse Keyword Highlight

**Category:** Typography / Anchors  

**Try:** Highlight only 5–15% of displayed words.  

**Mechanism:** Reduces search cost without turning everything salient.  

**Minimum experiment:** Sparse vs dense highlight.  

**Metrics:** Effort; recall; gaze distribution  

**Source IDs:** S08; S09

### H040 — Accessible Contrast Auto-Check

**Category:** Typography / Anchors  

**Try:** Auto-check caption/backplate contrast per frame.  

**Mechanism:** Prevents unreadable overlays.  

**Minimum experiment:** Manual vs auto contrast corrected.  

**Metrics:** Readability; WCAG pass rate  

**Source IDs:** S28; S15

### H047 — Minimum Exposure Guardrail

**Category:** Timing / Rhythm  

**Try:** No caption shorter than 0.8 sec except one-word impact beats.  

**Mechanism:** Respects reading timing constraints.  

**Minimum experiment:** Min duration on/off variants.  

**Metrics:** Missed caption rate; effort  

**Source IDs:** S03; S04; S06

### H056 — Mouth-Safe Captioning

**Category:** Placement / Gaze  

**Try:** Never cover the mouth during speech-heavy clips.  

**Mechanism:** Protects audiovisual speech cues.  

**Minimum experiment:** Mouth-covered vs mouth-safe overlay.  

**Metrics:** Comprehension; face dwell  

**Source IDs:** S18; S32

### H058 — Action-Safe Captioning

**Category:** Placement / Gaze  

**Try:** Avoid hands, products, joints, cursor, and key action path.  

**Mechanism:** Prevents text from stealing task-critical visual information.  

**Minimum experiment:** Action-covered vs action-safe.  

**Metrics:** Visual recall; task accuracy  

**Source IDs:** S10; S14; S15

### H063 — Crowding-Aware Captioning

**Category:** Placement / Gaze  

**Try:** Avoid placing text near other text, UI, or high-frequency background.  

**Mechanism:** Reduces peripheral clutter interference.  

**Minimum experiment:** Crowded vs uncrowded placement.  

**Metrics:** Readability; effort  

**Source IDs:** S15; S28

### H085 — De-Karaoke Captions

**Category:** Motion / Kinetic  

**Try:** Replace active word-by-word highlighting with semantic beats for dense content.  

**Mechanism:** Avoids forced tracking of every word.  

**Minimum experiment:** Karaoke vs semantic beats.  

**Metrics:** Gist recall; effort  

**Source IDs:** S06; S24

### H091 — Visual-Load Adaptive Word Count

**Category:** Visual Load / Clutter  

**Try:** Use fewer overlay words when the frame is visually busy.  

**Mechanism:** Balances visual-channel load.  

**Minimum experiment:** Fixed vs adaptive density.  

**Metrics:** Gist; visual recall; effort  

**Source IDs:** S10; S15; S17

### H098 — Simultaneous Text Budget

**Category:** Visual Load / Clutter  

**Try:** Limit screen to one primary text block plus one micro-label.  

**Mechanism:** Keeps working memory manageable.  

**Minimum experiment:** Budgeted vs unbudgeted overlays.  

**Metrics:** Effort; recall  

**Source IDs:** S10; S17

### H101 — Frame-Level Contrast Correction

**Category:** Visual Load / Clutter  

**Try:** Auto adjust text/backplate contrast per frame.  

**Mechanism:** Keeps readability stable across video.  

**Minimum experiment:** Static style vs auto-correct.  

**Metrics:** WCAG ratio; readability  

**Source IDs:** S28

### H107 — Muted-First Mode

**Category:** Sound / Multimodal  

**Try:** Overlay carries enough meaning without sound.  

**Mechanism:** Supports sound-off viewing.  

**Minimum experiment:** Muted-first vs cue-mode.  

**Metrics:** Muted gist; effort  

**Source IDs:** S05; S01

### H108 — Dual-Layer Captioning

**Category:** Sound / Multimodal  

**Try:** Full closed captions plus separate semantic overlay.  

**Mechanism:** Preserves accessibility while enabling retention design.  

**Minimum experiment:** Closed captions only vs dual-layer.  

**Metrics:** Access rating; gist; clutter  

**Source IDs:** S01; S02; S05

### H109 — Non-Speech Sound Cues

**Category:** Sound / Multimodal  

**Try:** Show [laughter], [music rises], [door slam] only when meaningful.  

**Mechanism:** Captions include meaningful audio context.  

**Minimum experiment:** With/without sound cues.  

**Metrics:** Comprehension; access rating  

**Source IDs:** S01; S03

### H131 — Closed-Caption Preservation Rule

**Category:** Personalization / Access  

**Try:** Always keep full captions available when using creative overlays.  

**Mechanism:** Separates accessibility from retention styling.  

**Minimum experiment:** User tests with overlay only vs dual layer.  

**Metrics:** Access rating; comprehension  

**Source IDs:** S01; S02

### H138 — Color-Blind Safe Coding

**Category:** Personalization / Access  

**Try:** Never rely on color alone; pair with labels/icons/shape.  

**Mechanism:** Accessibility and robustness.  

**Minimum experiment:** Color-only vs color+label.  

**Metrics:** Role identification; access rating  

**Source IDs:** S28

### H060 — UI-Safe Zone Templates

**Category:** Placement / Gaze  

**Try:** Define TikTok/Reels/Shorts danger zones and avoid them.  

**Mechanism:** Prevents platform interface collision.  

**Minimum experiment:** Bottom-fixed vs UI-safe placement.  

**Metrics:** Readability; occlusion rate  

**Source IDs:** S02; S15; S28

### H074 — Caption Collision Detector

**Category:** Placement / Gaze  

**Try:** Detect overlap with native captions, stickers, captions, and UI.  

**Mechanism:** Prevents clutter stacking.  

**Minimum experiment:** Manual vs auto collision check.  

**Metrics:** Collision count; readability  

**Source IDs:** S15; S28

### H096 — Caption Conflict Detector

**Category:** Visual Load / Clutter  

**Try:** Detect when too many text layers exist simultaneously.  

**Mechanism:** Prevents split attention and crowding.  

**Minimum experiment:** Conflict detector on/off.  

**Metrics:** Text count; effort; recall  

**Source IDs:** S10; S15

### H099 — Native Caption Conflict Checker

**Category:** Visual Load / Clutter  

**Try:** Avoid overlay collisions with platform auto-captions or imported captions.  

**Mechanism:** Separates full caption layer and semantic layer.  

**Minimum experiment:** With/without conflict checking.  

**Metrics:** Occlusion; user complaints  

**Source IDs:** S01; S02; S15

### H144 — Face/Mouth/Hand/Object Detector

**Category:** AI / Adaptive  

**Try:** Detect visual regions that should not be covered.  

**Mechanism:** Automates safe zones.  

**Minimum experiment:** Manual vs CV safe-zone detection.  

**Metrics:** Occlusion errors; readability  

**Source IDs:** S14; S18; S32

### H149 — Platform Safe-Zone Templates

**Category:** AI / Adaptive  

**Try:** Reusable templates for TikTok/Reels/Shorts/Stories UI zones.  

**Mechanism:** Prevents UI occlusion.  

**Minimum experiment:** Template vs manual export.  

**Metrics:** Occlusion rate by platform  

**Source IDs:** S02; S28

### H154 — Human-in-the-Loop Editor

**Category:** AI / Adaptive  

**Try:** AI proposes; editor approves proposition, anchor, placement, timing.  

**Mechanism:** Balances speed with correctness.  

**Minimum experiment:** AI-only vs human-in-loop.  

**Metrics:** Accuracy; time saved  

**Source IDs:** S30

### H002 — Proposition Extraction Overlay

**Category:** Semantic / Compression  

**Try:** Show the underlying claim rather than the literal words.  

**Mechanism:** Lets viewer process mental model instead of syntax.  

**Minimum experiment:** Human-coded propositions vs transcript overlay.  

**Metrics:** Main point accuracy; distortion errors  

**Source IDs:** S06; S07; S09; S10; S27

### H003 — Operator-First Captioning

**Category:** Semantic / Compression  

**Try:** Begin overlay with logical operator: Not, Stop, Less, First, Then.  

**Mechanism:** Reveals relation before content; supports phrase structure.  

**Minimum experiment:** Keyword-only vs Not-X/Y microphrases.  

**Metrics:** Contrast recall; completion rate  

**Source IDs:** S06; S07; S09; S10; S27

### H022 — Full-Word Operator Anchors

**Category:** Typography / Anchors  

**Try:** Bold full operator words: Not, Stop, First, Less.  

**Mechanism:** Makes logical relation visible instantly.  

**Minimum experiment:** Operator-bold vs no bold.  

**Metrics:** Contrast recall; fixation latency  

**Source IDs:** S08; S09; S27; S28


## Source map

- **S01 — W3C captions / subtitles:** Captions are synchronized text for speech and needed non-speech audio; full captions are an accessibility layer.  
  https://www.w3.org/WAI/media/av/captions/

- **S02 — Section 508 caption guidance:** No more than two lines; around 45 characters per line; captions should not block important visual information.  
  https://www.section508.gov/create/captions-transcripts/

- **S03 — Netflix timed-text timing:** Subtitles should not be shorter than about 20 frames / 4/5 to 5/6 second; longer text needs longer exposure.  
  https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines

- **S04 — University of Melbourne captioning style guide:** Caption reading speed should not exceed about 180 wpm; two-line, natural-break captioning.  
  https://www.unimelb.edu.au/accessibility/video-captioning/style-guide

- **S05 — Sound-off subtitle viewing study:** Watching subtitled videos without sound increased cognitive load and reduced comprehension, immersion, and enjoyment.  
  https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0306251

- **S06 — Subtitle speed eye-tracking study:** Comprehension declined as subtitle speed increased; faster subtitles produced more incomplete reading.  
  https://www.cambridge.org/core/journals/applied-psycholinguistics/article/why-subtitle-speed-matters-evidence-from-word-skipping-and-rereading/A7DB0CBF5910353143738CF9C1721317

- **S07 — Partial and Synchronized Captioning:** Partial synchronized captions preserved comprehension with less than 30% of transcript in an L2 context.  
  https://www.cambridge.org/core/journals/recall/article/partial-and-synchronized-captioning-a-new-tool-to-assist-learners-in-developing-second-language-listening-skill/9394E3F0AD25FD5F32895F965F7ECCAD

- **S08 — Keyword caption highlighting:** Highlighted keyword captions were rated easier to read/follow with lower perceived task load by DHH participants.  
  https://dl.acm.org/doi/10.1145/3308561.3353781

- **S09 — Signaling meta-analysis:** Signaling/cueing improves retention and transfer and can reduce cognitive load in multimedia learning.  
  https://www.sciencedirect.com/science/article/abs/pii/S1747938X17300581

- **S10 — Redundancy in multimedia learning review:** Written text can help or hurt depending on whether it supports processing or overloads the visual channel.  
  https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1148035/full

- **S11 — Meaning maps and visual attention:** Meaning maps predicted gaze in real-world scenes beyond low-level salience.  
  https://www.nature.com/articles/s41598-018-31894-5

- **S12 — AIM 2024 video saliency / AViMoS:** Large-scale audio-visual mouse-saliency dataset includes vertical videos and >5000 observers.  
  https://arxiv.org/abs/2409.14827

- **S13 — Dynamic subtitles user experience:** Dynamic subtitles yielded gaze patterns closer to no-subtitle baseline than traditional subtitles in eye-tracking analysis.  
  https://dl.acm.org/doi/10.1145/2745197.2745204

- **S14 — Dynamic subtitle placement / ROI avoidance:** Proposes subtitle placement that avoids important regions to reduce unnecessary eye movements.  
  https://www.scitepress.org/papers/2017/62622/62622.pdf

- **S15 — Visual crowding review:** Peripheral recognition degrades when targets are surrounded by clutter; crowding limits reading/recognition.  
  https://www.annualreviews.org/content/journals/10.1146/annurev-vision-110423-024409

- **S16 — Perceptual span and reading speed:** Fast readers have a larger perceptual span; reading uses foveal/parafoveal information.  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3075059/

- **S17 — Visual working memory capacity:** Visual working memory is limited; many tasks are constrained by a small number of active representations.  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3405498/

- **S18 — Visible articulation and speech perception:** Seeing articulatory movement improves speech understanding, especially in noise.  
  https://academic.oup.com/cercor/article/17/5/1147/343892

- **S19 — Kinetic typography review:** Moving text can support learning when tied to logical flow, but excessive motion can create fatigue/overload.  
  https://www.nature.com/articles/s41599-023-01646-6

- **S20 — Caption Royale affective captions:** Affective captions use typographic modulation to convey emotion for DHH viewers.  
  https://dl.acm.org/doi/10.1145/3613904.3642258

- **S21 — TikTok subtitle style / non-standard typography:** TikTok-style subtitles with emojis/non-standard typography can affect engagement and preference.  
  https://avt.ils.uw.edu.pl/publications/

- **S22 — Bionic Reading negative evidence:** A 2024 study found no significant reading-time advantage for Bionic Reading vs normal text.  
  https://pubmed.ncbi.nlm.nih.gov/38723450/

- **S23 — Bionic Reading eye-tracking/usability:** No reliable speed/comprehension advantage and more saccades/longer reading in some bionic conditions.  
  https://journals.sagepub.com/doi/10.1177/21582440251376158

- **S24 — RSVP/Spritz speed-reading study:** Spritz/RSVP impaired literal comprehension and increased visual fatigue in a reading study.  
  https://www.sciencedirect.com/science/article/abs/pii/S0747563214007663

- **S25 — Short-form video scroll immersion:** Scroll immersion and short-form video use predicted attention difficulty, working-memory disruption, and fatigue.  
  https://www.sciencedirect.com/science/article/pii/S0001691825009874

- **S26 — Digital eye strain / smartphone vision:** Screen use reduces blink frequency and contributes to digital eye strain; mobile viewing adds physical constraints.  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12707383/

- **S27 — Rapid phrase-structure detection:** The brain can detect basic phrase structure rapidly in at-a-glance written language processing.  
  https://www.science.org/doi/10.1126/sciadv.adr9951

- **S28 — WCAG 2.2 contrast:** Text contrast and non-text contrast requirements inform accessible overlay readability.  
  https://www.w3.org/TR/WCAG22/

- **S29 — Temporal cueing and attention:** Temporal cues can help prioritize information at expected moments; timing affects audiovisual processing.  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12133840/

- **S30 — NASA-TLX in HCI caution:** NASA-TLX is widely used but should be interpreted carefully in HCI workload studies.  
  https://www.sciencedirect.com/science/article/pii/S1071581925000722

- **S31 — Foveated rendering / foveal-peripheral vision:** Foveated rendering exploits the falloff of peripheral acuity; detailed text should be foveal, cues can be peripheral.  
  https://www.sciencedirect.com/science/article/pii/S0097849321002211

- **S32 — Faces and gaze in dynamic scenes:** Faces and especially talking faces can strongly influence gaze in dynamic scenes.  
  https://jov.arvojournals.org/article.aspx?articleid=2243926

- **S33 — AR captioning for DHH learning:** Recent AR-caption work explores tailored real-time caption interfaces for DHH learners.  
  https://arxiv.org/html/2501.02233v1

- **S34 — Multimodal affective captions with haptics:** Affective captioning can combine visual cues and haptics to convey emotional speech cues.  
  https://saadh.info/papers/pataca-chi-25/pataca-chi25.pdf
