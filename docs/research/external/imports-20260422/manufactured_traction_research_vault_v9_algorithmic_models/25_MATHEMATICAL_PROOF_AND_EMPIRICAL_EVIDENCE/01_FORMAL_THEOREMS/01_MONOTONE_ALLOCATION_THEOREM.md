# The Monotone Allocation Theorem

## Claim

If a platform allocates exposure, rank, money, or legitimacy using a score that increases with a proxy signal, then artificial movement in that proxy can change allocation whenever it crosses a decision boundary.

## Setup

Let item `i` have score:

```text
S_i = Q_i + wE_i
```

Where `Q_i` is latent quality or baseline relevance, `E_i` is engagement/reviews/votes/installs/streams/social proof, and `w > 0` is the weight placed on the proxy.

If artificial signal `δ` is added:

```text
S'_i = Q_i + w(E_i + δ) = S_i + wδ
```

Item `i` overtakes competitor `j` when:

```text
δ > (S_j - Q_i - wE_i) / w
```

## Result

Any system with a positive proxy weight can be moved by sufficient artificial proxy movement.

## Interpretation

This covers fake engagement, fake reviews, launch votes, stream counts, app installs, and metric inflation. It does not claim a specific platform uses this exact formula; it proves the general decision-boundary mechanism.
