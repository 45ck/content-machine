# Theorem: Proxy Manipulation Changes Allocation

## Statement
Let allocation \(A=g(f(x))\), where \(x\) is a manipulable proxy vector. If there exists \(\delta\) such that:

\[
g(f(x+\delta)) \ne g(f(x))
\]

then manipulation of \(x\) changes allocation.

## Stronger monotone version
If \(f\) is monotone increasing in coordinate \(x_k\), and \(g\) preserves order, then any sufficiently large positive \(\delta_k\) changes rank or allocation whenever a boundary exists above the original score.

## Proof sketch
If \(f\) is increasing in \(x_k\), then \(f(x+\delta_k e_k)>f(x)\). If allocation is rank-based or threshold-based, a finite score gap exists to the next boundary. Choose \(\delta_k\) such that the score increase exceeds that gap. Allocation changes.

## Relevance
This is the mathematical core of manufactured traction.
