# Platform Snapshot

Date verified: 2026-04-29
Purpose: current platform constraints that should shape export defaults.

This is a conservative production snapshot. Platform rules vary by account,
region, upload surface, ad vs organic flow, and music/copyright state, so
runtime validators should keep these values configurable.

## Universal Default

Use `1080x1920`, `9:16`, H.264/AAC MP4, 30 fps or higher, captions inside a
conservative centered safe zone, and audio normalized during final export.

## YouTube Shorts

- YouTube Studio accepts short videos up to 3 minutes with square or vertical
  aspect ratio as Shorts.
- YouTube's three-minute Shorts rule applies to eligible uploads after
  October 15, 2024.
- Shorts over 1 minute can be blocked globally if they receive an active
  Content ID claim.

Production default: keep generated Shorts under 60 seconds unless the script
explicitly benefits from 1-3 minutes and music/copyright risk is controlled.

Sources:

- https://support.google.com/youtube/answer/12779649
- https://support.google.com/youtube/answer/15424877

## TikTok

- TikTok app recording can be up to 10 minutes; uploaded videos can be up to
  60 minutes.
- TikTok Studio web uploads list MP4/WebM, at least `720x1280`, up to 30
  minutes, and under 10 GB.
- TikTok ad specs recommend vertical `9:16`; in-feed ad specs list at least
  `540x960` for vertical video.

Production default: keep organic short-form exports at `1080x1920`, 15-60
seconds for discovery-first content, and do a separate long upload profile
only when explicitly requested.

Sources:

- https://support.tiktok.com/en/using-tiktok/creating-videos/camera-tools
- https://support.tiktok.com/en/using-tiktok/creating-videos/creator-tools-on-tiktok
- https://ads.tiktok.com/help/article/video-ads-specifications

## Instagram Reels

- Instagram/Facebook Help says Reels can be uploaded with aspect ratios from
  `1.91:1` to `9:16`.
- Reels should have at least 30 fps and at least 720 px resolution.
- Cover photo guidance is separate from video export and should be handled as
  a publish asset.

Production default: export `1080x1920` `9:16`, maintain a cover/first-frame
asset, and keep key text away from top, bottom, and right UI zones.

Source:

- https://www.facebook.com/help/1038071743007909

## Open Questions

- Instagram organic/app duration limits are less stable than the aspect and
  frame-rate guidance surfaced by Meta Help. Keep duration configurable.
- TikTok web upload limits differ from app and Series flows. Do not hardcode
  one max duration for all TikTok outputs.
- Platform safe zones are not fully published as official pixel constants.
  Keep local safe zones conservative and verify with visual review.
