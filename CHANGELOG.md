# Changelog

## 2.0.0 (2026-06-05)

### Core
- Scanner with 50+ secret patterns (AI keys, cloud creds, SaaS tokens, DB URLs, crypto keys, PII)
- Recursive deep scan of nested objects/arrays
- Taint tracking engine (tag, propagate, untaint) with SHA-256 hash map
- Context-aware confidence scoring (config > env > log > chat)
- Aho-Corasick trie for fast keyword pre-filtering
- PatternRegistry with live update support (GitHub/S3)

### Vault
- HMAC-SHA256 cryptographic vault references (`vault:v1:{id}:{hmac}:{expiry}`)
- Pluggable adapters: InMemoryVaultAdapter, AWSSecretsAdapter
- TTL enforcement, ACL-based access control, rotation hooks

### Security
- PromptShield with 18 rules (jailbreak, exfiltration, base64, tool abuse, injection)
- AuditLogger with SHA-256 hash chain verification
- Ed25519 signing for audit entries
- PersistedAuditLogger (append-only JSONL + chain root tracking)

### Adapters
- Real SDK integrations: Chroma, Pinecone, Qdrant, Weaviate, LanceDB, Milvus
- Auto-sanitization of documents before vector DB upsert

### x402 Micropayments
- On-chain payment verification via Base (viem)
- Real transaction validation (recipient, sender, recency checks)
- Credit-based access control with 24h TTL
- USDC transfer calldata generation

### Frameworks
- LangChain Runnable wrapper (`withKeySpot`)
- Anthropic SDK wrapper (`wrapAnthropic`)
- OpenAI SDK wrapper (`wrapOpenAI`)
- OpenClaw agent wrapper
- Hermes agent wrapper

### Server
- Express server with Helmet, CORS, rate limiting
- Zod input validation
- Prometheus metrics endpoint (`/metrics`)
- OpenTelemetry-style tracing
- x402 payment gateway

### CLI & DevOps
- `keyspot scan` (recursive directory scanner)
- `keyspot scan --git` (pre-commit mode)
- `keyspot scan --prune` (auto-redact)
- `keyspot install` (pre-commit hook)
- GitHub Actions CI (Node 18/20/22)

### Python SDK
- Full parity with TypeScript: Scanner, TaintEngine, Vault, PromptShield, AuditLogger, KeySpot
- 20 pytest tests
- hatchling build configuration

### Compliance
- Ed25519 signing key generation
- Entry signing and verification
- File-based append-only audit log
- Chain root computation for tamper detection
