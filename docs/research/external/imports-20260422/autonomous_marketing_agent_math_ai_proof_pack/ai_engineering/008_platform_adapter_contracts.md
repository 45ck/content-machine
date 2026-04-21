# Platform Adapter Contracts

## Purpose

Convert Markdown campaign packets into platform-specific launch packets.

## Universal fields

```text
campaign_name
objective
channel
audience
budget
schedule
creative_assets
copy_variants
landing_url
utm_parameters
conversion_event
measurement_plan
pause_rules
scale_rules
```

## Platform adapters

```text
google_search_packet.md
meta_feed_packet.md
tiktok_video_packet.md
linkedin_sponsored_content_packet.md
```

## Rule

The platform packet must be readable by a human and executable by a future API adapter.
