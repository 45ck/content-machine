# Attribution Anomaly Checklist

> **Use boundary:** This file is written for research, ethics, detection, and policy analysis. It describes mechanisms at a conceptual level so they can be studied, criticised, or detected. It is not an execution guide for manipulating platforms, audiences, investors, advertisers, or creators.


Use this when analyzing ads, app installs, affiliates, or lead generation.

## Symptoms

- High click volume with low conversion quality.
- High install volume with weak retention.
- Last-click source captures sales that were already likely.
- Organic installs seem to vanish after paid source appears.
- Unusual click-to-install timing distributions.
- Lead forms contain repeated patterns or impossible geographies.
- Conversions happen without meaningful engagement.

## Questions

1. Did the credited source plausibly influence the user?
2. Is there evidence of real user intent?
3. Are downstream events consistent with genuine demand?
4. Are the incentives aligned to volume rather than quality?
5. Is attribution being used as proof of performance without causal validation?

## Source notes

- **AppsFlyer mobile ad fraud field guide** (Industry report). Defines install hijacking, click flooding and fake installs as mobile-ad-fraud categories; explains attribution hijacking steals credit for installs from other sources. URL: https://www.appsflyer.com/resources/reports/apac-mobile-ad-fraud/
- **AppsFlyer validation rules to prevent fraud** (Industry documentation / primary). Rules can block installs and in-app event attributions for hijacked installs, bots, emulators, device farms and fake installs/events. URL: https://support.appsflyer.com/hc/en-us/articles/115004703926-Implement-validation-rules-to-prevent-fraud
- **Google 2025 Ads Safety Report** (Platform transparency / primary). Google said Gemini-powered tools stopped over 99% of policy-violating ads before they ran in 2025; blocked/removed over 8.3B ads and suspended 24.9M accounts, including 602M scam ads and 4M scam-associated accounts. URL: https://blog.google/products/ads-commerce/2025-ads-safety-report/
