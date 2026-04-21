# Claim Bank

Converted from `reference_implementation/ad_factory/claim_bank.py` so the pack remains Markdown-only.

```python
import csv
from pathlib import Path
from typing import Dict
from .schemas import Claim


def load_claim_bank(path: str | Path) -> Dict[str, Claim]:
    claims: Dict[str, Claim] = {}
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            claim = Claim(
                claim_id=row['claim_id'],
                status=row['status'],
                risk_level=row['risk_level'],
                approved_wording=row.get('approved_wording',''),
                prohibited_wording=row.get('prohibited_wording',''),
                proof_url=row.get('proof_url',''),
                required_disclaimer=row.get('required_disclaimer',''),
            )
            claims[claim.claim_id] = claim
    return claims
```
