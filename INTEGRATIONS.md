# KeySpot Runtime Integrations

KeySpot is designed to be runtime-agnostic. Below are guides for integrating with popular agent frameworks.

## 1. Manus Integration
Manus agents can use KeySpot as a middleware in their `agent-loop`.

```typescript
import { KeySpot } from '@roadsidelab/keyspot-sdk';

const guard = new KeySpot();

// Inside Manus agent loop
async function manusLoop(state) {
  // 1. Validate Prompt
  const { blocked } = await guard.validatePrompt(state.nextPrompt);
  if (blocked) throw new Error("Security Policy Violation");

  // 2. Execute Agent Logic
  const result = await myManusAgent.think(state);

  // 3. Checkpoint & Prune
  const safeState = await guard.checkpoint(result);
  return safeState;
}
```

## 2. OpenClaw / Hermes
For open-source runtimes, use the `guard.wrap` method to intercept tool outputs.

```typescript
import { KeySpot } from '@roadsidelab/keyspot-sdk';

const guard = new KeySpot({
  vault: new AWSSecretsAdapter({ region: 'us-east-1' })
});

// Intercept tool calls
const safeTool = guard.wrap(async (args) => {
  return await originalTool.call(args);
});
```

## 3. Claude Code / CLI Agents
Integrate via the CLI or as a pre-push hook for persistent memory.

```bash
# Scan agent memory before persisting to disk
keyspot scan --path ./agent_memory.json --prune
```

## 4. x402 Hosted Usage
If using the hosted version, ensure your agent carries an ERC-8004 identity.

```typescript
const guard = new KeySpot({
  hosted: {
    enabled: true,
    agentWalletAddress: "0xAgent...",
    facilitatorUrl: "https://api.keyspot.dev"
  }
});
```
