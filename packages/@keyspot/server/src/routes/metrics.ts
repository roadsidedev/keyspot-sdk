import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getUsageMetrics, getUsageQuotas } from '../services/metrics.js';

const router: Router = Router();

router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const groupBy = (req.query.groupBy as string) || 'day';
    const metrics = await getUsageMetrics(req.user!.id, period as any, groupBy as any);
    res.json(metrics);
  } catch (err) {
    console.error('[Metrics] Usage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/quotas', requireAuth, async (req: Request, res: Response) => {
  try {
    const quotas = await getUsageQuotas(req.user!.id);
    res.json(quotas);
  } catch (err) {
    console.error('[Metrics] Quotas error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/breakdown', requireAuth, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const metrics = await getUsageMetrics(req.user!.id, period as any, 'day');
    res.json(metrics.breakdowns);
  } catch (err) {
    console.error('[Metrics] Breakdown error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
