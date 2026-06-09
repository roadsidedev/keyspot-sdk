# KeySpot SDK — Agent Security Skill

Runtime security layer for AI agents. Detects, vaults, and redacts secrets (API keys, cloud creds, crypto keys, DB strings, PII) from agent memory, tool call outputs, and LLM responses.

**Triggers:** "secure my agent", "protect memory", "vault secrets", "add keyspot", "prevent secret leak", "agent security", "scan for keys", "guard agent", "keyspot"

---

## Quick Start

```bash
npm install @roadsidelab/keyspot-sdk
```

### One-line auto-detect (works with any framework)

```ts
import { guardAgent } from '@roadsidelab/keyspot-sdk/agent';

const { agent: guarded, guard } = guardAgent(myAgent);
// guarded behaves identically — secrets are auto-vaulted
```

The `guardAgent()` function detects the agent framework from the object shape:
- `messages.create` → Anthropic SDK
- `chat.completions.create` → OpenAI SDK
- `.invoke()` → LangChain Runnable
- `.run()` → OpenClaw / Hermes

---

## Per-Framework Integration

### Anthropic SDK

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { wrapAnthropic } from '@roadsidelab/keyspot-sdk/frameworks';

const guard = new KeySpot();
const guarded = wrapAnthropic(anthropic, guard);
const msg = await guarded.messages.create({ ... });
```

### OpenAI SDK

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { wrapOpenAI } from '@roadsidelab/keyspot-sdk/frameworks';

const guard = new KeySpot();
const guarded = wrapOpenAI(openai, guard);
const completion = await guarded.chat.completions.create({ ... });
```

### LangChain

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { withKeySpot } from '@roadsidelab/keyspot-sdk/frameworks';

const guard = new KeySpot();
const guarded = withKeySpot(chain, guard);
const result = await guarded.invoke({ input: '...' });
```

### OpenClaw

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { wrapOpenClawAgent } from '@roadsidelab/keyspot-sdk/frameworks';

const guard = new KeySpot();
const guarded = wrapOpenClawAgent(agent, guard);
const result = await guarded.run("deploy", { branch: "main" });
```

### Hermes

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { wrapHermesAgent } from '@roadsidelab/keyspot-sdk/frameworks';

const guard = new KeySpot();
const guarded = wrapHermesAgent(agent, guard);
const result = await guarded.run({ task: "audit repo" });
```

### Generic (checkpoint any state)

```ts
import { KeySpot } from '@roadsidelab/keyspot-sdk';

const guard = new KeySpot();
const clean = await guard.checkpoint({ key: 'sk-abc...' });
const safe = await guard.wrap(async (state) => {
  return await myFunction(state);
}, initialState);
```

---

## CLI — Scan Files & Pre-commit Hooks

```bash
# Scan a directory for secrets
keyspot scan ./src

# Scan with auto-redact
keyspot scan ./config --prune

# Git-aware scan (only staged changes)
keyspot scan --git

# JSON output for CI
keyspot scan ./src --json

# Install pre-commit hook
keyspot install
```

Exit code 1 if secrets found (without `--prune`). Exit 0 after redacting.

---

## Configuration

```ts
const guard = new KeySpot({
  taintEnabled: true,           // Track derived secrets (summaries, embeddings)
  pruneStrategy: 'vault_with_taint', // 'redact' | 'remove' | 'replace'
  promptShield: { enabled: true },   // Jailbreak detection
  vault: new AWSSecretsAdapter({ region: 'us-east-1' }),
  onSecretFound: async (match) => console.log(`Found ${match.type}`),
  checkpointTriggers: new Set(['SCAN', 'VAULT_WRITE']),
});
```

### Vault Adapters

| Adapter | Import |
|---------|--------|
| InMemory (default) | built-in |
| AWS Secrets Manager | `new AWSSecretsAdapter({ region })` |

### Prune Strategies

| Strategy | Behavior |
|----------|----------|
| `VAULT_WITH_TAINT` (default) | Replace with HMAC-signed reference token |
| `REDACT` | Replace with `[REDACTED]` |
| `REMOVE` | Delete the field |
| `REPLACE` | Replace with custom placeholder |

---

## How It Works

```
Agent State → KeySpot.checkpoint()
  ├─ Scan: 40+ patterns (API keys, cloud creds, crypto, PII)
  ├─ Vault: store secret, get HMAC-signed ref token
  ├─ Taint: tag derived values so they're caught too
  ├─ Replace: swap secret for "vault:v1:{id}:{hmac}:{ts}"
  └─ Return: clean state
```

- **Streaming scan**: 2048-char rolling window catches cross-chunk secrets
- **Contextual confidence**: config/secret paths boosted, chat/memory paths penalized
- **Audit log**: SHA-256 hash-chained, Ed25519-signed, never stores plaintext

---

## Share with Any AI Coding Agent

```bash
# Claude Code
claude add skill https://raw.githubusercontent.com/roadsidedev/keyspot-sdk/main/SKILL.md

# Opencode
opencode skill add https://raw.githubusercontent.com/roadsidedev/keyspot-sdk/main/SKILL.md

# Cursor
# Save to .cursor/skills/keyspot-sdk.md

# Or point to the local file:
# /path/to/keyspot-sdk/SKILL.md
```
