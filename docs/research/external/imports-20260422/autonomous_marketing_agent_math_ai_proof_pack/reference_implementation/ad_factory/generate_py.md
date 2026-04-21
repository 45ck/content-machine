# Generate

Converted from `reference_implementation/ad_factory/generate.py` so the pack remains Markdown-only.

```python
from typing import List
from .schemas import AdVariant


def generate_variants() -> List[AdVariant]:
    """Deterministic examples. Replace with LLM structured-output generation after evals exist."""
    return [
        AdVariant(
            variant_id='AD-001',
            channel='google_search',
            buyer_state='solution_aware',
            primary_text='Convert support emails into structured ticket drafts your team can review.',
            headline='Turn Support Emails Into Ticket Drafts',
            cta='Watch the workflow',
            claim_ids=['CLM-001','CLM-002'],
            landing_page='/demo/support-ticket-drafts',
            risk_score=20,
        ),
        AdVariant(
            variant_id='AD-002',
            channel='linkedin',
            buyer_state='vendor_aware',
            primary_text='See the permission preview before connecting your inbox. Use sample data first.',
            headline='Review permissions before setup',
            cta='View permission preview',
            claim_ids=['CLM-003'],
            landing_page='/security/permissions',
            risk_score=10,
        ),
        AdVariant(
            variant_id='AD-003_BLOCKED_EXAMPLE',
            channel='meta',
            buyer_state='problem_aware',
            primary_text='Guaranteed 100% accurate AI tickets that replace your support team.',
            headline='Save 10 hours every week',
            cta='Start now',
            claim_ids=['CLM-004','CLM-005'],
            landing_page='/start',
            risk_score=60,
        ),
    ]
```
