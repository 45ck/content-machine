# Creator Feed Test-Batch Model

## Purpose
Short-form feeds often appear to test content on a limited audience before wider distribution. This model explains that logic without asserting a private algorithm.

## Model
An item first receives a test exposure \(E_0\). Observed reward:

\[
\hat{r}_0 = \frac{engagements}{E_0}
\]

Expansion rule:

\[
E_{1} =
\begin{cases}
mE_0 & \text{if } \hat{r}_0 \ge T \\
dE_0 & \text{if } \hat{r}_0 < T
\end{cases}
\]

where \(m>1\) and \(0<d<1\).

## Manufactured traction logic
Artificial early engagements can shift \(\hat{r}_0\) above \(T\). The biggest vulnerability is when \(E_0\) is small and the estimate has high variance.

## Countermeasure
Use trust-weighted engagement, anomaly filters, and delayed expansion until signals are stable.
