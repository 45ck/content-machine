# Base

Converted from `reference_implementation/ad_factory/adapters/base.py` so the pack remains Markdown-only.

```python
from abc import ABC, abstractmethod
from typing import Dict, Any
from ad_factory.schemas import AdVariant

class PlatformAdapter(ABC):
    @abstractmethod
    def build_payload(self, ad: AdVariant) -> Dict[str, Any]:
        raise NotImplementedError

    def launch(self, payload: Dict[str, Any]) -> None:
        raise RuntimeError('Real launch is disabled in the reference implementation.')
```
