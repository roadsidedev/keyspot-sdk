import { prisma } from '../utils/prisma.js';
import { generateApiKey, getApiKeyPrefix, verifyApiKey } from '../utils/crypto.js';
import { Tier } from '@prisma/client';

const TIER_LIMITS = {
  [Tier.FREE]: {
    maxKeys: 3,
    rateLimit: 60,
    requestsPerMonth: 10_000,
    maxSecretsVaulted: 100,
  },
  [Tier.PRO]: {
    maxKeys: 25,
    rateLimit: 1000,
    requestsPerMonth: 1_000_000,
    maxSecretsVaulted: 10_000,
  },
  [Tier.ENTERPRISE]: {
    maxKeys: 100,
    rateLimit: 10000,
    requestsPerMonth: 10_000_000,
    maxSecretsVaulted: 100_000,
  },
};

export interface CreateKeyOptions {
  userId: string;
  name: string;
  scopes?: string[];
  expiresAt?: Date;
  orgId?: string;
}

export interface ApiKeyResult {
  id: string;
  prefix: string;
  name: string;
  plaintext: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

export function getTierLimits(tier: Tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS[Tier.FREE];
}

export async function createKey(options: CreateKeyOptions): Promise<ApiKeyResult> {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    include: { subscription: true },
  });

  if (!user) throw new Error('User not found');

  const tier = user.subscription?.tier || Tier.FREE;
  const limits = getTierLimits(tier);

  const existingCount = await prisma.apiKey.count({
    where: { userId: options.userId, revokedAt: null },
  });

  if (existingCount >= limits!.maxKeys) {
    throw new Error(`Max API keys (${limits!.maxKeys}) reached for tier ${tier}`);
  }

  const { plaintext, hash } = generateApiKey();
  const prefix = plaintext.split('_')[0]!;

  const key = await prisma.apiKey.create({
    data: {
      prefix,
      keyHash: hash,
      name: options.name,
      scopes: options.scopes || ['read:secrets', 'write:vault'],
      rateLimit: limits!.rateLimit,
      expiresAt: options.expiresAt || null,
      userId: options.userId,
      orgId: options.orgId || null,
    },
  });

  return {
    id: key.id,
    prefix: key.prefix,
    name: key.name,
    plaintext,
    scopes: key.scopes,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  };
}

export async function listKeys(userId: string): Promise<Omit<ApiKeyResult, 'plaintext'>[]> {
  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map((k: { id: string; prefix: string; name: string; scopes: string[]; expiresAt: Date | null; createdAt: Date; lastUsedAt: Date | null }) => ({
    id: k.id,
    prefix: k.prefix,
    name: k.name,
    scopes: k.scopes,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));
}

export async function revokeKey(keyId: string, userId: string): Promise<void> {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!key) throw new Error('API key not found');

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

export async function validateKey(plaintext: string): Promise<{
  valid: boolean;
  userId?: string;
  tier?: Tier;
  keyId?: string;
  scopes?: string[];
}> {
  const prefix = getApiKeyPrefix(plaintext);
  if (!prefix) return { valid: false };

  const keys = await prisma.apiKey.findMany({
    where: { prefix, revokedAt: null },
    include: { user: { include: { subscription: true } } },
  });

  for (const key of keys) {
    if (verifyApiKey(plaintext, key.keyHash)) {
      if (key.expiresAt && key.expiresAt < new Date()) {
        return { valid: false };
      }

      if (!key.user.subscription || key.user.subscription.status !== 'ACTIVE') {
        return { valid: false };
      }

      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        valid: true,
        userId: key.userId,
        tier: key.user.subscription.tier,
        keyId: key.id,
        scopes: key.scopes,
      };
    }
  }

  return { valid: false };
}
