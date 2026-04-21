# 029. SDK spoofing and event spoofing

> **Use boundary:** This file is written for research, ethics, detection, and policy analysis. It describes mechanisms at a conceptual level so they can be studied, criticised, or detected. It is not an execution guide for manipulating platforms, audiences, investors, advertisers, or creators.


## Signal layer

**Attribution / Conversion**

## Primary domain

Mobile measurement

## What the tactic tries to make outsiders believe

An app generated install or in-app-event data.

## Conceptual methodology

Fake requests imitate legitimate app telemetry, producing installs or events that never occurred in a real user journey.

This is not a technical recipe. The research value is in understanding which proxy signal is being distorted and what kind of false inference the audience, platform, advertiser, or investor may draw.

## Signal corrupted

The tactic corrupts evidence that would normally help outsiders estimate real demand, trust, relevance, influence, or causality.

## Ethical problem

The tactic becomes ethically problematic when it hides material context, fabricates or inflates evidence, misattributes causality, or causes outsiders to reward an appearance of demand that does not match the underlying reality.

## Research red flags

App-store numbers differ from MMP data; engagement without device reality; inconsistent SDK versions.

## Safer ethical alternative

Use transparent paid promotion, clear disclosure, honest metrics, auditable attribution, and real customer evidence. Improve the underlying value rather than falsifying the evidence of value.

## Evidence strength

Depends on the domain. Treat platform policies and enforcement actions as strong evidence for rules; treat community chatter as weak evidence for operator culture only.

## Source notes

- **AppsFlyer validation rules to prevent fraud** (Industry documentation / primary). Rules can block installs and in-app event attributions for hijacked installs, bots, emulators, device farms and fake installs/events. URL: https://support.appsflyer.com/hc/en-us/articles/115004703926-Implement-validation-rules-to-prevent-fraud
