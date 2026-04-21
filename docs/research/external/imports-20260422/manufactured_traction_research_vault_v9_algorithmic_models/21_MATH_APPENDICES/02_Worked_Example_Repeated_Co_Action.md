# Worked Example: Repeated Co-Action

Suppose accounts A, B, and C post the same campaign clips.

| Content | A time | B time | C time |
|---|---:|---:|---:|
| clip_1 | 10:00:00 | 10:00:30 | 12:00:00 |
| clip_2 | 11:00:00 | 11:00:45 | 11:01:10 |
| clip_3 | 12:00:00 | 12:00:50 | — |

With `Δ = 60s`:

- A-B co-act on clip_1, clip_2, clip_3 → `w_AB = 3`
- A-C co-act on clip_2 only? A 11:00:00, C 11:01:10 = 70s, so no if `Δ=60s` → `w_AC = 0`
- B-C co-act on clip_2: 25s → `w_BC = 1`

If threshold is `r >= 2`, only A-B receives an edge.

## Lesson

Repeated tight timing between the same pair is stronger than one-time coincidence.
