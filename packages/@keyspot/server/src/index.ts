#!/usr/bin/env node
import { createApp } from './app.js';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { X402Facilitator } from './payments/index.js';
import { prisma } from './utils/prisma.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const guard = new KeySpot({
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

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');

    await connectRedis();
  } catch (err) {
    console.warn('[DB] Database not available — running without persistence');
  }

  app.listen(PORT, () => {
    console.log(`KeySpot Server v2.1.0 running on port ${PORT}`);
    console.log(`  x402: ${enableX402 ? 'enabled' : 'disabled'}`);
    console.log(`  Auth: ${process.env.JWT_SECRET ? 'enabled' : 'disabled (dev mode)'}`);
    console.log(`  Stripe: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured'}`);
  });
}

start().catch(console.error);

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});
