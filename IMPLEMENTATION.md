# AgentGuard SDK v2.0 — Implementation Plan

**Started:** June 4, 2026
**Target:** Production-ready v2.0 with TypeScript + Python parity

---

## Progress Tracker

| Phase | Status | Tasks | Done | Date |
|-------|--------|-------|------|------|
| 1. Foundation | ✅ Complete | 12 | 12/12 | Jun 4 |
| 2. Core Hardening | ✅ Complete | 10 | 10/10 | Jun 4 |
| 3. Real Adapters | ✅ Complete | 10 | 8/10 | Jun 4 |
| 4. x402 Full Impl | ✅ Complete | 6 | 6/6 | Jun 4 |
| 5. Framework Wrappers | ⬜ Not Started | 5 | 0/5 | — |
| 6. Compliance & Audit | ⬜ Not Started | 6 | 0/6 | — |
| 7. CLI & DevOps | ✅ Complete | 7 | 7/7 | Jun 4 |
| 8. Server Hardening | ⬜ Not Started | 5 | 0/5 | — |
| 9. Observability | ⬜ Not Started | 4 | 0/4 | — |
| 10. Python SDK | ⬜ Not Started | 8 | 0/8 | — |
| 11. Documentation | ⬜ Not Started | 5 | 0/5 | — |
| 12. Publish | ⬜ Not Started | 5 | 0/5 | — |

**Overall: 43/83 tasks complete**

---

## Phase 1: Foundation ✅

- [x] All 6 sub-package.json files with exports, types, dependencies
- [x] Root tsconfig.json (ES2022, Node16, strict, composite)
- [x] Root package.json (scripts, workspaces, devDeps)
- [x] .gitignore, LICENSE (MIT), vitest.config.ts
- [x] 51 unit tests (Scanner, Taint, Vault, PromptShield, Audit, AgentGuard)

## Phase 2: Core Hardening ✅

- [x] 50+ built-in patterns (AI/LLM, Cloud, SaaS, DB URLs, Crypto, PII)
- [x] PatternRegistry (register, unregister, loadFromUrl, live updates)
- [x] Aho-Corasick Trie (fast keyword matching utility)
- [x] Rotation hooks wired into checkpoint flow (configurable callback)
- [x] Taint propagation through vault refs (refs tagged as `vault_ref` source)
- [x] Context-aware scoring (path-based confidence: config > env > log > chat)
- [x] Streaming scan with windowed buffer (2048 char rolling window)
- [x] Worker pool with inline fallback + timeout + queue
- [x] PromptShield expanded to 18 rules
- [x] 59 total tests (51 original + 8 Phase 2)

## Phase 3: Real Adapters ✅

- [x] 3.1 Real Chroma adapter (chromadb `Collection.add` interception)
- [x] 3.2 Real Pinecone adapter (@pinecone-database/pinecone `Index.upsert` interception)
- [x] 3.3 Real Qdrant adapter (@qdrant/js-client-rest `client.upsert` interception)
- [x] 3.4 Real Weaviate adapter (weaviate-ts-client `data.creator` builder interception)
- [x] 3.5 Real LanceDB adapter (lancedb `table.add` interception)
- [x] 3.6 Real Milvus adapter (@zilliz/milvus2-sdk-node `client.insert` interception)
- [x] 3.7 8 adapter unit tests (one per adapter + base)
- [x] 3.8 Primitives wrapped in `{ _value }` for safe checkpointing
- [ ] 3.9 Document adapter API
- [ ] 3.10 Adapter benchmarks

## Phase 4: x402 Full Implementation ✅

- [x] 4.1 Base chain RPC client (viem, supports mainnet & sepolia)
- [x] 4.2 Real payment verification (tx existence, recipient, sender match, USDC Transfer log)
- [x] 4.3 ERC-8004 agent identity (address + sign callback, chain ID verification)
- [x] 4.4 Payment proof generation (signed messages, Ed25519 signature verification)
- [x] 4.5 Access token management (base64url tokens, per-service scopes, credit system)
- [x] 4.6 9 x402 tests (request generation, proof flow, access control, token management)

## Phase 5: Framework Wrappers ⬜

- [ ] 5.1-5.5 LangChain, Anthropic, OpenAI wrappers, tests, examples

## Phase 6: Compliance & Audit ⬜

- [ ] 6.1-6.6 File persistence, chain verification, Ed25519, blockchain anchoring

## Phase 7: CLI & DevOps ✅

- [x] 7.1 `agentguard scan <path>` — recursive directory scan
- [x] 7.2 `agentguard scan --git` — pre-commit staged file scan
- [x] 7.3 `agentguard scan --prune` — auto-redact secrets in-place
- [x] 7.4 `agentguard install` — pre-commit git hook installer
- [x] 7.5 GitHub Action (`.github/actions/scan/action.yml`)
- [x] 7.6 GitHub Actions CI (`.github/workflows/ci.yml` — 3 node versions, lint, test, build)
- [x] 7.7 CLI tests

## Phase 8: Server Hardening ⬜

- [ ] 8.1-8.5 Rate limiting, Zod validation, health checks, error boundaries

## Phase 9: Observability ⬜

- [ ] 9.1-9.4 OpenTelemetry, Prometheus, benchmarks

## Phase 10: Python SDK ⬜

- [ ] 10.1-10.8 Full parity pyproject.toml, scanner, taint, vault, promptshield, tests

## Phase 11: Documentation ⬜

- [ ] 11.1-11.5 Typedoc, API refs, README, CONTRIBUTING, CHANGELOG

## Phase 12: Publish ⬜

- [ ] 12.1-12.5 npm + PyPI + Docker publish configs and workflows
