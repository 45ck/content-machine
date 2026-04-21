# Bipartite Account-Content Graphs

A bipartite graph preserves the distinction between actors and objects.

## Structure

`G = (A ∪ C, E)`

Where:

- `A` = accounts, pages, reviewers, creators, domains, apps, or affiliates.
- `C` = clips, URLs, products, apps, tracks, launches, reviews, hashtags, or claims.
- `E` = observed account-object actions.

## Use cases

### Clipping campaign

- Actor node: posting account.
- Content node: source clip or video hash.
- Edge: posted the clip.

### Fake reviews

- Actor node: reviewer.
- Content node: product.
- Edge: wrote a review.

### Product launch

- Actor node: voter/commenter.
- Content node: launch.
- Edge: upvoted/commented.

### Streaming fraud

- Actor node: listener account/device/account cluster.
- Content node: track.
- Edge: stream event.

## Metrics

- Actor degree: how many objects the actor touched.
- Content degree: how many actors touched the object.
- Weighted degree: how many actions were performed.
- Bipartite clustering: whether actors repeatedly share object neighborhoods.
- Projection density: how tightly actors overlap.

## Research value

Bipartite graphs avoid prematurely collapsing evidence. They let you inspect:

- which accounts pushed which objects
- whether the same accounts repeatedly appear together
- whether one campaign pushed many assets
- whether many campaigns share the same actor pool
