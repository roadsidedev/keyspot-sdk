# AgentGuard SDK v2.0

**Runtime security layer for autonomous AI agents.**

AgentGuard is the middleware that enforces the **Checkpoint → Scan → Taint → Vault → Replace → Continue** lifecycle at every critical boundary.

## Features (v2.0 P0)

- **Taint Tracking Engine**: Propagate security tags from raw secrets to derived content (summaries, embeddings).
- **Cryptographic Vault References**: Signed, short-lived references that replace raw secrets in agent memory.
- **Vector Store Adapters**: Seamless integration with Chroma, Pinecone, and Qdrant to ensure zero secrets in permanent memory.
- **PromptShield**: Real-time detection of prompt injection and data exfiltration attempts.
- **Tamper-Evident Audit Logs**: Hash-chained logs for compliance and auditability.
- **Ephemeral Core Hardening**: Isolated scanning and pruning via worker pools.

## Installation

```bash
pnpm add @agentguard/core @agentguard/vault
```

## Quick Start

```typescript
import { AgentGuard } from '@agentguard/core';
import { QdrantAdapter } from '@agentguard/adapters';

const guard = new AgentGuard({
  taintEnabled: true,
  promptShield: { enabled: true },
  vectorStores: [new QdrantAdapter(qdrantClient)]
});

// Wrap agent calls
const result = await guard.wrap(async (state) => {
  // Your agent logic here
  return { ...state, output: "Sensitive data sk-..." };
}, initialState);

// Manual checkpoint
const cleanState = await guard.checkpoint(agentState);
```

## Architecture

AgentGuard operates as a monorepo:

- `@agentguard/core`: Detection, Taint, and Security logic.
- `@agentguard/vault`: Pluggable secret storage adapters.
- `@agentguard/patterns`: Extensible secret detection patterns.
- `@agentguard/adapters`: Framework and Vector Store bridges.

## License

MIT - Free for self-hosting. Hosted tier via x402 payments.
