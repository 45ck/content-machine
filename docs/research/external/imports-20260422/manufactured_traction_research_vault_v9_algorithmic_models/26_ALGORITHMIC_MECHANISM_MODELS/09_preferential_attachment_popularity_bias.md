# Preferential Attachment and Popularity Bias Model

## Purpose
This model captures “the rich get richer.”

Let item \(i\) receive new exposure with probability:

\[
P(i) = \frac{\eta_i + k_i}{\sum_j (\eta_j + k_j)}
\]

where \(\eta_i\) is baseline attractiveness and \(k_i\) is current popularity.

If manufactured traction increases \(k_i\) by \(m\), the future exposure probability becomes:

\[
\tilde{P}(i) = \frac{\eta_i + k_i + m}{\sum_j (\eta_j + k_j)+m}
\]

## Interpretation
The artificial seed changes not only the current metric but also the probability of receiving the next metric.

## Link to popularity bias
Popularity-bias research shows recommender systems can over-represent popular items, reducing long-tail exposure. Manufactured traction exploits that structural tendency.
