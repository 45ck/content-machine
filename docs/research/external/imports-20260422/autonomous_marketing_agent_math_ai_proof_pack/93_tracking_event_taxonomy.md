# Tracking Event Taxonomy and UTM Plan

## Principle

If the ad factory cannot measure the buyer path, it will optimise for whatever metric the platform gives it. That is dangerous.

## Core events

| Event | Meaning | Required properties |
|---|---|---|
| `ad_click` | User clicked ad | source, medium, campaign, content, term, ad_id |
| `landing_view` | Landing page loaded | page, referrer, utm fields |
| `demo_started` | User started demo/video/sandbox | demo_id, buyer_state |
| `demo_completed` | User reached proof point | demo_id, completion_percent |
| `signup_started` | Began signup | plan, source |
| `signup_completed` | Account created | workspace_id, source |
| `activation_event` | User experienced core value | product-specific event |
| `trial_to_paid` | Trial converted | plan, revenue, time_to_convert |
| `demo_booked` | Sales conversion | segment, meeting_type |
| `qualified_pipeline` | CRM qualified opportunity | segment, expected_value |
| `customer_won` | Paid customer | contract_value, sales_cycle_days |
| `customer_retained` | Renewal/retention | renewal_value |

## SaaS activation examples

- Imported first CSV.
- Connected first integration.
- Created first workflow.
- Invited a teammate.
- Completed first automation run.
- Exported first report.
- Published first dashboard.

## UTM structure

```text
utm_source=google|meta|linkedin|tiktok|youtube
utm_medium=cpc|paid_social|paid_video|retargeting
utm_campaign=product_channel_state_angle_quarter
utm_content=creativeid_angle_offer_version
utm_term=query_or_audience_label
```

## Naming convention

```text
PRODUCT_CHANNEL_REGION_BUYERSTATE_ANGLE_OFFER_YYYYQ#
```

Example:

```text
SFLOW_GOOGLE_AU_SOLUTIONAWARE_TICKETDRAFTS_SANDBOX_2026Q2
```

## Warehouse joins

Store platform IDs alongside internal IDs:

- hypothesis_id,
- experiment_id,
- campaign_id,
- ad_group/ad_set_id,
- ad_id,
- asset_id,
- landing_page_id,
- claim_ids,
- offer_id,
- buyer_state.

## Mindset

The platform dashboard is a partial sensor, not the truth. Your warehouse is where learning becomes durable.
