# Schemas

Converted from `reference_implementation/ad_factory/schemas.py` so the pack remains Markdown-only.

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class Claim:
    claim_id: str
    status: str
    risk_level: str
    approved_wording: str
    prohibited_wording: str = ""
    proof_url: str = ""
    required_disclaimer: str = ""

@dataclass
class AdVariant:
    variant_id: str
    channel: str
    buyer_state: str
    primary_text: str
    headline: str
    cta: str
    claim_ids: List[str]
    landing_page: str
    risk_score: int = 0
    review_required: bool = False
    notes: List[str] = field(default_factory=list)

@dataclass
class PolicyReview:
    status: str
    risk_score: int
    unsupported_claims: List[str]
    required_disclaimers: List[str]
    safe_rewrite: Optional[str] = None
    notes: List[str] = field(default_factory=list)

@dataclass
class ExperimentPlan:
    experiment_id: str
    hypothesis: str
    channel: str
    arms: List[Dict[str, Any]]
    primary_metric: str
    guardrails: List[str]
    budget_cap: float
    kill_rules: List[str]
```
