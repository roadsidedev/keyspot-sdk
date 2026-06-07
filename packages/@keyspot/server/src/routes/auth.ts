import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { hashPassword, verifyPassword, generateToken, hashToken } from '../utils/crypto.js';
import { ensureFreeSubscription } from '../services/stripe.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router: Router = Router();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

function createTokens(payload: { sub: string; email: string; role: string }) {
  const accessTokenPromise = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);

  const refreshTokenPromise = new SignJWT({ sub: payload.sub, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);

  return Promise.all([accessTokenPromise, refreshTokenPromise]);
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || email.split('@')[0] },
    });

    await ensureFreeSubscription(user.id, email);

    const verificationToken = generateToken();
    await sendVerificationEmail(email, verificationToken);

    const [accessToken, refreshToken] = await createTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('keyspot_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const [accessToken, refreshToken] = await createTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('keyspot_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.stripeCurrentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub! } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const [accessToken, refreshToken] = await createTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('keyspot_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ accessToken, refreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('keyspot_token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      subscription: true,
      _count: { select: { apiKeys: { where: { revokedAt: null } } } },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    subscription: user.subscription ? {
      tier: user.subscription.tier,
      status: user.subscription.status,
      currentPeriodEnd: user.subscription.stripeCurrentPeriodEnd,
      cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      stripeCustomerId: user.subscription.stripeCustomerId,
    } : null,
    keyCount: user._count.apiKeys,
    createdAt: user.createdAt,
  });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = generateToken();
      await sendPasswordResetEmail(email, resetToken);
    }

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const passwordHash = await hashPassword(password);

    await prisma.user.updateMany({
      where: { id: token },
      data: { passwordHash },
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(128).optional(),
    });

    const { name, currentPassword, newPassword } = schema.parse(req.body);

    const updateData: any = {};
    if (name) updateData.name = name;

    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user?.passwordHash) {
        res.status(400).json({ error: 'Cannot change password for OAuth accounts' });
        return;
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, email: true, name: true },
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
