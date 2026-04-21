# Run Mock Pipeline

Converted from `reference_implementation/ad_factory/run_mock_pipeline.py` so the pack remains Markdown-only.

```python
import json
from dataclasses import asdict
from pathlib import Path

from .claim_bank import load_claim_bank
from .generate import generate_variants
from .policy import review_ad
from .experiments import build_experiment_plan
from .adapters.google_ads import GoogleAdsAdapter
from .adapters.meta_ads import MetaAdsAdapter
from .adapters.linkedin_ads import LinkedInAdsAdapter
from .adapters.tiktok_ads import TikTokAdsAdapter

ROOT = Path(__file__).resolve().parents[1]
CLAIMS = ROOT / 'data' / 'sample_claim_bank.csv'
OUT = ROOT / 'outputs' / 'sample_campaign_plan.json'

ADAPTERS = {
    'google_search': GoogleAdsAdapter(),
    'meta': MetaAdsAdapter(),
    'linkedin': LinkedInAdsAdapter(),
    'tiktok': TikTokAdsAdapter(),
}


def main() -> None:
    claims = load_claim_bank(CLAIMS)
    variants = generate_variants()
    reviewed = []

    for ad in variants:
        review = review_ad(ad, claims)
        payload = None
        if review.status in {'approved', 'needs_review'}:
            adapter = ADAPTERS.get(ad.channel)
            if adapter:
                payload = adapter.build_payload(ad)
        reviewed.append({
            'ad': asdict(ad),
            'policy_review': asdict(review),
            'payload_draft': payload,
        })

    plan = {
        'note': 'Mock output only. No platform APIs called. No spend possible.',
        'ads': reviewed,
        'experiment_plan': asdict(build_experiment_plan()),
    }
    OUT.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    main()
```
