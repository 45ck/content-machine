# Verify Mobile Attribution Fraud

## Claim being tested

A source deserves credit for installs or events.

## Alternative hypothesis

Attribution was hijacked by click flooding, install hijacking, fake installs, bots, device farms, or SDK spoofing.

## Data fields

- click timestamp
- install timestamp
- first open timestamp
- source/campaign/adset
- device ID where lawful
- IP/geography
- SDK version
- post-install events
- retention
- uninstall/refund
- attribution windows

## Metrics

- click-to-install-time distribution
- source-level click volume vs install volume
- post-install retention quality
- device cluster anomaly
- repeated event sequences
- channel mismatch
- improbable attribution concentration

## Graph model

Device-source-event graph. Link devices/sources with repeated suspicious event sequences.

## Safe conclusion

"The source shows attribution-fraud risk because it receives credit under timing/device patterns inconsistent with normal acquisition."
