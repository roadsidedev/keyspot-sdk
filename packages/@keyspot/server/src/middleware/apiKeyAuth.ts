import { Request, Response, NextFunction } from 'express';
import { validateKey, getTierLimits } from '../services/apiKey.js';
import { getRedis } from '../utils/redis.js';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ks_')) {
    res.status(401).json({ error: 'API key required. Use: Authorization: Bearer ks_<your-key>' });
    return;
  }

  const plaintext = authHeader.replace('Bearer ', '');
  const result = await validateKey(plaintext);

  if (!result.valid) {
    res.status(401).json({ error: 'Invalid or expired API key' });
    return;
  }

  const limits = getTierLimits(result.tier || 'FREE' as any);

  try {
    const redis = getRedis();
    const key = `ratelimit:${result.keyId}:${Math.floor(Date.now() / 60000)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);

    if (count > limits.rateLimit) {
      res.status(429).json({ error: 'Rate limit exceeded', limit: limits.rateLimit });
      return;
    }
  } catch {
    // Redis unavailable — skip rate limiting
  }

  req.user = {
    id: result.userId!,
    email: '',
    role: 'USER',
    subscriptionTier: result.tier || 'FREE',
    subscriptionStatus: 'ACTIVE',
  };

  req.apiKeyInfo = { keyId: result.keyId!, scopes: result.scopes! };
  next();
}

declare global {
  namespace Express {
    interface Request {
      apiKeyInfo?: { keyId: string; scopes: string[] };
    }
  }
}
