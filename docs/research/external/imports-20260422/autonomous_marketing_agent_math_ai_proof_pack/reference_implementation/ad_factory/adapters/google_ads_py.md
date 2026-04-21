# Google Ads

Converted from `reference_implementation/ad_factory/adapters/google_ads.py` so the pack remains Markdown-only.

```python
from typing import Dict, Any
from ad_factory.schemas import AdVariant
from .base import PlatformAdapter

class GoogleAdsAdapter(PlatformAdapter):
    def build_payload(self, ad: AdVariant) -> Dict[str, Any]:
        return {
            'platform': 'google_ads',
            'type': 'responsive_search_ad_draft',
            'ad_group_ad': {
                'final_urls': [f'https://example.com{ad.landing_page}'],
                'responsive_search_ad': {
                    'headlines': [
                        {'text': ad.headline[:30]},
                        {'text': 'AI Drafts You Review'},
                        {'text': 'Watch The Workflow'},
                    ],
                    'descriptions': [
                        {'text': ad.primary_text[:90]},
                        {'text': 'Use sample data first before connecting tools.'},
                    ],
                },
            },
            'metadata': {'claim_ids': ad.claim_ids, 'variant_id': ad.variant_id},
        }
```
