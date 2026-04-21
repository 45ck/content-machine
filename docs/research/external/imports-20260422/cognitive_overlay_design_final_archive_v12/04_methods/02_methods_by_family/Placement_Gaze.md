# Placement / Gaze

| Method Code | Short Code | Canonical Name | Definition / What to try | Mechanism | Minimum Viable Experiment | Primary Metrics |
| --- | --- | --- | --- | --- | --- | --- |
| GAZ-001 | MSC | Mouth-Safe Captioning | Never cover the mouth during speech-heavy clips. | Protects audiovisual speech cues. | Mouth-covered vs mouth-safe overlay. | Comprehension; face dwell |
| GAZ-002 | ESC | Eye-Safe Captioning | Avoid covering eyes in emotional/storytelling clips. | Protects social/emotional information. | Eye-covered vs eye-safe. | Emotion recognition; completion |
| GAZ-003 | ASC | Action-Safe Captioning | Avoid hands, products, joints, cursor, and key action path. | Prevents text from stealing task-critical visual information. | Action-covered vs action-safe. | Visual recall; task accuracy |
| GAZ-004 | ONL | Object-Near Labels | Place short labels next to the relevant object instead of bottom captions. | Reduces split attention and search. | Bottom caption vs object-near labels. | Task recall; gaze travel |
| GAZ-005 | USZT | UI-Safe Zone Templates | Define TikTok/Reels/Shorts danger zones and avoid them. | Prevents platform interface collision. | Bottom-fixed vs UI-safe placement. | Readability; occlusion rate |
| GAZ-006 | SAP | Saliency-Avoiding Placement | Place text away from predicted high-saliency regions unless it is a label. | Reduces competition with visual content. | Fixed vs saliency-aware placement. | Visual recall; gaze distribution |
| GAZ-007 | MMP | Meaning-Map Placement | Place text where it supports the semantic region of the scene. | Combines semantic value with gaze tendencies. | Meaning-aware vs low-level saliency placement. | Gist recall; gaze alignment |
| GAZ-008 | CAC | Crowding-Aware Captioning | Avoid placing text near other text, UI, or high-frequency background. | Reduces peripheral clutter interference. | Crowded vs uncrowded placement. | Readability; effort |
| GAZ-009 | NSC | Negative-Space Captions | Use empty background regions for semantic overlays. | Increases contrast and reduces interference. | Negative space vs default bottom. | Readability; visual recall |
| GAZ-010 | SZTH | Shoulder-Zone Talking Head Overlay | Place captions near upper chest/shoulder, away from mouth/eyes/UI. | Balances face access and text proximity. | Shoulder-zone vs lower-third. | Comprehension; mouth visibility |
| GAZ-011 | SRTL | Screen-Recording Target Labels | Place labels near the cursor/control being discussed. | Reduces split attention in UI tutorials. | Bottom captions vs target labels. | Task accuracy; gaze path |
| GAZ-012 | PHC | Product Halo Captions | Place short labels in a ring around product without covering it. | Keeps product visible while explaining attributes. | Halo labels vs caption block. | Attribute recall; visual recall |
| GAZ-013 | FAP | Foveal Anchor + Peripheral Cue | Put readable text centrally; use peripheral arrows/icons for orientation. | Matches foveal/peripheral strengths. | Text-only vs text+peripheral cue. | Gist recall; gaze travel |
| GAZ-014 | DRAR | Dynamic Reflow Around ROI | Move captions frame-by-frame around faces/hands/products. | Avoids visual obstruction dynamically. | Static safe zone vs dynamic reflow. | Visual recall; distraction |
| GAZ-015 | STAP | Shot-Type-Aware Placement | Use different placement rules for talking head, demo, screen recording, story. | Matches visual task demands. | Generic vs shot-aware placement. | Comprehension by category |
| GAZ-016 | SFC | Speaker-Following Captions | Move text near active speaker in multi-speaker clips. | Reduces speaker identification cost. | Bottom captions vs speaker-following. | Speaker recall; user preference |
| GAZ-017 | ELT | Eye-Line Triangle Rule | Place overlay within triangle between speaker’s eyes, hands/object, and center. | Reduces gaze travel. | Triangle placement vs arbitrary. | Saccade distance; effort |
| GAZ-018 | PCR | Platform Crop Repositioning | Automatically reposition overlays for TikTok, Reels, Shorts, YouTube preview. | Prevents cross-platform occlusion. | Single export vs platform-specific exports. | Occlusion rate; retention by platform |
| GAZ-019 | CCD | Caption Collision Detector | Detect overlap with native captions, stickers, captions, and UI. | Prevents clutter stacking. | Manual vs auto collision check. | Collision count; readability |
| GAZ-020 | GRW | Gaze Return Windows | After text appears, reserve moments where nothing blocks the face/object. | Lets gaze return to visual information. | No-return vs return-window design. | Visual recall; gaze dwell |
