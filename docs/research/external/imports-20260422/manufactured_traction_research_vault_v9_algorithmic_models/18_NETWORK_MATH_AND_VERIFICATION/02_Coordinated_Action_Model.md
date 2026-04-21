# Coordinated Action Model

A practical coordination model:

> Two actors are linked if they perform the same or highly similar action within a short time window, repeatedly.

This follows the logic used in coordination-research work: one coincidence can happen by chance; repeated near-synchronous coincidences are more suspicious.

## Definition

For actors `i` and `j`, content item `c`, and time window `Δ`:

`I_ijc = 1` if both actors acted on `c` and `|t_ic - t_jc| ≤ Δ`

Then the coordination weight is:

`w_ij = Σ_c I_ijc`

If `w_ij ≥ r`, create an edge between `i` and `j`.

Where:

- `Δ` = time window, such as 60s, 120s, 10 min, or launch-day window.
- `r` = minimum repeated co-actions.
- `w_ij` = repeated coordination count.

## Why repetition matters

One pair of accounts sharing the same link once can be normal. The research signal strengthens when the pair repeatedly shares the same items within tight time windows.

## Threshold choice

Use multiple thresholds:

- `Δ = 60s`: strong synchronization.
- `Δ = 5 min`: likely planned or automated in fast-moving feeds.
- `Δ = 1 hr`: useful for Reddit launch waves, Product Hunt, or review bursts.
- `r = 2`: exploratory.
- `r = 4+`: stronger evidence.
- `r = top 1% of edge weights`: conservative evidence.

## Output

The output is a weighted graph where dense clusters indicate actors that repeatedly move together.

## Limitations

High coordination can be benign:

- fans live-posting a major event
- journalists posting breaking news
- developers launching a real product
- employees amplifying a company announcement with disclosure

Use context, disclosure, and content analysis before making claims.
