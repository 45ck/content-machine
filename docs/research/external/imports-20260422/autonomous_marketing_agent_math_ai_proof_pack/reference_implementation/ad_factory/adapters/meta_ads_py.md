# Meta Ads

Converted from `reference_implementation/ad_factory/adapters/meta_ads.py` so the pack remains Markdown-only.

```python
from typing import Dict, Any
from ad_factory.schemas import AdVariant
from .base import PlatformAdapter

class MetaAdsAdapter(PlatformAdapter):
    def build_payload(self, ad: AdVariant) -> Dict[str, Any]:
        return {
            'platform': 'meta',
            'type': 'ad_creative_draft',
            'creative': {
                'primary_text': ad.primary_text,
                'headline': ad.headline,
                'cta': ad.cta,
                'object_url': f'https://example.com{ad.landing_page}',
            },
            'metadata': {'claim_ids': ad.claim_ids, 'variant_id': ad.variant_id},
        }
```
