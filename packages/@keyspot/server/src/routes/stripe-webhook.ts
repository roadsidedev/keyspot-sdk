import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { constructWebhookEvent, syncSubscriptionFromStripe } from '../services/stripe.js';
import { prisma } from '../utils/prisma.js';

const router: Router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24-acacia' as any })
  : null;

router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    const event = constructWebhookEvent(req.body, signature);
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe] Webhook error:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

async function handleStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.resumed': {
      await syncSubscriptionFromStripe(event.data.object);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELED' as any },
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription && stripe) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await syncSubscriptionFromStripe(subscription);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await prisma.subscription.update({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'PAST_DUE' as any },
        });
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

export default router;
