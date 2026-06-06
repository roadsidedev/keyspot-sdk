import hashlib
import hmac
import secrets
import time
from typing import Optional, List, Dict


class VaultWriteOptions:
    def __init__(self, ttl: Optional[int] = None,
                 visible_to: Optional[List[str]] = None,
                 tags: Optional[Dict[str, str]] = None,
                 rotation_hook=None):
        self.ttl = ttl
        self.visible_to = visible_to
        self.tags = tags or {}
        self.rotation_hook = rotation_hook


class BaseVaultAdapter:
    async def write(self, secret: str, options: Optional[VaultWriteOptions] = None) -> str:
        raise NotImplementedError

    async def read(self, id: str, agent_id: Optional[str] = None) -> Optional[str]:
        raise NotImplementedError

    async def list(self) -> List[str]:
        raise NotImplementedError

    async def delete(self, id: str) -> bool:
        raise NotImplementedError

    def generate_ref(self, id: str, secret: str, ttl: int = 3600000) -> str:
        expiry = int(time.time() * 1000) + ttl
        msg = f"{id}:{expiry}".encode("utf-8")
        sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return f"vault:v1:{id}:{sig}:{expiry}"

    def verify_ref(self, ref: str, secret: Optional[str] = None) -> bool:
        parts = ref.split(":")
        if len(parts) < 5 or parts[0] != "vault" or parts[1] != "v1":
            return False
        expiry = int(parts[4])
        if expiry < int(time.time() * 1000):
            return False
        if secret:
            msg = f"{parts[2]}:{expiry}".encode("utf-8")
            expected = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
            if parts[3] != expected:
                return False
        return True


class InMemoryVaultAdapter(BaseVaultAdapter):
    def __init__(self):
        self._store: Dict[str, dict] = {}

    async def write(self, secret: str, options: Optional[VaultWriteOptions] = None) -> str:
        id = f"vault_{secrets.token_hex(8)}"
        self._store[id] = {
            "value": secret,
            "options": options,
            "created_at": int(time.time() * 1000),
        }
        return id

    async def read(self, id: str, agent_id: Optional[str] = None) -> Optional[str]:
        entry = self._store.get(id)
        if not entry:
            return None
        opts = entry.get("options")
        if opts and opts.ttl and entry["created_at"] + opts.ttl < int(time.time() * 1000):
            del self._store[id]
            return None
        if opts and opts.visible_to and agent_id and agent_id not in opts.visible_to:
            return None
        return entry["value"]

    async def list(self) -> List[str]:
        return list(self._store.keys())

    async def delete(self, id: str) -> bool:
        return self._store.pop(id, None) is not None
