# SQL Examples

## Compute shares per reach

```sql
SELECT
  video_id,
  checkpoint,
  shares::float / NULLIF(reach, 0) AS shares_per_reach,
  saves::float / NULLIF(reach, 0) AS saves_per_reach,
  comments::float / NULLIF(reach, 0) AS comments_per_reach
FROM platform_metrics;
```

## Creator baseline

```sql
SELECT
  creator_id,
  platform,
  format_label,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY average_percentage_viewed) AS median_apv,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY shares::float / NULLIF(reach, 0)) AS median_share_rate,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY saves::float / NULLIF(reach, 0)) AS median_save_rate
FROM platform_metrics pm
JOIN videos v USING (video_id)
WHERE checkpoint = '72h'
GROUP BY creator_id, platform, format_label;
```

## Normalized lift

```sql
SELECT
  m.video_id,
  LN((m.shares_per_reach + 1e-6) / (b.median_share_rate + 1e-6)) AS share_lift
FROM derived_metrics m
JOIN creator_baselines b
  ON m.creator_id = b.creator_id
 AND m.platform = b.platform
 AND m.format_label = b.format_label;
```
