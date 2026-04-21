# 18 Network Math and Verification

This folder translates the manufactured-traction thesis into measurable structures.

The safe research question is:

> Given public or authorized data, can we show that a visible traction signal is more consistent with independent organic behaviour or with repeated coordination, synthetic signalling, or distorted attribution?

This is not an execution guide. It is a defensive research and verification framework.

## Core idea

A campaign becomes measurable when actors, content, actions, and time can be represented as a graph or time series.

The common representation:

- **Node**: account, page, creator, app, review author, domain, song, campaign, or lead source.
- **Edge**: shared content, shared URL, near-synchronous action, similar caption, co-review behaviour, shared payment/affiliate attribution, or repeated content reuse.
- **Weight**: number of repeated shared actions, similarity score, co-occurrence count, or attribution frequency.
- **Time**: timestamp of posting, review creation, install event, lead submission, stream event, launch activity, or account creation.

## Main verification claims

A researcher rarely proves intent from network maths alone. The stronger claim is usually:

1. **The observed pattern is unlikely under independent behaviour.**
2. **The accounts/actions are unusually synchronized or similar.**
3. **The same actors repeatedly co-participate in the same signal creation.**
4. **The network structure is denser, more centralized, or more modular than expected.**
5. **The visible traction signal therefore deserves lower trust unless context or disclosure explains the coordination.**

## Folder contents

- `01_...` to `20_...` explain the maths.
- `19_SYNTHETIC_NETWORK_DEMO/` provides safe synthetic data and runnable code.
- `20_VERIFICATION_PLAYBOOKS/` applies the maths by domain.
- `21_MATH_APPENDICES/` has copy-ready formulas and worked examples.
- `22_DATA_COLLECTION_TEMPLATES/` provides schemas for public/authorized data.
