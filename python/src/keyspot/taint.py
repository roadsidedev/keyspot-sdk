import re
import hashlib
import secrets
from typing import List, Optional, Any


class TaintEngine:
    """Tracks which values derive from detected secrets."""

    def __init__(self):
        self._taints: dict = {}

    def tag(self, value: Any, secret_id: str, source: str) -> None:
        key = self._hash(value)
        if key not in self._taints:
            self._taints[key] = []
        existing = {t["secretId"] for t in self._taints[key]}
        if secret_id not in existing:
            self._taints[key].append({"secretId": secret_id, "source": source})

    def get_taints(self, value: Any) -> List[dict]:
        key = self._hash(value)
        return self._taints.get(key, [])

    def propagate(self, source_values: List[Any], derived_value: Any) -> None:
        all_ids = set()
        for sv in source_values:
            for t in self.get_taints(sv):
                all_ids.add(t["secretId"])
        for sid in all_ids:
            self.tag(derived_value, sid, "propagated")

    def untaint(self, value: Any) -> None:
        key = self._hash(value)
        self._taints.pop(key, None)

    @staticmethod
    def _hash(value: Any) -> str:
        raw = str(value).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
