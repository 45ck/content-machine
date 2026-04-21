# Multilayer Coordination Model

Manufactured traction often appears across layers:

| Layer | Example edge |
|---|---|
| co-post | accounts post in the same short window |
| co-link | accounts share the same URL |
| co-media | accounts reuse the same clip/image/audio |
| co-caption | captions are identical or highly similar |
| co-hashtag | hashtag sequences overlap unusually |
| co-reply | accounts reply to the same post repeatedly |
| co-review | accounts review the same product/location/app in a burst |

Weighted multiplex score:

```text
Score_uv = Σ_l α_l * z_uv,l
```

Evidence strengthens when the same actor cluster appears across timing, content, object, and disclosure layers.
