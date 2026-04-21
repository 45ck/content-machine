# Theorem: Early Popularity Seeds Change Future Allocation

## Statement
If future exposure probability is proportional to current popularity:

\[
P_i=\frac{k_i+\eta_i}{\sum_j(k_j+\eta_j)}
\]

then adding seed \(m\) to item \(i\) increases future exposure probability by:

\[
\Delta P_i=\frac{k_i+\eta_i+m}{K+m}-\frac{k_i+\eta_i}{K}
\]

where \(K=\sum_j(k_j+\eta_j)\).

For \(m>0\) and \(k_i+\eta_i<K\), \(\Delta P_i>0\).

## Relevance
This formalizes the popularity-bias pathway.
