from __future__ import annotations
import re
import hashlib
import secrets
from typing import List, Optional, Any


# ── 70+ Built-in Patterns ──

BUILT_IN_PATTERNS = [
    # Critical
    ("ethereum_private_key", r"\b(?:0x)?[a-fA-F0-9]{64}\b", "critical"),
    ("solana_private_key", r"\b[1-9A-HJ-NP-Za-km-z]{87,88}\b", "critical"),
    # AI / LLM
    ("openai_api_key", r"sk-[a-zA-Z0-9]{48}", "high"),
    ("openai_org_key", r"org-[a-zA-Z0-9]{24}", "high"),
    ("openai_project_key", r"sk-proj-[a-zA-Z0-9]{52}", "high"),
    ("anthropic_api_key", r"sk-ant-api03-[a-zA-Z0-9_-]{86}-[a-zA-Z0-9_-]{8}", "high"),
    ("google_ai_key", r"\bAIza[0-9A-Za-z\-_]{35}\b", "high"),
    ("huggingface_token", r"\bhf_[a-zA-Z0-9]{34,50}\b", "high"),
    ("replicate_api_key", r"\br8_[0-9A-Za-z]{37}\b", "high"),
    # Cloud
    ("aws_access_key", r"\bAKIA[0-9A-Z]{16}\b", "high"),
    ("aws_secret_key", r"\b[0-9a-zA-Z\/+]{40}\b", "high"),
    ("gcp_service_account", r'["\']?type["\']?\s*:\s*["\']service_account["\']', "high"),
    ("azure_connection_string", r"\bDefaultEndpointsProtocol=https;AccountName=[a-z0-9]+;AccountKey=[a-zA-Z0-9\/+]{86}==;EndpointSuffix=core\.windows\.net\b", "high"),
    ("digitalocean_token", r"\bdop_v1_[0-9a-f]{64}\b", "high"),
    # SaaS
    ("stripe_live_key", r"\b(sk_live|pk_live)_[0-9a-zA-Z]{24,34}\b", "high"),
    ("twilio_sid", r"\bAC[a-zA-Z0-9]{32}\b", "high"),
    ("sendgrid_api_key", r"\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b", "high"),
    ("mailgun_api_key", r"\bkey-[0-9a-f]{32}\b", "high"),
    ("mailchimp_api_key", r"\b[0-9a-f]{32}-us\d{1,2}\b", "high"),
    ("slack_token", r"\bxox[bpaors]-[a-zA-Z0-9\-]{10,200}\b", "high"),
    ("slack_webhook", r"https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9}\/[A-Z0-9]{9}\/[a-zA-Z0-9]{24}", "high"),
    ("discord_token", r"\b[a-zA-Z0-9_-]{24}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27}\b", "high"),
    ("github_token", r"\bghp_[a-zA-Z0-9]{36}\b", "high"),
    ("gitlab_token", r"\bglpat-[a-zA-Z0-9\-_]{20,40}\b", "high"),
    ("npm_token", r"\bnpm_[a-zA-Z0-9]{36}\b", "high"),
    # DB URLs
    ("postgresql_url", r"postgres(?:ql)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}\/[a-zA-Z0-9_]+", "critical"),
    ("mongodb_url", r"mongodb(?:\+srv)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}\/[a-zA-Z0-9_]+", "critical"),
    # Crypto keys
    ("rsa_private_key", r"-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----", "critical"),
    ("ec_private_key", r"-----BEGIN EC PRIVATE KEY-----[\s\S]+?-----END EC PRIVATE KEY-----", "critical"),
    ("ed25519_private_key", r"-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----", "critical"),
    ("ssh_private_key", r"-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]+?-----END OPENSSH PRIVATE KEY-----", "critical"),
    ("jwt_token", r"\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b", "medium"),
    # PII
    ("credit_card", r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "high"),
    ("social_security_number", r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b", "high"),
    # More
    ("firebase_api_key", r"\bAIzaSy[a-zA-Z0-9_-]{26,35}\b", "high"),
    ("notion_api_key", r"\bsecret_[a-zA-Z0-9]{43}\b", "high"),
    ("linear_api_key", r"\blin_api_[a-zA-Z0-9_-]{30,60}\b", "high"),
    ("shopify_api_key", r"\bshpat_[a-f0-9]{32}\b", "high"),
    ("cloudflare_token", r"\b[0-9a-zA-Z_-]{40}\b", "high"),
    ("docker_hub_token", r"\bdckr_pat_[a-zA-Z0-9_-]{20,60}\b", "high"),
]


class Pattern:
    def __init__(self, name: str, regex: str, severity: str):
        self.name = name
        self.regex = re.compile(regex)
        self.severity = severity

    def find_all(self, text: str) -> List[tuple]:
        matches = []
        for m in self.regex.finditer(text):
            matches.append((m.group(), m.start(), m.end()))
        return matches


class Match:
    def __init__(self, type_name: str, severity: str, path: str,
                 raw_value: str, confidence: float, secret_id: Optional[str] = None,
                 source_secret_ids: Optional[List[str]] = None):
        self.type = type_name
        self.severity = severity
        self.path = path
        self.raw_value = raw_value
        self.confidence = confidence
        self.secret_id = secret_id
        self.source_secret_ids = source_secret_ids
        self._redacted: Optional[str] = None

    @property
    def redacted(self) -> str:
        if self._redacted:
            return self._redacted
        if len(self.raw_value) <= 8:
            self._redacted = "********"
        else:
            self._redacted = f"{self.raw_value[:4]}...{self.raw_value[-4:]}"
        return self._redacted


class Scanner:
    def __init__(self, patterns: Optional[List[Pattern]] = None,
                 taint_engine: Optional['TaintEngine'] = None,
                 taint_enabled: bool = True):
        self.taint_engine = taint_engine
        self.taint_enabled = taint_enabled
        if patterns:
            self.patterns = patterns
        else:
            self.patterns = [Pattern(n, r, s) for n, r, s in BUILT_IN_PATTERNS]

    async def scan(self, data: Any, path: str = "") -> List[Match]:
        matches: List[Match] = []
        if isinstance(data, str):
            has_direct = False
            for pattern in self.patterns:
                for raw_value, start, end in pattern.find_all(data):
                    secret_id = f"sec_{secrets.token_hex(4)}"
                    matches.append(Match(
                        type_name=pattern.name,
                        severity=pattern.severity,
                        path=path,
                        raw_value=raw_value,
                        confidence=0.99,
                        secret_id=secret_id,
                    ))
                    has_direct = True
                    if self.taint_enabled and self.taint_engine:
                        self.taint_engine.tag(data, secret_id, "scanner")

            if self.taint_enabled and self.taint_engine and not has_direct:
                taints = self.taint_engine.get_taints(data)
                if taints:
                    matches.append(Match(
                        type_name="tainted_content",
                        severity="medium",
                        path=path,
                        raw_value=data,
                        confidence=0.8,
                        source_secret_ids=[t["secretId"] for t in taints],
                    ))
        elif isinstance(data, list):
            for i, item in enumerate(data):
                matches.extend(await self.scan(item, f"{path}[{i}]"))
        elif isinstance(data, dict):
            for key, value in data.items():
                matches.extend(await self.scan(value, f"{path}.{key}" if path else key))
        return matches
