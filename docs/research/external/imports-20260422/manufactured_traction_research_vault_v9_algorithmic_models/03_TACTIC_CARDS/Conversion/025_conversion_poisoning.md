# 025. Conversion poisoning

> **Use boundary:** This file is written for research, ethics, detection, and policy analysis. It describes mechanisms at a conceptual level so they can be studied, criticised, or detected. It is not an execution guide for manipulating platforms, audiences, investors, advertisers, or creators.


## Signal layer

**Conversion**

## Primary domain

Ad platforms / optimization algorithms

## What the tactic tries to make outsiders believe

The platform is learning what valuable users look like.

## Conceptual methodology

Low-quality or fake conversion events are fed back into optimization systems, causing the algorithm to seek more of the wrong traffic.

This is not a technical recipe. The research value is in understanding which proxy signal is being distorted and what kind of false inference the audience, platform, advertiser, or investor may draw.

## Signal corrupted

The tactic corrupts evidence that would normally help outsiders estimate real demand, trust, relevance, influence, or causality.

## Ethical problem

The tactic becomes ethically problematic when it hides material context, fabricates or inflates evidence, misattributes causality, or causes outsiders to reward an appearance of demand that does not match the underlying reality.

## Research red flags

Campaign improves CPL while sales fall; identical lead fields; traffic quality deteriorates after optimization.

## Safer ethical alternative

Use transparent paid promotion, clear disclosure, honest metrics, auditable attribution, and real customer evidence. Improve the underlying value rather than falsifying the evidence of value.

## Evidence strength

Depends on the domain. Treat platform policies and enforcement actions as strong evidence for rules; treat community chatter as weak evidence for operator culture only.

## Source notes

- **Google 2025 Ads Safety Report** (Platform transparency / primary). Google said Gemini-powered tools stopped over 99% of policy-violating ads before they ran in 2025; blocked/removed over 8.3B ads and suspended 24.9M accounts, including 602M scam ads and 4M scam-associated accounts. URL: https://blog.google/products/ads-commerce/2025-ads-safety-report/
- **AppsFlyer validation rules to prevent fraud** (Industry documentation / primary). Rules can block installs and in-app event attributions for hijacked installs, bots, emulators, device farms and fake installs/events. URL: https://support.appsflyer.com/hc/en-us/articles/115004703926-Implement-validation-rules-to-prevent-fraud
