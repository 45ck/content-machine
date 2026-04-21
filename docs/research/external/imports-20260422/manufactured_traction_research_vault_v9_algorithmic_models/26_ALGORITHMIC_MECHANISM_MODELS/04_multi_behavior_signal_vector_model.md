# Multi-Behavior Signal Vector Model

## Public model basis
Modern recommender systems increasingly use multiple behaviour types: clicks, likes, comments, saves, purchases, ratings, watch time, skips, follows, and repeat interactions.

## Model
Represent behaviour as a vector:

\[
\mathbf{b}_{u,i,t} = [\text{impression}, \text{click}, \text{watch}, \text{like}, \text{comment}, \text{share}, \text{save}, \text{follow}, \text{purchase}]
\]

The platform estimates expected utility:

\[
\hat{y}_{u,i,t} = F(u, i, \mathbf{b}_{u,i,1:t}, \text{content}, \text{context})
\]

## Manipulation implication
Manipulators do not need to fake one metric. They can distort a bundle:

\[
\delta = [\delta_{view}, \delta_{like}, \delta_{comment}, \delta_{share}, \delta_{save}]
\]

The weighted effect is:

\[
\Delta S = \sum_k w_k \delta_k
\]

## Detection implication
A single metric spike is weaker evidence than a **cross-signal inconsistency**:

- high views but low watch completion;
- high likes but generic comments;
- high installs but low retention;
- high reviews but weak real usage;
- high upvotes but thin discussion.
