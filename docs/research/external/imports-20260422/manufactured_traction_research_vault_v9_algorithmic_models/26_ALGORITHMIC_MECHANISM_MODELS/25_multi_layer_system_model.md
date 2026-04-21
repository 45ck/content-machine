# Multilayer System Model

## Purpose
Manufactured traction often crosses platforms: TikTok clips lead to Reddit discussion, YouTube shorts, press coverage, Google search interest, and investor claims.

## Model
Represent each platform as a layer \(L_k\), with state vector \(x^{(k)}_t\).

Cross-platform transfer:

\[
x^{(k)}_{t+1} = A_k x^{(k)}_t + \sum_{\ell \ne k} B_{\ell \to k} x^{(\ell)}_t + m^{(k)}_t
\]

where \(m^{(k)}_t\) is manufactured input on platform \(k\).

## Interpretation
A campaign can seed one layer to create evidence for another. This is narrative laundering.

## Example
Short-form clips create apparent trend; journalists cite visible buzz; startup deck cites press; investors infer momentum.
