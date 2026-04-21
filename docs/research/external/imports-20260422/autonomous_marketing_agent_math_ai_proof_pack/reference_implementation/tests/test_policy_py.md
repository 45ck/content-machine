# Test Policy

Converted from `reference_implementation/tests/test_policy.py` so the pack remains Markdown-only.

```python
from ad_factory.claim_bank import load_claim_bank
from ad_factory.generate import generate_variants
from ad_factory.policy import review_ad
from pathlib import Path


def test_blocked_example_is_blocked():
    root = Path(__file__).resolve().parents[1]
    claims = load_claim_bank(root / 'data' / 'sample_claim_bank.csv')
    ad = [a for a in generate_variants() if a.variant_id.endswith('BLOCKED_EXAMPLE')][0]
    review = review_ad(ad, claims)
    assert review.status == 'blocked'
    assert review.unsupported_claims


def test_low_risk_ad_is_not_blocked():
    root = Path(__file__).resolve().parents[1]
    claims = load_claim_bank(root / 'data' / 'sample_claim_bank.csv')
    ad = [a for a in generate_variants() if a.variant_id == 'AD-001'][0]
    review = review_ad(ad, claims)
    assert review.status in {'approved', 'needs_review'}
```
