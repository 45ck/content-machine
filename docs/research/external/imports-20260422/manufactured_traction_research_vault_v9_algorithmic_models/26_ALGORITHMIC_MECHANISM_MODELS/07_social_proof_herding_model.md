# Social Proof and Herding Model

## Purpose
Users do not only respond to content. They respond to visible evidence that others responded.

## Model
Let a user choose item \(i\) with probability:

\[
P(choose\ i) = \sigma(\alpha q_i + \beta \log(1 + V_i) + \gamma R_i)
\]

where \(q_i\) is intrinsic quality, \(V_i\) visible popularity, and \(R_i\) reviews/ratings.

If manufactured traction raises visible popularity by \(m\):

\[
\Delta P = \sigma(\alpha q_i + \beta \log(1+V_i+m)+\gamma R_i) - \sigma(\alpha q_i + \beta \log(1+V_i)+\gamma R_i)
\]

## Empirical backing
Muchnik, Aral & Taylor found that artificial positive social influence increased the likelihood of later positive ratings by 32% and final ratings by 25% on average.

## Interpretation
Fake proof can recruit real proof.
