# Feedback Loop State-Space Model

## Purpose
This explains how early artificial boosts can compound.

Let exposure \(E_t\), engagement \(G_t\), and score \(S_t\) evolve as:

\[
G_t = \alpha E_t q + \epsilon_t + M_t
\]

\[
S_{t+1} = \rho S_t + \beta G_t - \lambda D_t
\]

\[
E_{t+1} = \phi(S_{t+1})
\]

where \(q\) is quality/fit, \(M_t\) is manufactured engagement, \(D_t\) is detection/dampening, and \(\phi\) maps score to future exposure.

## Linear approximation
Near a local operating point:

\[
E_{t+1} \approx a E_t + b M_t + c
\]

If \(0<a<1\), a one-period artificial boost has total exposure effect:

\[
\Delta E_{total} = b M_0 (1 + a + a^2 + \dots) = \frac{bM_0}{1-a}
\]

## Interpretation
When feedback is strong, a small seed can have a large multiplier. When platforms dampen suspicious signals, \(a\) and \(b\) shrink.
