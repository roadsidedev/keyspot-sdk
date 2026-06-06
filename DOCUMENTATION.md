# KeySpot SDK — Developer Documentation

> **Runtime credential hygiene for autonomous AI agents.**
> Open source · MIT License · Node 18+ · TypeScript 5+

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Installation](#2-installation)
- [3. Quick Start](#3-quick-start)
- [4. Core Concepts](#4-core-concepts)
- [5. API Reference](#5-keyspot-client--api-reference)
- [6. Scanner](#6-scanner)
- [7. Taint Engine](#7-taint-engine)
- [8. PromptShield](#8-promptshield)
- [9. Checkpoint System](#9-checkpoint-system)
- [10. Vault Adapters](#10-vault-adapters)
- [11. Audit Logger](#11-audit-logger)
- [12. Framework Integrations](#12-framework-integrations)
- [13. Vector Store Adapters](#13-vector-store-adapters)
- [14. CLI](#14-cli)
- [15. Pricing & Deployment](#15-pricing--deployment)
- [16. Security Architecture](#16-ephemeral-core--security-architecture)
- [17. Threat Model](#17-threat-model)
- [18. Responsible Disclosure](#18-responsible-disclosure)
- [19. Resources](#19-resources)

---

## 1. Introduction

KeySpot SDK is an open-source security middleware for multi-agent AI systems. It automatically detects, prunes, and vaults exposed credentials — API keys, private keys, seed phrases, database URLs — from agent memory at every critical boundary.

**Core principle:** An agent should never hold a secret longer than it needs to.

### How it works

```
1. Checkpoint fires    → At a session boundary, memory save, or tool call
2. Isolated scan       → Fresh Worker thread scans state against 50+ patterns
3. Vault write         → Every matched secret is written to your vault adapter
4. State sanitised     → Clean state returned; Worker terminates immediately
5. Audit logged        → Outcome only: SUCCESS / FAILED / ERROR — nothing else
```

### What KeySpot SDK catches

| Category | Examples |
|----------|----------|
| Crypto private keys | Ethereum/EVM keys, Solana keypairs, Bitcoin WIF, BIP-32 xpriv |
| Seed phrases | BIP-39 (12 and 24 word), with entropy validation |
| AI provider keys | OpenAI, Anthropic, HuggingFace |
| Cloud credentials | AWS access keys, GCP service accounts, Azure client secrets |
| Source control | GitHub (classic, fine-grained, OAuth), GitLab PATs, npm tokens |
| Payment processors | Stripe secret + restricted keys |
| Databases | PostgreSQL, MySQL, MongoDB, Redis connection strings |
| Certificates | PEM private keys (RSA, EC, Ed25519, OpenSSH) |
| Auth tokens | JWTs, Bearer tokens, generic high-entropy tokens |
| Tainted derivations | Summaries or embeddings derived from any of the above |

---

## 2. Installation

KeySpot SDK is published as scoped packages under `@roadsidelab`. Install only what you need.

### Minimum install

For most use cases you only need the core package and a vault adapter:

```bash
# pnpm
pnpm add @roadsidelab/keyspot-core @roadsidelab/keyspot-vault

# npm
npm install @roadsidelab/keyspot-core @roadsidelab/keyspot-vault

# yarn
yarn add @roadsidelab/keyspot-core @roadsidelab/keyspot-vault
```

### Full install

```bash
pnpm add @roadsidelab/keyspot-core @roadsidelab/keyspot-vault @roadsidelab/keyspot-adapters @roadsidelab/keyspot-x402 @roadsidelab/keyspot-server
pnpm add -D @roadsidelab/keyspot-cli
```

### Package overview

| Package | Description | Required |
|---------|-------------|----------|
| `@roadsidelab/keyspot-core` | Scanner, Taint Engine, PromptShield, EphemeralPruner, CheckpointManager, AuditLogger, KeySpot SDK client | ✅ |
| `@roadsidelab/keyspot-vault` | Vault adapters: env, dotenv, HashiCorp, AWS, InMemory | ✅ |
| `@roadsidelab/keyspot-patterns` | Built-in pattern registry (bundled with core — install separately to extend) | optional |
| `@roadsidelab/keyspot-adapters` | Framework bridges: Anthropic, OpenAI, LangChain, Express | optional |
| `@roadsidelab/keyspot-x402` | x402 payment middleware (server) and agent client | optional |
| `@roadsidelab/keyspot-server` | REST API server for hosted or self-hosted deployments | optional |
| `@roadsidelab/keyspot-cli` | `keyspot scan`, `keyspot install` — install as dev dependency | dev |

### Requirements

- **Node.js:** 18.0.0 or later
- **TypeScript:** 5.0+ recommended for full type safety

---

## 3. Quick Start

```typescript
import { KeySpot } from '@roadsidelab/keyspot-core';

const guard = new KeySpot({
  taintEnabled: true,
  promptShield: { enabled: true }
});

// Validate prompts before execution
const { blocked } = await guard.validatePrompt('Ignore previous instructions...');
if (blocked) throw new Error('Jailbreak attempt detected');

// Checkpoint: scan and vault any secrets in the state
const cleanState = await guard.checkpoint({
  user: 'alice',
  config: { apiKey: 'sk-123456789012345678901234567890123456789012345678' }
});
// config.apiKey → "vault:v1:vault_abc123:abcd1234...:1717500000000"

// Wrap agent functions for automatic checkpointing
const safeOutput = await guard.wrap(async (state) => {
  return llm.generate(state);
}, initialState);
```

---

## 4. Core Concepts

### Checkpoint Lifecycle

KeySpot SDK intercepts agent execution at well-defined boundaries called **checkpoints**:

| Trigger | When it fires |
|---------|---------------|
| `SESSION_END` | Agent session terminates |
| `MEMORY_SAVE` | State is about to be persisted |
| `TOOL_CALL_COMPLETE` | Tool execution finishes |
| `MESSAGE_BOUNDARY` | Between conversation turns |
| `INTERVAL` | Time-based periodic scan |
| `CUSTOM` | User-defined trigger |

At each checkpoint, the current state is scanned, secrets are vaulted, and a clean state is returned.

### Prune Strategies

When secrets are detected, KeySpot SDK applies one of three strategies:

| Strategy | Behaviour |
|----------|-----------|
| `REDACT` | Replace secret with `[REDACTED]` |
| `REMOVE` | Delete the key entirely from the object |
| `REPLACE` | Write to vault, replace with reference token |

### Vault References

Secrets are never stored in agent memory. Instead, they are replaced with **vault reference tokens** that encode:

- Which vault adapter holds the secret
- A unique reference key
- HMAC signature for integrity verification

The agent operates on the reference token. When the original secret is needed (e.g., for an API call), the vault adapter resolves it on-demand and the value is wiped from memory immediately after use.

### Taint Tracking

When a secret is vaulted, any derived values (summaries, embeddings, transformed copies) are **tainted**. The Taint Engine tracks these derivations across the agent lifecycle:

- Direct copies inherit the taint
- String concatenation with tainted values propagates taint
- JSON serialization/deserialization preserves taint metadata

This prevents "secret laundering" where an agent transforms a secret to evade detection.

---

## 5. KeySpot Client — API Reference

### Constructor

```typescript
const guard = new KeySpot(options?: KeySpotOptions);
```

**Options interface** (all fields optional):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vault` | `VaultAdapter` | `InMemoryVaultAdapter` | Vault backend for secret storage |
| `prune.strategy` | `'REDACT' \| 'REMOVE' \| 'REPLACE'` | `'REDACT'` | How to handle detected secrets |
| `prune.redactWith` | `string` | `'[REDACTED]'` | Replacement string for REDACT strategy |
| `prune.isolate` | `boolean` | `true` | Run scans in isolated worker threads |
| `prune.workerTimeoutMs` | `number` | `5000` | Timeout for worker thread execution |
| `taintEnabled` | `boolean` | `false` | Enable taint tracking for derived secrets |
| `promptShield.enabled` | `boolean` | `false` | Enable PromptShield jailbreak detection |
| `promptShield.rules` | `string[]` | `undefined` | Specific rule IDs to enable (all if omitted) |
| `checkpoints` | `CheckpointDefinition[]` | `[]` | Custom checkpoint triggers |
| `onPruneComplete` | `(result: PruneResult) => void` | `undefined` | Callback after each prune cycle |

### Methods

#### `checkpoint(state)`

```typescript
async checkpoint<T>(state: T): Promise<T>
```

Scans the provided state object, vaults any detected secrets, and returns a clean copy. This is the primary entry point for most integrations.

```typescript
const clean = await guard.checkpoint(agentMemory);
```

#### `wrap(fn, state?)`

```typescript
async wrap<T, R>(
  fn: (state: T) => Promise<R> | R,
  state?: T
): Promise<R>
```

Wraps an async function. If `state` is provided, it is checkpointed before `fn` executes. The return value of `fn` is also checkpointed before being returned.

```typescript
const result = await guard.wrap(async (state) => {
  return await myAgent.run(state);
}, initialState);
```

#### `scan(input)`

```typescript
async scan(input: unknown): Promise<ScanResult>
```

Runs the scanner against arbitrary input without checkpointing or pruning. Useful for inspection or testing.

#### `validatePrompt(prompt)`

```typescript
async validatePrompt(prompt: string): Promise<PromptShieldResult>
```

Runs PromptShield rules against a user prompt. Returns `{ blocked: boolean, findings: string[] }`.

#### `getTaintEngine()`

```typescript
getTaintEngine(): TaintEngine
```

Returns the active `TaintEngine` instance for manual taint operations.

```typescript
const taint = guard.getTaintEngine();
taint.tag('derived from secret', 'ref_abc123', 'manual');
```

---

## 6. Scanner

The Scanner is the core detection engine. It uses:

- **Regex patterns** for structured secrets (API keys, connection strings)
- **Entropy analysis** for high-randomness tokens
- **Aho-Corasick Trie** for fast multi-pattern keyword matching
- **Context-aware path scoring** (higher confidence for `config.*`, `env.*`, `secrets.*` paths)

### Streaming Scan

For large inputs, the scanner uses a **2048-character rolling window** to detect secrets that span chunk boundaries without loading entire files into memory.

### Pattern Registry

```typescript
import { PatternRegistry } from '@roadsidelab/keyspot-patterns';

const registry = PatternRegistry.createDefault();

// Register a custom pattern
registry.register({
  id: 'my_custom_token',
  name: 'My Service Token',
  type: 'api_key',
  severity: 'high',
  pattern: /my_[a-z0-9]{32}/,
  minEntropy: 3.5
});

// Load patterns from remote URL (live updates supported)
await registry.loadFromUrl('https://cdn.example.com/patterns.json');
```

**Built-in categories** (50+ patterns):

- AI/LLM provider keys
- Cloud credentials (AWS, GCP, Azure)
- Database connection strings
- Crypto keys and seed phrases
- Source control tokens
- Payment processor keys
- Generic high-entropy tokens

---

## 7. Taint Engine

When `taintEnabled: true`, the Taint Engine tracks secrets that have been transformed:

```typescript
const taint = guard.getTaintEngine();

// Tag a derived value
taint.tag('summary of sk-123', 'sec_abc123', 'manual');

// Later, when this value appears in state, it is caught
const clean = await guard.checkpoint({
  summary: 'summary of sk-123'  // ← tainted, will be vaulted
});
```

**Propagation rules:**

| Operation | Taint behaviour |
|-----------|-----------------|
| Direct assignment | Taint preserved |
| String concatenation | Result is tainted if any operand is tainted |
| JSON.parse/stringify | Taint metadata survives round-trip |
| Object spread | Nested tainted values remain tainted |

---

## 8. PromptShield

PromptShield detects jailbreak attempts and policy violations before prompts reach the LLM.

```typescript
const guard = new KeySpot({
  promptShield: { enabled: true }
});

const result = await guard.validatePrompt(userInput);
// { blocked: true, findings: ['jailbreak_attempt'] }
```

**Rule categories** (18 total rules):

- Instruction override attempts
- Role-play jailbreaks
- System prompt extraction
- Tool abuse patterns
- Encoding/escaping attacks

To enable a subset of rules:

```typescript
promptShield: {
  enabled: true,
  rules: ['jailbreak_attempt', 'system_extraction']
}
```

---

## 9. Checkpoint System

Checkpoints are the integration points where KeySpot SDK intercepts agent state.

### Built-in Triggers

| Name | Description |
|------|-------------|
| `SESSION_END` | End of agent session |
| `MEMORY_SAVE` | Before state persistence |
| `TOOL_CALL_COMPLETE` | After tool execution |
| `MESSAGE_BOUNDARY` | Between conversation turns |

### Custom Checkpoints

```typescript
const guard = new KeySpot({
  checkpoints: [
    { name: 'CUSTOM_EVENT', intercept: myCustomHook },
    { name: 'INTERVAL', intervalMs: 30000 }
  ]
});
```

### Interval Checkpoints

Time-based checkpoints run on a schedule:

```typescript
guard.checkpoints.startIntervals(
  () => currentAgentState,
  (cleanState) => { currentAgentState = cleanState; }
);

// Later...
guard.checkpoints.stopIntervals();
```

---

## 10. Vault Adapters

Vault adapters provide the storage backend for secrets.

### In-Memory (default)

```typescript
import { InMemoryVaultAdapter } from '@roadsidelab/keyspot-vault';

const vault = new InMemoryVaultAdapter();
const guard = new KeySpot({ vault });
```

### Environment Variables

```typescript
import { EnvVaultAdapter } from '@roadsidelab/keyspot-vault';

const vault = new EnvVaultAdapter();
```

### .env Files

```typescript
import { DotEnvVaultAdapter } from '@roadsidelab/keyspot-vault';

const vault = new DotEnvVaultAdapter({
  path: '.env.secure',
  checkGitignore: true
});
```

### HashiCorp Vault

```typescript
import { HashiCorpVaultAdapter } from '@roadsidelab/keyspot-vault';

const vault = new HashiCorpVaultAdapter({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN,
  mountPath: 'secret',
  namespace: 'keyspot'
});
```

### AWS Secrets Manager

```typescript
import { AWSSecretsAdapter } from '@roadsidelab/keyspot-vault';

const vault = new AWSSecretsAdapter({
  region: 'us-east-1',
  prefix: 'keyspot/',
  tags: { Environment: 'production' }
});
```

### Vector Store Adapters

Vector store adapters intercept write operations to automatically vault secrets before they reach the database:

| Store | Intercepted Method |
|-------|-------------------|
| Chroma | `Collection.add` |
| Pinecone | `Index.upsert` |
| Qdrant | `client.upsert` |
| Weaviate | `data.creator` |
| LanceDB | `table.add` |
| Milvus | `client.insert` |

```typescript
import { PineconeAdapter } from '@roadsidelab/keyspot-adapters/pinecone';

const adapter = new PineconeAdapter(guard);
const safeIndex = adapter.wrap(pineconeIndex);
await safeIndex.upsert(records); // secrets vaulted automatically
```

---

## 11. Audit Logger

The Audit Logger records checkpoint outcomes without storing sensitive data.

### Console Logger (default)

```typescript
const guard = new KeySpot({
  audit: { console: true }
});
```

### File Logger

```typescript
import { FileAuditLogger } from '@roadsidelab/keyspot-core';

const logger = new FileAuditLogger({
  logDir: './logs',
  schema: 'OUTCOME_ONLY'
});

const guard = new KeySpot({
  audit: { logger }
});
```

### Webhook Logger

```typescript
const guard = new KeySpot({
  audit: {
    webhookUrl: 'https://audit.example.com/hook',
    webhookSecret: process.env.AUDIT_SECRET
  }
});
```

Audit entries include: timestamp, checkpoint trigger, outcome (SUCCESS/FAILED/ERROR), match count, and a hash chain for tamper detection.

---

## 12. Framework Integrations

### LangChain

```typescript
import { withKeySpot } from '@roadsidelab/keyspot-frameworks';
import { guard } from './guard';

const guardedChain = withKeySpot(myChain, guard);
const result = await guardedChain.invoke({ input: '...' });
```

### Anthropic

```typescript
import { wrapAnthropic } from '@roadsidelab/keyspot-frameworks/anthropic';

const guarded = wrapAnthropic(anthropic, guard);
const msg = await guarded.messages.create({ ... });
```

### OpenAI

```typescript
import { wrapOpenAI } from '@roadsidelab/keyspot-frameworks/openai';

const guarded = wrapOpenAI(openai, guard);
const completion = await guarded.chat.completions.create({ ... });
```

### OpenClaw / Hermes

```typescript
import { wrapOpenClawAgent, wrapHermesAgent } from '@roadsidelab/keyspot-frameworks';

const safeOpenClaw = wrapOpenClawAgent(myAgent, guard);
const safeHermes = wrapHermesAgent(myHermesAgent, guard);
```

### Manus

```typescript
// Inside Manus agent loop
const { blocked } = await guard.validatePrompt(state.nextPrompt);
if (blocked) throw new Error('Security Policy Violation');

const result = await myManusAgent.think(state);
const safeState = await guard.checkpoint(result);
return safeState;
```

### Claude Code / CLI Agents

```bash
keyspot scan --path ./agent_memory.json --prune
```

---

## 13. Vector Store Adapters

See [Vault Adapters](#10-vault-adapters) for the list of supported stores and interception points.

All adapters follow the same pattern:

```typescript
const adapter = new StoreAdapter(guard);
const safeStore = adapter.wrap(storeInstance);
await safeStore.writeOperation(data); // secrets vaulted before write
```

---

## 14. CLI

### Installation

```bash
pnpm add -D @roadsidelab/keyspot-cli
```

### Commands

```bash
# Scan directory for secrets (positional path)
keyspot scan ./src

# Scan with explicit --path flag
keyspot scan --path ./src

# Auto-redact secrets in place
keyspot scan ./config --prune

# JSON output for CI
keyspot scan ./src --json

# Git-aware scan (only files changed in last commit)
keyspot scan --git

# Install pre-commit hook
keyspot install
```

### GitHub Actions

```yaml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm exec keyspot scan ./src --prune
```

---

## 15. Pricing & Deployment

### Self-Hosted (Docker)

```bash
docker build -t keyspot .
docker run -p 3000:3000 keyspot
```

### x402 Micropayments (Hosted)

For usage-based billing on Base chain:

```typescript
const guard = new KeySpot({
  hosted: {
    enabled: true,
    agentWalletAddress: '0xAgent...',
    facilitatorUrl: 'https://api.keyspot.dev'
  }
});
```

The x402 flow:

1. Agent requests a checkpoint
2. Server returns a payment request (USDC on Base)
3. Agent submits payment txHash
4. Server verifies on-chain (recipient, amount, ERC-8004 identity)
5. Access token issued for subsequent requests

**Requirements:**

- viem for Base RPC
- ERC-8004 compliant agent identity
- USDC payment verification via Transfer event logs

---

## 16. Security Architecture

### Worker Pool Isolation

Scans run in a pool of Node.js worker threads with:

- Automatic timeout enforcement
- Queue for concurrent requests
- Inline fallback when workers unavailable

This ensures that even if a scan encounters malformed input or an attacker-controlled payload, the main agent thread remains isolated.

### Streaming Buffer

Large inputs are processed with a 2048-character rolling window, preventing memory exhaustion and enabling partial secret detection across chunk boundaries.

### Buffer Zeroing

After each scan, worker memory buffers are explicitly zeroed before the thread is returned to the pool, reducing the window for cold-boot or memory-dump attacks.

---

## 17. Threat Model

| Threat | Mitigation |
|--------|------------|
| Secrets in agent memory | Vault + reference tokens at every checkpoint |
| Prompt injection / jailbreaks | PromptShield (18 rules) |
| Derived secret laundering | Taint propagation tracking |
| Worker thread compromise | Process isolation + timeout + zeroing |
| Audit log tampering | Hash chaining + Ed25519 signatures |
| Supply chain (patterns) | `PatternRegistry.loadFromUrl` with integrity checks |
| Partial streaming coverage | 2048-char window covers cross-chunk secrets |

---

## 18. Responsible Disclosure

We take security seriously. If you discover a vulnerability:

- **Email:** security@keyspot.dev
- **PGP:** Available at `https://keyspot.dev/.well-known/pgp-key.txt`

**Response timeline:**

- Acknowledgement within 48 hours
- Initial assessment within 7 days
- Public disclosure coordinated after patch release

We offer a bug bounty for critical findings that demonstrate real-world impact on agent deployments.

---

## 19. Resources

### API Reference

For complete TypeScript type definitions and method signatures, see the generated TypeDoc output:

- **TypeDoc:** `docs/api/index.html`
- **Generate:** `pnpm docs`
- **Serve locally:** `pnpm docs:serve`
- **Primary entry point:** `packages/@roadsidelab/keyspot-core/src/index.ts`

### Source Code

- **Core implementation:** `packages/@roadsidelab/keyspot-core/src/`
- **Vault adapters:** `packages/@roadsidelab/keyspot-vault/src/`
- **Framework wrappers:** `packages/@roadsidelab/keyspot-frameworks/src/`
- **CLI:** `packages/@roadsidelab/keyspot-cli/src/`

### Additional Documentation

- `README.md` — Project overview and quick examples
- `INTEGRATIONS.md` — Detailed integration guides (Manus, OpenClaw, Claude Code)
- `IMPLEMENTATION.md` — Internal architecture and phase status
- `CONTRIBUTING.md` — Development setup and contribution guidelines

---

**Last verified against source:** June 5, 2026
**Test count:** 59 passing
**License:** MIT
