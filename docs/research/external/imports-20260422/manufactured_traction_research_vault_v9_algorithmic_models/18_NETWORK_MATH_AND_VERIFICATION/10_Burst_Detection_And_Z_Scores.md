# Burst Detection and Z-Scores

Bursts show when actions concentrate unusually in time.

## Simple z-score

For counts per time bucket:

`z_t = (x_t - μ) / σ`

Where:

- `x_t` = count in time bucket `t`
- `μ` = mean count across comparable buckets
- `σ` = standard deviation across comparable buckets

High `z_t` means activity is unusually high compared with baseline.

## Burst ratio

`burst_ratio = max_bucket_count / total_count`

A high burst ratio indicates most activity occurred in one window.

## Inter-arrival times

Measure time between consecutive actions:

`gap_k = t_k - t_{k-1}`

Suspicious patterns can include:

- many near-zero gaps
- periodic posting
- simultaneous bursts across multiple accounts
- high-volume event windows without an external event

## Use cases

- Product Hunt launch-day vote bursts
- Reddit seeding waves
- fake review bursts
- paid clipping campaign pushes
- app-store review surges
- streaming bot sessions

## Caution

Real events also create bursts. A musician releasing a song, a sale, a major announcement, or a live stream can create legitimate synchronous behaviour.
