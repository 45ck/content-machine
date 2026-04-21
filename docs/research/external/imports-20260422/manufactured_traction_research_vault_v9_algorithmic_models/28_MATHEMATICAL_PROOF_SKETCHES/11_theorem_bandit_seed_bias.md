# Theorem: Early Fake Success Biases Exploration

## Statement
In a bandit system using posterior sampling or an optimism term, early artificial success increases either the posterior mean or upper confidence bound of an item, increasing its probability of being selected for future trials.

For a Beta-Bernoulli posterior:

\[
\mu = \frac{\alpha+s}{\alpha+\beta+s+f}
\]

After \(m\) fake successes:

\[
\tilde{\mu} = \frac{\alpha+s+m}{\alpha+\beta+s+f+m}
\]

If \(\mu<1\), then \(\tilde{\mu}>\mu\).

## Relevance
This explains why early seeding matters most during uncertainty.
