import { Request, Response, NextFunction } from 'express';
import { recordUsageEvent } from '../services/metrics.js';

export function usageTracker(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    if (!req.user) return;

    const latencyMs = Date.now() - start;

    recordUsageEvent({
      userId: req.user.id,
      apiKeyId: req.apiKeyInfo?.keyId,
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      latencyMs,
    }).catch((err) => console.error('[Usage] Failed to record event:', err));
  });

  next();
}
