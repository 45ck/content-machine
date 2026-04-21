# Coordination Metrics

## Pairwise repeated co-action
For accounts `a` and `b`:

\[
w_{ab}=\sum_o I(|t_{ao}-t_{bo}|\le \tau)
\]

where `o` is a shared object such as URL, hashtag, post, product, song, or app.

## Jaccard similarity
\[
J(A,B)=\frac{|A\cap B|}{|A\cup B|}
\]

Use for shared URLs, hashtags, captions, target accounts, or reviewed products.

## Cosine similarity
\[
cos(x,y)=\frac{x\cdot y}{||x||||y||}
\]

Use for text embeddings, bag-of-words captions, or engagement vectors.

## Burst z-score
\[
z_t=\frac{x_t-\mu}{\sigma}
\]

where `x_t` is activity in window `t`, and `\mu,\sigma` are baseline mean and standard deviation.

## Entropy of actor distribution
\[
H=-\sum_i p_i \log p_i
\]

Low entropy means activity is concentrated in few actors. High entropy means activity is more distributed. Sudden low-entropy bursts may indicate campaign control.

## Modularity
High modularity in a coordination graph suggests clusters of accounts acting together more than with the rest of the network.

## Null model
Shuffle timestamps, targets, or actor labels while preserving activity volume. Compare observed metrics to null distribution.
