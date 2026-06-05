# Contributing to AgentGuard

## Development Setup

```bash
pnpm install
pnpm run build
pnpm run test
```

## Project Structure

```
packages/@agentguard/
├── core/          Scanner, TaintEngine, AuditLogger, PromptShield, WorkerPool, Telemetry
├── patterns/      50+ built-in patterns + Aho-Corasick trie + PatternRegistry
├── vault/         InMemoryVaultAdapter, AWSSecretsAdapter, HMAC refs
├── adapters/      Chroma, Pinecone, Qdrant, Weaviate, LanceDB, Milvus
├── x402/          Payment facilitator, client, Base chain verification
├── server/        Express server, rate limiting, metrics, health checks
├── frameworks/    LangChain, Anthropic, OpenAI, OpenClaw, Hermes wrappers
├── cli/           agentguard scan, install, --git, --prune
python/            Python SDK (full TypeScript parity)
tests/             Vitest test suite
```

## Coding Standards

- TypeScript with strict mode, Node16 module resolution
- No runtime dependencies for core (zero-dependency scanner/taint)
- Async API throughout (`async scan()`, `async checkpoint()`)
- Each package has its own `package.json` with `exports` field
- Tests go in `/tests/` with `.test.ts` extension

## Testing

```bash
pnpm run test           # Run all TS tests
pnpm run test:watch     # Watch mode
cd python && pytest     # Run Python tests
```

## Building

```bash
pnpm run build           # Build all packages
pnpm --filter @agentguard/core run build   # Build single package
```

## Pull Request Checklist

- [ ] Code compiles (`pnpm run build`)
- [ ] Tests pass (`pnpm run test`)
- [ ] New features include tests
- [ ] Patterns added to both TypeScript and Python SDKs
- [ ] CHANGELOG.md updated

## Package Publishing

```bash
pnpm publish -r --access public   # Publish all npm packages
cd python && python -m build      # Build Python wheel
```
