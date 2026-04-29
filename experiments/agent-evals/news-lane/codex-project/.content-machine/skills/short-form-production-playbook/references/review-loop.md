# Review Loop

Bad automation usually fails because it treats file creation as success.
This pack should fail on bad edits, then choose the right regeneration
path.

## Review In This Order

1. Hook effectiveness
2. Caption readability and timing feel
3. Visual clarity and shot variety
4. Audio intelligibility and music balance
5. Technical validity

If the first three are weak, technical success does not matter.

## Reject Triggers

- Hook takes too long to become clear.
- Captions are technically synced but feel late, noisy, or cramped.
- Source footage contains conflicting burned-in text.
- Visual beats repeat without adding information.
- Freeze, duplicate-frame drift, or dead air makes the short feel cheap.
- The ending has no payoff or no clean stop.

## Regeneration Map

- Weak hook:
  rewrite the opening line, hook overlay, or first visual beat.
- Good script, weak visuals:
  rebuild the visual plan before touching captions.
- Good visuals, weak readability:
  change caption family, chunking, or placement.
- Technically valid but boring:
  tighten scene changes, increase contrast between beats, or cut
  duration.
- Good edit, bad source footage:
  replace the footage. Do not excuse it in review.

## Self-Validation Questions

- Would a viewer understand the promise with sound off?
- Does the frame still read on a phone at arm's length?
- Is there a reason to keep watching after the first line?
- Is any visual beat filler?
- If this failed, do you know whether to rewrite, rescore, rerender, or
  replace footage?

## How To Use Repo Skills

- Use `generate-short` for the main run.
- Use `video-render` when the main issue is final composition.
- Use `publish-prep-review` as a gate, not as a report generator.
- If the review says fail, do not present the video as complete.

## Aggregated From

- `mutonby/openshorts`
- `DojoCodingLabs/remotion-superpowers`
- `AgriciDaniel/claude-shorts`
- this repo's `publish-prep-review`, validation stack, and scoring
  modules
