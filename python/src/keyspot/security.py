import hashlib
import json
import time
from typing import List, Optional


class PromptShield:
    RULES = [
        ("jailbreak_attempt",
         r"ignore previous instructions|forget your instructions|you are now an unrestricted|"
         r"you are free from all restrictions|you have no rules", "block"),
        ("data_exfiltration", r"send this to|post to http|upload your memory|forward to https?:\/\/|exfiltrate", "warn"),
        ("base64_encode", r"base64[\s\(]*encode|encode.*base64|convert to base64", "warn"),
        ("hex_encode", r"convert to hex|hexadecimal encode|encode as hex", "warn"),
        ("role_play_bypass", r"act as|roleplay as|pretend to be|act like|from now on you are", "warn"),
        ("memory_extraction",
         r"what (is|was|were) (my|the secret|the password|the api|the token)|"
         r"retrieve (my|all) (memories|history|context)", "block"),
        ("system_prompt_extraction",
         r"print (your|the) (system prompt|instructions|guidelines|rules)|"
         r"output your (system prompt|prompt template)|reveal your (prompt|instructions)", "block"),
        ("dangerous_directive",
         r"modify (your|the) (code|program|behavior|rules|constraints)|"
         r"disable (your |the |all )?(safety|filter|restriction|protection|limit)", "block"),
        ("command_injection", r"`[^`]+`|\\\$\([^)]+\)", "warn"),
        ("sql_injection", r"' OR '1'='1|' OR 1=1|UNION SELECT|DROP TABLE|DELETE FROM", "warn"),
        ("tool_abuse", r"execute|run command|shell command|terminal|access the file system|read file|write file|delete file",
         "warn"),
    ]

    def __init__(self, custom_rules: Optional[List[tuple]] = None):
        import re
        self._rules = []
        all_rules = list(self.RULES)
        if custom_rules:
            all_rules.extend(custom_rules)
        for name, pattern, severity in all_rules:
            self._rules.append({"name": name, "pattern": re.compile(pattern, re.IGNORECASE), "severity": severity})

    async def analyze(self, prompt: str) -> dict:
        findings = []
        blocked = False
        for rule in self._rules:
            if rule["pattern"].search(prompt):
                findings.append(rule["name"])
                if rule["severity"] == "block":
                    blocked = True
        return {"blocked": blocked, "findings": findings}


class AuditLogger:
    def __init__(self):
        self._last_hash = "0" * 64
        self._entries: list = []

    def log(self, event: dict) -> dict:
        timestamp = int(time.time() * 1000)
        prev_hash = self._last_hash
        data = json.dumps({**event, "timestamp": timestamp, "prevHash": prev_hash}, sort_keys=True)
        h = hashlib.sha256(data.encode("utf-8")).hexdigest()
        entry = {"event": event, "timestamp": timestamp, "prevHash": prev_hash, "hash": h}
        self._entries.append(entry)
        self._last_hash = h
        return entry

    def verify_chain(self, entries: list) -> bool:
        current_prev = "0" * 64
        for entry in entries:
            if entry["prevHash"] != current_prev:
                return False
            data = json.dumps({**entry["event"], "timestamp": entry["timestamp"],
                               "prevHash": entry["prevHash"]}, sort_keys=True)
            current_prev = hashlib.sha256(data.encode("utf-8")).hexdigest()
            if entry["hash"] != current_prev:
                return False
        return True

    def get_entries(self) -> list:
        return list(self._entries)

    def clear(self):
        self._entries = []
        self._last_hash = "0" * 64
