# Budget Attribution Feedback Model

## Purpose
Manufactured traction can corrupt business budgets, not only feeds.

Let each channel \(k\) receive budget \(B_{k,t}\). Future budget follows measured conversions:

\[
B_{k,t+1}=B_{total}\frac{\hat{C}_{k,t}}{\sum_j \hat{C}_{j,t}}
\]

If channel \(k\) receives fake or stolen conversions \(F_{k,t}\):

\[
\hat{C}_{k,t}=C_{k,t}+F_{k,t}
\]

Budget share is inflated:

\[
\tilde{B}_{k,t+1}>B_{k,t+1}
\]

## Interpretation
Fake leads, click flooding, affiliate hijacking, and postback fraud can redirect future budget by corrupting the measurement layer.
