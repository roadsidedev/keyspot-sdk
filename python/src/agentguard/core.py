import json
import secrets
from typing import Optional, Any, List
from .scanner import Scanner, Match
from .taint import TaintEngine
from .vault import BaseVaultAdapter, InMemoryVaultAdapter, VaultWriteOptions
from .security import PromptShield, AuditLogger

PATH_CONTEXT = {
    "config": 0.15, "secret": 0.15, "token": 0.15, "key": 0.15,
    "password": 0.15, "credential": 0.15, "env": 0.1,
    "github": 0.08, "ci": 0.08,
    "log": -0.1, "debug": -0.1, "history": -0.15,
    "message": -0.2, "chat": -0.2, "memory": -0.15,
}


def contextual_score(path: str, base_conf: float) -> float:
    parts = path.lower().replace("[", ".").replace("]", "").split(".")
    for p in parts:
        adj = PATH_CONTEXT.get(p)
        if adj is not None:
            return max(0.1, min(1.0, base_conf + adj))
    return base_conf


class AgentGuard:
    def __init__(self, vault: Optional[BaseVaultAdapter] = None,
                 taint_enabled: bool = True,
                 prompt_shield_enabled: bool = False,
                 on_secret_found=None,
                 rotation_hook=None):
        self.taint_engine = TaintEngine()
        self.scanner = Scanner(taint_engine=self.taint_engine, taint_enabled=taint_enabled)
        self.vault = vault or InMemoryVaultAdapter()
        self.audit_logger = AuditLogger()
        self.on_secret_found = on_secret_found
        self.rotation_hook = rotation_hook
        self.prompt_shield = PromptShield() if prompt_shield_enabled else None

    async def scan(self, data: Any) -> List[Match]:
        return await self.scanner.scan(data)

    async def checkpoint(self, state: Any) -> Any:
        self.audit_logger.log({"type": "checkpoint_start", "stateSummary": type(state).__name__})
        matches = await self.scan(state)
        clean_state = json.loads(json.dumps(state))

        for match in matches:
            if self.on_secret_found:
                await self.on_secret_found(match)

            if match.raw_value:
                opts = {"tags": {"type": match.type, "path": match.path}}
                secret_to_store = match.raw_value

                if self.rotation_hook:
                    rotated = await self.rotation_hook(match)
                    if rotated:
                        secret_to_store = rotated
                        opts["tags"]["rotated"] = "true"

                vault_id = await self.vault.write(secret_to_store, VaultWriteOptions(**opts))
                vault_ref = self.vault.generate_ref(vault_id, secret_to_store)
                self._replace_at_path(clean_state, match.path, vault_ref)
                self.audit_logger.log({
                    "type": "secret_vaulted", "secretId": match.secret_id,
                    "vaultId": vault_id, "path": match.path,
                })
            elif match.type == "tainted_content":
                self._replace_at_path(clean_state, match.path, "[REDACTED TAINTED CONTENT]")
                self.audit_logger.log({"type": "taint_redacted", "path": match.path})

        self.audit_logger.log({"type": "checkpoint_end", "matchesFound": len(matches)})
        return clean_state

    async def validate_prompt(self, prompt: str) -> dict:
        if not self.prompt_shield:
            return {"blocked": False, "findings": []}
        result = await self.prompt_shield.analyze(prompt)
        self.audit_logger.log({
            "type": "prompt_validation",
            "promptSummary": prompt[:50],
            **result,
        })
        return result

    @staticmethod
    def _replace_at_path(obj: Any, path: str, value: Any) -> None:
        if not path:
            return
        parts = [p for p in path.replace("[", ".").replace("]", "").split(".") if p]
        current = obj
        for i, key in enumerate(parts[:-1]):
            if isinstance(current, list):
                current = current[int(key)]
            else:
                current = current[key]
        last = parts[-1]
        if isinstance(current, list):
            current[int(last)] = value
        else:
            current[last] = value
