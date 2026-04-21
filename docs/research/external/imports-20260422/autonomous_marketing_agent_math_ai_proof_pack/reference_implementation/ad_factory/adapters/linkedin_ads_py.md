# Linkedin Ads

Converted from `reference_implementation/ad_factory/adapters/linkedin_ads.py` so the pack remains Markdown-only.

```python
from typing import Dict, Any
from ad_factory.schemas import AdVariant
from .base import PlatformAdapter

class LinkedInAdsAdapter(PlatformAdapter):
    def build_payload(self, ad: AdVariant) -> Dict[str, Any]:
        return {
            'platform': 'linkedin',
            'type': 'sponsored_content_draft',
            'objectiveType': 'WEBSITE_CONVERSION',
            'creative': {
                'introductory_text': ad.primary_text,
                'headline': ad.headline,
                'landing_page': f'https://example.com{ad.landing_page}',
            },
            'metadata': {'claim_ids': ad.claim_ids, 'variant_id': ad.variant_id},
        }
```
