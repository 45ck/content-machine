# Style Recipes

## Default Ladder

- Start with `capcut`.
- Move to `tiktok` when you want stronger native-social energy.
- Move to `youtube` when education and reading comfort matter more than
  aggression.
- Move to `hormozi` when the video is built around claims, numbers, and
  punch phrases.
- Move to `karaoke` when exact spoken rhythm is the experience.

## What Each Style Is Doing

### `capcut`

- Feel: kinetic, creator-native, modern.
- Best for: product explainers, creator commentary, general short-form.
- Why it works: short chunks, strong stroke, uppercase, emphasis on
  power words.
- Main risks: too loud for calm material, too much uppercase on dense
  educational lines.

### `tiktok`

- Feel: unmistakably native and high-contrast.
- Best for: hooks, listicles, direct-to-camera, social-native content.
- Why it works: active word gets a pill, the eye knows exactly where to
  look.
- Main risks: pill backgrounds can get heavy on already-busy footage.

### `youtube`

- Feel: clean and informative.
- Best for: educational explainers, tool walkthroughs, technical
  commentary.
- Why it works: easier reading rhythm, less visual noise, strong stroke.
- Main risks: can feel too polite if the script is aggressive.

### `reels`

- Feel: lifestyle, polished, more aesthetic.
- Best for: design, travel, softer brand content, montage-led shorts.
- Why it works: vibrant highlight color and gentler motion.
- Main risks: if the script is blunt or technical, it can feel mismatched.

### `hormozi`

- Feel: high-pressure impact statements.
- Best for: numbers, claims, outcomes, marketing hooks.
- Why it works: centered layout plus very short phrase groups force the
  viewer onto the money words.
- Main risks: exhausting over a full video; use for sections, not
  necessarily the whole run.

### `karaoke`

- Feel: rhythm-first and sync-first.
- Best for: lyric feel, speech cadence, exact timing moments.
- Why it works: each word gets its moment instead of just the current
  page.
- Main risks: can feel slow or overly cute in hard-information videos.

### `minimal`

- Feel: restrained, corporate, tidy.
- Best for: business narration, product demos where UI should dominate.
- Why it works: low visual intrusion.
- Main risks: can under-sell a strong hook.

## Layout Heuristics

- Use one line only when the line is genuinely short and punchy.
- Use two lines for most narration-led shorts.
- Keep `maxCharsPerSecond` conservative for educational content.
- Lower `maxGapMs` when you want more rhythmic resets.
- Raise `minOnScreenMs` when the script is dense or the visuals move a
  lot.
- Lower `maxWordsPerPage` before lowering font size. Smaller text is
  usually the wrong fix.

## Emphasis Heuristics

- Emphasize numbers.
- Emphasize contrast words like `not`, `never`, `without`, `instead`.
- Emphasize payoff nouns and verbs.
- Do not emphasize filler, articles, or generic transition words.
- If everything is highlighted, reduce both highlight usage and
  animation intensity.

## Visual Hygiene

- Heavy stroke plus heavy blur usually looks cheap. Pick one strong
  support mechanism and one lighter one.
- Bright highlight colors need enough neutral text around them.
- Bottom captions need extra care when list badges or UI overlays are
  present.
- Center captions require cleaner backgrounds than bottom captions.

## External Patterns We Already Reuse

- `gyoridavid/short-video-maker` influenced the grouped caption paging
  approach and the short-form reading rhythm.
- `ShortGPT` is a useful reminder that captions are part of the editing
  system, not a separate afterthought.
- `m1guelpf/auto-subtitle` is the minimal baseline: ASR plus overlay is
  table stakes, not the finish line.
