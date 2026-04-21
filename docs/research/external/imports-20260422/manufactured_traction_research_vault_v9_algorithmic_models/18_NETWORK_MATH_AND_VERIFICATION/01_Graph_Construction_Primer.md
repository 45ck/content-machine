# Graph Construction Primer

Manufactured traction becomes measurable when you convert events into a graph.

## Basic objects

Let:

- `A = {a_1, ..., a_n}` be a set of accounts or actors.
- `C = {c_1, ..., c_m}` be a set of content items, URLs, songs, products, apps, reviews, or posts.
- `E = {(a, c, t, x)}` be observed actions where account `a` acted on content `c` at time `t` with action type `x`.

Examples of action type `x`:

- posted same URL
- posted same clip
- used same hashtag sequence
- reviewed same product
- upvoted same launch
- streamed same track
- submitted same lead source
- shared same affiliate code

## Three graph forms

### 1. Actor-content bipartite graph

There are two node types:

- actors
- content objects

An edge exists when actor `a` performs an action on content `c`.

Use this when you want to preserve the relationship between accounts and content.

### 2. Actor projection graph

Actors are connected when they share a repeated behaviour.

Edge weight may be:

`w_ij = number of content items both account i and account j posted within a time window`

This is the most common coordination graph.

### 3. Content projection graph

Content items are connected when the same accounts repeatedly interact with them.

This helps detect campaigns where one group of actors pushes many related assets.

## Why graph construction matters

Bad construction creates false confidence. Always record:

- what counts as a node
- what counts as an edge
- what time window was used
- what threshold was used
- what behaviours were included
- whether edge weights are raw counts or normalized scores

## Safe interpretation

A graph can show coordination patterns. It does not automatically prove intent, illegality, or platform-rule violation. Treat the graph as evidence that requires context.
