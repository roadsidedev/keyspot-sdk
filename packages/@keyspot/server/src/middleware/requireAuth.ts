import { Request, Response, NextFunction } from 'express';
import { jwtVerify, type JWTPayload } from 'jose';
import { prisma } from '../utils/prisma.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production');

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ks_')) {
      await handleApiKeyAuth(req, authHeader, next);
      return;
    }

    const token = extractJwt(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await loadUser(payload.sub!);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function handleApiKeyAuth(req: Request, authHeader: string, next: NextFunction): Promise<void> {
  const { validateKey } = await import('../services/apiKey.js');
  const result = await validateKey(authHeader.replace('Bearer ', ''));

  if (!result.valid || !result.userId) {
    return void next(new Error('Invalid API key'));
  }

  const user = await loadUser(result.userId);
  if (!user) {
    return void next(new Error('User not found'));
  }

  req.user = user;
  next();
}

function extractJwt(req: Request): string | null {
  const cookie = req.headers.cookie?.split(';').find((c) => c.trim().startsWith('keyspot_token='));
  if (cookie) return cookie.split('=')[1]?.trim();

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const parts = authHeader.split(' ');
    if (parts.length === 2) return parts[1];
  }

  return null;
}

async function loadUser(sub: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: sub },
    include: { subscription: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscription?.tier || 'FREE',
    subscriptionStatus: user.subscription?.status || 'INACTIVE',
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractJwt(req);
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = await loadUser(payload.sub!);
      if (user) req.user = user;
    }
  } catch {
    // Not authenticated — that's ok
  }
  next();
}
