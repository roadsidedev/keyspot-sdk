import { Request, Response, NextFunction } from 'express';

// Tier hierarchy: higher number = more access
// Unknown/missing tiers default to -1 (below FREE)
const TIER_ORDER: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

const UNKNOWN_TIER_PRIORITY = -1;
const DEFAULT_MIN_TIER = 'FREE';

export function requireSubscription(minTier: string = DEFAULT_MIN_TIER) {
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

    const userTier = TIER_ORDER[req.user.subscriptionTier] ?? UNKNOWN_TIER_PRIORITY;
    const requiredTier = TIER_ORDER[minTier] ?? UNKNOWN_TIER_PRIORITY;

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
