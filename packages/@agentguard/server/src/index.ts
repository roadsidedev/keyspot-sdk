#!/usr/bin/env node
import { createApp } from './app.js';
import { AgentGuard } from '@roadsidelab/keyspot-core';
import { X402Facilitator } from '@roadsidelab/keyspot-x402';

const PORT = parseInt(process.env.PORT || '3000', 10);

const guard = new AgentGuard({
  taintEnabled: true,
  promptShield: { enabled: true },
});

let facilitator: X402Facilitator | undefined;
const enableX402 = process.env.ENABLE_X402 === 'true';

if (enableX402 && process.env.PAY_TO_ADDRESS) {
  facilitator = new X402Facilitator({
    network: (process.env.X402_NETWORK as 'base' | 'base-sepolia') || 'base',
    payTo: process.env.PAY_TO_ADDRESS,
    pricing: { checkpoint: process.env.X402_PRICE || '0.0001' },
    rpcUrl: process.env.BASE_RPC_URL,
  });
}

const app = createApp({
  guard,
  facilitator,
  enableX402,
  trustedProxies: process.env.TRUSTED_PROXIES?.split(',').filter(Boolean) || ['loopback'],
});

app.listen(PORT, () => {
  console.log(`AgentGuard Server v2.0.0 running on port ${PORT}`);
  console.log(`  x402: ${enableX402 ? 'enabled' : 'disabled'}`);
});
