# Tiktok Ads

Converted from `reference_implementation/ad_factory/adapters/tiktok_ads.py` so the pack remains Markdown-only.

```python
from typing import Dict, Any
from ad_factory.schemas import AdVariant
from .base import PlatformAdapter

class TikTokAdsAdapter(PlatformAdapter):
    def build_payload(self, ad: AdVariant) -> Dict[str, Any]:
        return {
            'platform': 'tiktok',
            'type': 'video_creative_brief_draft',
            'creative_brief': {
                'hook': ad.headline,
                'script': ad.primary_text,
                'cta': ad.cta,
                'landing_page': f'https://example.com{ad.landing_page}',
            },
            'metadata': {'claim_ids': ad.claim_ids, 'variant_id': ad.variant_id},
        }
```
