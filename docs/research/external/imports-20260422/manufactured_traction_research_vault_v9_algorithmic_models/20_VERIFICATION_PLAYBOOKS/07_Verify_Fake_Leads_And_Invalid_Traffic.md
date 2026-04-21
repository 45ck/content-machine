# Verify Fake Leads and Invalid Traffic

## Claim being tested

Ad traffic or lead volume represents genuine customer demand.

## Alternative hypothesis

The traffic includes bots, low-quality incentivized leads, click fraud, fake forms, or misattributed conversions.

## Data fields

- lead_id
- timestamp
- channel/source
- campaign_id
- IP/geography where lawful
- device/browser
- form fields
- response status
- sales-qualified status
- duplicate indicators
- conversion outcome

## Metrics

- lead burst z-score
- duplicate-field similarity
- impossible geography
- contactability rate
- lead-to-SQL conversion
- time-on-site
- placement-level anomaly
- channel entropy
- repeated device/browser fingerprints where lawful

## Safe conclusion

"The campaign produced measurable actions but weak downstream qualification, suggesting conversion-signal pollution rather than real demand."
