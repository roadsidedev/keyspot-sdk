import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { X402Facilitator } from './payments/index.js';
import { MetricsRegistry, metricsMiddleware, metricsHandler } from './metrics.js';
import authRoutes from './routes/auth.js';
import apiKeyRoutes from './routes/api-keys.js';
import metricsRoutes from './routes/metrics.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';
import billingRoutes from './routes/billing.js';
import { requireSubscription } from './middleware/requireSubscription.js';
import { usageTracker } from './middleware/usageTracker.js';

const checkpointSchema = z.object({
  state: z.record(z.any()).refine(v => v !== undefined, 'state is required'),
  agentWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const verifySchema = z.object({
  proof: z.object({ txHash: z.string().min(1) }),
  request: z.object({
    amount: z.string(),
    currency: z.string(),
    payTo: z.string(),
    network: z.string(),
  }),
});

export interface KeySpotServerConfig {
  guard?: KeySpot;
  facilitator?: X402Facilitator;
  enableX402?: boolean;
  trustedProxies?: string[];
}

export function createApp(config: KeySpotServerConfig = {}): Express {
  const guard = config.guard ?? new KeySpot({ taintEnabled: true, promptShield: { enabled: true } });
  const facilitator = config.facilitator;
  const enableX402 = config.enableX402 ?? false;

  const app = express();

  if (config.trustedProxies?.length) {
    app.set('trust proxy', config.trustedProxies.join(','));
  }

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }));

  // Raw body for Stripe webhooks (must be before JSON parser)
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(generalLimiter);

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later.' },
  });

  // Metrics + Usage tracking middleware
  app.use(metricsMiddleware);
  app.use('/api', usageTracker);

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    _res.on('finish', () => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${_res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  // ── Health ──
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '2.1.0',
      timestamp: Date.now(),
      x402: enableX402,
    });
  });

  // Prometheus metrics
  app.get('/metrics', metricsHandler);

  // ── Auth Routes ──
  app.use('/auth', authRoutes);

  // ── API Routes (tracked by usageTracker) ──
  app.use('/api/keys', apiKeyRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/billing', billingRoutes);

  // ── Stripe Webhook ──
  app.use('/stripe', stripeWebhookRoutes);

  // ── Supported API endpoints (gated by subscription) ──
  app.post('/checkpoint', authLimiter, requireSubscription('FREE'), async (req: Request, res: Response) => {
    try {
      const parsed = checkpointSchema.parse(req.body);

      if (enableX402 && facilitator) {
        if (parsed.agentWallet && !facilitator.hasAccess(parsed.agentWallet)) {
          const paymentReq = facilitator.generatePaymentRequest('checkpoint');
          res.status(402).json(paymentReq);
          return;
        }
      }

      const cleanState = await guard.checkpoint(parsed.state);
      res.json({ cleanState });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request body', details: err.errors });
        return;
      }
      console.error('[checkpoint]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // x402 payment verification
  if (facilitator) {
    app.post('/x402/verify', authLimiter, async (req: Request, res: Response) => {
      try {
        const parsed = verifySchema.parse(req.body);
        const accessToken = await facilitator.verifyPayment(parsed.proof, parsed.request);
        if (accessToken) {
          res.json({ success: true, accessToken });
        } else {
          res.status(402).json({ success: false, error: 'Payment verification failed' });
        }
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid request body', details: err.errors });
          return;
        }
        console.error('[x402]', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
