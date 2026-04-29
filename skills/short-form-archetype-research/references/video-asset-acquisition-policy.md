# Video Asset Acquisition Policy

Date: 2026-04-29

## Rule

Links are research references. Files are production assets only after source,
license, consent, and allowed use are recorded.

## Source Classes

| Source class                            | Can store metadata? | Can download for analysis?          | Can use in rendered output?                           |
| --------------------------------------- | ------------------- | ----------------------------------- | ----------------------------------------------------- |
| User-supplied media                     | Yes                 | Yes                                 | Yes, within user permission                           |
| Public domain or explicit reuse license | Yes                 | Yes                                 | Yes, with attribution when required                   |
| Stock provider asset                    | Yes                 | Yes                                 | Yes, within provider license                          |
| Generated asset                         | Yes                 | Yes                                 | Yes, with generation prompt/model metadata            |
| YouTube/TikTok/Reels public video       | Yes                 | Only for documented research review | No, unless separately licensed or supplied            |
| Vendor repo screenshot/demo             | Yes                 | Yes as evidence                     | No, unless license allows and attribution is recorded |

## Required Ledger Fields

Every production asset should have:

- `asset_id`
- `source_kind`
- `source_url` or local origin
- `license`
- `rights_notes`
- `creator_or_owner`
- `allowed_uses`
- `archetype`
- `used_in_stage`
- `copied_to`
- `review_status`

## Rejection Conditions

Reject or reroute the run if:

- a video segment came from YouTube/TikTok/Reels without permission
- the plan depends on mirroring, speed-shifting, color-shifting, or cropping
  to evade copyright detection
- a user asks to imitate a specific creator's voice, face, thumbnail, or
  script too closely
- gameplay, background loops, or product screenshots have unknown origin
- the output cannot cite where each external asset came from

## Safe Alternatives

- Use user-supplied footage.
- Use stock footage with license recorded in the ledger.
- Generate original background loops, abstract motion, diagrams, or product
  mockups.
- Build code-native Remotion scenes for motion graphics.
- Use public videos only as structural references.
