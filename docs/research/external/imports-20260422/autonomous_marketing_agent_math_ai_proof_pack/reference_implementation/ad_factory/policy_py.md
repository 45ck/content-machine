# Policy

Converted from `reference_implementation/ad_factory/policy.py` so the pack remains Markdown-only.

```python
from typing import Dict, List
from .schemas import AdVariant, Claim, PolicyReview

BLOCKED_TERMS = [
    'guaranteed',
    '100% accurate',
    'replaces your team',
    'best in the world',
    'risk-free',
]

HIGH_RISK_PATTERNS = [
    'save 10 hours',
    '10x',
    '#1',
    'enterprise-grade security',
]


def review_ad(ad: AdVariant, claims: Dict[str, Claim]) -> PolicyReview:
    text = f"{ad.primary_text} {ad.headline}".lower()
    unsupported: List[str] = []
    required_disclaimers: List[str] = []
    risk = ad.risk_score
    notes: List[str] = []

    for term in BLOCKED_TERMS:
        if term.lower() in text:
            unsupported.append(term)
            risk += 50

    for pattern in HIGH_RISK_PATTERNS:
        if pattern.lower() in text:
            risk += 25
            notes.append(f"High-risk pattern detected: {pattern}")

    for cid in ad.claim_ids:
        claim = claims.get(cid)
        if claim is None:
            unsupported.append(f"Unknown claim ID: {cid}")
            risk += 40
            continue
        if claim.status not in {'approved', 'approved_with_disclaimer'}:
            unsupported.append(f"Claim not approved: {cid} ({claim.status})")
            risk += 40
        if claim.risk_level == 'high':
            risk += 25
        if claim.required_disclaimer:
            required_disclaimers.append(claim.required_disclaimer)

    if unsupported or risk >= 80:
        status = 'blocked'
    elif risk >= 30 or required_disclaimers:
        status = 'needs_review'
    else:
        status = 'approved'

    safe_rewrite = None
    if status != 'approved':
        safe_rewrite = 'Use only approved claim wording and route to proof before asking for belief.'

    return PolicyReview(
        status=status,
        risk_score=min(risk, 100),
        unsupported_claims=unsupported,
        required_disclaimers=sorted(set(required_disclaimers)),
        safe_rewrite=safe_rewrite,
        notes=notes,
    )
```
