# Velocity and Burst Detection Model

## Purpose
Many systems care about momentum, not just totals.

Define velocity:

\[
v_t = \frac{x_t - x_{t-\Delta}}{\Delta}
\]

Define burst z-score:

\[
z_t = \frac{v_t - \mu_v}{\sigma_v}
\]

where \(\mu_v\) and \(\sigma_v\) are estimated from a baseline period or comparable items.

## Manipulation model
A coordinated burst adds \(m_t\) during a narrow window:

\[
\tilde{v}_t = v_t + \frac{m_t}{\Delta}
\]

## Detection interpretation
A burst is not proof of manipulation. It becomes stronger evidence when timing, account history, content similarity, and disclosure failures converge.
