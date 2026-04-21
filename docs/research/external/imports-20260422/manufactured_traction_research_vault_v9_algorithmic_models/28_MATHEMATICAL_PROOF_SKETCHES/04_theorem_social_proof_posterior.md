# Theorem: Social Proof Shifts User Posterior Beliefs

## Statement
Suppose a user estimates quality \(q\) from visible reviews. Let prior be \(q \sim Beta(\alpha,\beta)\), with positive reviews \(p\) and negative reviews \(n\). Posterior mean:

\[
\mathbb{E}[q|p,n]=\frac{\alpha+p}{\alpha+\beta+p+n}
\]

Add \(m\) fake positives:

\[
\mathbb{E}[q|p+m,n]=\frac{\alpha+p+m}{\alpha+\beta+p+n+m}
\]

For \(m>0\), this mean increases when the current posterior mean is below 1.

## Relevance
Fake positive reviews can move perceived quality above a purchase threshold.
