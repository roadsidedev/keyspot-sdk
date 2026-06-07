import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { prisma } from '../utils/prisma.js';
import { createCheckoutSession, createPortalSession, getPriceIdFromTier } from '../services/stripe.js';
import { Tier } from '@prisma/client';

const router: Router = Router();

router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
      res.status(400).json({ error: 'Invalid tier. Must be PRO or ENTERPRISE' });
      return;
    }

    const priceId = getPriceIdFromTier(tier as Tier);
    if (!priceId) {
      res.status(400).json({ error: `No price configured for tier: ${tier}` });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      res.status(400).json({ error: 'No Stripe customer found. Contact support.' });
      return;
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    const session = await createCheckoutSession(
      customerId,
      priceId,
      `${origin}/dashboard/billing?success=true`,
      `${origin}/dashboard/billing?canceled=true`
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true },
    });

    if (!user?.subscription?.stripeCustomerId) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    const session = await createPortalSession(
      user.subscription.stripeCustomerId,
      `${origin}/dashboard/billing`
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
