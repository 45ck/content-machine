# Master Proxy Allocation Model

## Purpose
This is the master model for manufactured traction.

Digital markets often allocate attention, trust, money, or legitimacy using a proxy vector:

\[
\mathbf{x}_{i,t} = [v_{i,t}, l_{i,t}, c_{i,t}, s_{i,t}, r_{i,t}, q_{i,t}, a_{i,t}, \dots]
\]

where an item \(i\) at time \(t\) may have views \(v\), likes \(l\), comments \(c\), saves \(s\), reviews \(r\), quality estimate \(q\), account authority \(a\), and other observed signals.

The platform or audience computes an allocation score:

\[
S_{i,t} = f(\mathbf{x}_{i,t}, \mathbf{u}, \mathbf{z}_{i,t})
\]

where \(\mathbf{u}\) represents user context and \(\mathbf{z}\) content/account metadata.

Allocation is then:

\[
A_{i,t} = g(S_{i,t})
\]

Examples: feed rank, recommendation probability, search position, app chart position, ad budget, investor attention, or perceived legitimacy.

## Manipulation model
A campaign introduces an artificial signal vector \(\delta_{i,t}\):

\[
\tilde{\mathbf{x}}_{i,t} = \mathbf{x}_{i,t} + \delta_{i,t}
\]

Manufactured traction works when:

\[
g(f(\mathbf{x}_{i,t} + \delta_{i,t})) > g(f(\mathbf{x}_{i,t}))
\]

and the gain is large enough to cross a decision boundary.

## What this proves
This does not prove that every manipulation attempt succeeds. It proves that any allocation system using manipulable proxies is vulnerable in principle unless it has robust filtering, disclosure, anomaly detection, or causal correction.

## Paper-ready line
Manufactured traction is proxy corruption: it alters the evidence layer used by people and algorithms to infer demand.
