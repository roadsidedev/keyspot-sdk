import { Request, Response, NextFunction } from 'express';

const TIER_ORDER: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

export function requireSubscription(minTier: string = 'FREE') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.subscriptionStatus !== 'ACTIVE') {
      res.status(402).json({
        error: 'Active subscription required',
        status: req.user.subscriptionStatus,
        portalUrl: '/dashboard/billing',
      });
      return;
    }

    const userTier = TIER_ORDER[req.user.subscriptionTier] ?? -1;
    const requiredTier = TIER_ORDER[minTier] ?? 0;

    if (userTier < requiredTier) {
      res.status(403).json({
        error: `This feature requires ${minTier} plan or higher`,
        currentTier: req.user.subscriptionTier,
        requiredTier: minTier,
      });
      return;
    }

    next();
  };
}
