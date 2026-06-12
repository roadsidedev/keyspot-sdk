import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import crypto from 'node:crypto';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { createX402Middleware, type X402Config } from './payments/index.js';
import { MetricsRegistry, metricsMiddleware, metricsHandler } from './metrics.js';
import authRoutes from './routes/auth.js';
import apiKeyRoutes from './routes/api-keys.js';
import metricsRoutes from './routes/metrics.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';
import billingRoutes from './routes/billing.js';
import migrationRoutes from './routes/migration.js';
import { requireSubscription } from './middleware/requireSubscription.js';
import { usageTracker } from './middleware/usageTracker.js';
import { requireAuth } from './middleware/requireAuth.js';

const checkpointSchema = z.object({
  state: z.record(z.any()).refine(v => v !== undefined, 'state is required'),
});

export interface KeySpotServerConfig {
  guard?: KeySpot;
  x402?: X402Config;
  trustedProxies?: string[];
}

export function createApp(config: KeySpotServerConfig = {}): Express {
  const guard = config.guard ?? new KeySpot({ taintEnabled: true, promptShield: { enabled: true } });
  const enableX402 = !!config.x402;

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

  // Request tracing
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.requestId = requestId;
    _res.setHeader('x-request-id', requestId);
    next();
  });

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

  // Metrics + Usage tracking
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
      version: '2.3.0',
      mode: enableX402 ? 'hybrid' : 'self-hosted',
      timestamp: Date.now(),
    });
  });

  // Prometheus metrics (internal-facing, requires auth)
  app.get('/metrics', requireAuth, metricsHandler);

  // ── Auth Routes ──
  app.use('/auth', authLimiter, authRoutes);

  // ── API Routes ──
  app.use('/api/keys', apiKeyRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/billing', billingRoutes);

  // ── Stripe Webhook ──
  app.use('/stripe', stripeWebhookRoutes);

  // ── x402 Payment Middleware (official) ──
  if (config.x402) {
    const { middleware: x402Middleware } = createX402Middleware(config.x402);
    app.use(x402Middleware);
  }

  // ── Checkpoint endpoint ──
  // When x402 is enabled, this endpoint is protected by the paymentMiddleware above.
  // The middleware intercepts requests, returns 402 with PAYMENT-REQUIRED if unpaid,
  // verifies and settles via the facilitator when PAYMENT-SIGNATURE is present,
  // then passes through to this handler.
  app.post('/checkpoint', authLimiter, requireSubscription('FREE'), async (req: Request, res: Response) => {
    try {
      const parsed = checkpointSchema.parse(req.body);
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

  // ── Migration Routes ──
  app.use('/api/v1/migration', migrationRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', requestId: req.requestId });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId;
    console.error(`[Error] ${requestId}:`, err);
    res.status(500).json({ error: 'Internal server error', requestId });
  });

  return app;
}
