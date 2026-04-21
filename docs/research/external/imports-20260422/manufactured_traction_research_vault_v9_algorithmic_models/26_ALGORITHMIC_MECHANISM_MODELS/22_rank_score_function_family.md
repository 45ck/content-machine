# Rank Score Function Families

## Purpose
This file gives a family of plausible ranking-score functions. It is not a claim about exact private algorithms.

## Linear proxy score

\[
S_i = \theta_0 + \theta_v v_i + \theta_w w_i + \theta_l l_i + \theta_c c_i + \theta_s s_i + \theta_a a_i - \theta_r risk_i
\]

## Log-transformed score

\[
S_i = \theta^T \log(1+x_i)
\]

This captures diminishing returns: the first thousand views may matter more than the next thousand.

## Velocity-sensitive score

\[
S_i = \theta^T x_i + \gamma \frac{dx_i}{dt}
\]

This captures “momentum.”

## Personalized score

\[
S_{u,i} = p_u^T e_i + \theta^T x_i + \eta^T z_{u,i}
\]

where \(p_u\) is the user vector and \(e_i\) is the item vector.

## Safety-dampened score

\[
S_{u,i} = relevance_{u,i}+engagement_{i}-risk_i-qualityPenalty_i
\]

## Why it matters
Manufactured traction can target any observable term if platforms do not discount manipulation.
