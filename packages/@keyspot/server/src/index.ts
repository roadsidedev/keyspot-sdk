#!/usr/bin/env node
import { createApp } from './app.js';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { X402Facilitator } from './payments/index.js';
import { prisma } from './utils/prisma.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// ── Validate critical environment variables ──

const REQUIRED_ENV = ['JWT_SECRET', 'MIGRATION_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.ENABLE_X402 === 'true' && !process.env.X402_JWT_SECRET) {
  console.error('[Config] X402_JWT_SECRET is required when ENABLE_X402=true');
  process.exit(1);
}

const VALID_NETWORKS = ['base', 'base-sepolia'];
const x402Network = (process.env.X402_NETWORK || 'base') as string;
if (!VALID_NETWORKS.includes(x402Network)) {
  console.error(`[Config] Invalid X402_NETWORK: "${x402Network}". Must be one of: ${VALID_NETWORKS.join(', ')}`);
  process.exit(1);
}

// ── Create guard and facilitator ──

const guard = new KeySpot({
  taintEnabled: true,
  promptShield: { enabled: true },
});

let facilitator: X402Facilitator | undefined;
const enableX402 = process.env.ENABLE_X402 === 'true';

if (enableX402 && process.env.PAY_TO_ADDRESS) {
  facilitator = new X402Facilitator({
    network: x402Network as 'base' | 'base-sepolia',
    payTo: process.env.PAY_TO_ADDRESS,
    pricing: { checkpoint: process.env.X402_PRICE || '0.0001' },
    rpcUrl: process.env.BASE_RPC_URL,
  });
}

// ── Create Express app ──

const app = createApp({
  guard,
  facilitator,
  enableX402,
  trustedProxies: process.env.TRUSTED_PROXIES?.split(',').filter(Boolean) || ['loopback'],
});

// ── Startup ──

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');
  } catch (err) {
    console.error('[DB] Database connection failed:', err instanceof Error ? err.message : err);
    if (isProduction) {
      process.exit(1);
    }
    console.warn('[DB] Running without persistence (development mode)');
  }

  try {
    await connectRedis();
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Not available — running without cache');
  }

  app.listen(PORT, () => {
    console.log(`KeySpot Server v2.2.0 running on port ${PORT}`);
    console.log(`  Mode: ${enableX402 ? 'hybrid (x402 + subscription)' : 'self-hosted'}`);
    console.log(`  Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`  x402: ${enableX402 ? 'enabled' : 'disabled'}`);
    console.log(`  Database: connected`);
    console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'not configured'}`);
  });
}

start().catch(console.error);

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});