'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useUsage, useQuotas } from '@/hooks/useApi';
import { StatCard, Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UsageChart, QuotaGauge } from '@/components/charts/usage-chart';
import { BarChart3, KeyRound, Activity, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;

  if (status === 'unauthenticated') redirect('/login');

  const { data: usage, isLoading: usageLoading } = useUsage('7d');
  const { data: quotas, isLoading: quotasLoading } = useQuotas();

  const tierColor = (tier: string) => {
    switch (tier) {
      case 'PRO': return 'success';
      case 'ENTERPRISE': return 'info';
      default: return 'default';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        {user?.subscriptionTier && (
          <Badge variant={tierColor(user.subscriptionTier) as any}>
            {user.subscriptionTier}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Requests"
          value={usageLoading ? '...' : (usage?.totalRequests ?? 0).toLocaleString()}
          sublabel={usageLoading ? 'Loading...' : 'Current period'}
        />
        <StatCard
          label="Errors"
          value={usageLoading ? '...' : (usage?.totalErrors ?? 0).toLocaleString()}
          sublabel={usageLoading ? 'Loading...' : usage?.totalRequests ? `${((usage.totalErrors / usage.totalRequests) * 100).toFixed(1)}% error rate` : 'No errors'}
          trend={usage?.totalErrors && usage.totalErrors > 0 ? { value: `${usage.totalErrors} errors`, positive: false } : undefined}
        />
        <StatCard
          label="Avg Latency"
          value={usageLoading ? '...' : `${Math.round(usage?.avgLatency ?? 0)}ms`}
          sublabel="Across all endpoints"
        />
        <StatCard
          label="API Keys"
          value={quotasLoading ? '...' : `${quotas?.keyCount ?? 0}`}
          sublabel={quotasLoading ? 'Loading...' : `of ${quotas?.maxKeys ?? 0} max`}
        />
      </div>

      {/* Quotas */}
      <Card title="Resource Usage" subtitle="Monthly quota consumption" className="mb-8">
        <div className="space-y-4">
          <QuotaGauge
            current={quotas?.requestsThisMonth ?? 0}
            max={quotas?.maxRequests ?? 10000}
            label="API Requests"
          />
          <QuotaGauge
            current={quotas?.keyCount ?? 0}
            max={quotas?.maxKeys ?? 3}
            label="Active API Keys"
          />
        </div>
      </Card>

      {/* Usage Chart */}
      <Card
        title="Request Volume"
        subtitle="Last 7 days"
        action={
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Activity className="w-3 h-3" />
            <span>Requests / Latency</span>
          </div>
        }
      >
        <UsageChart data={usage?.timeSeries ?? []} />
      </Card>

      {/* Endpoint breakdown */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Endpoints" subtitle="By request count">
          {usage?.breakdowns?.byEndpoint ? (
            <div className="space-y-2">
              {Object.entries(usage.breakdowns.byEndpoint)
                .slice(0, 10)
                .map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate">{endpoint}</span>
                    <span className="text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No data yet</p>
          )}
        </Card>

        <Card title="Status Codes" subtitle="Response distribution">
          {usage?.breakdowns?.byStatusCode ? (
            <div className="space-y-2">
              {Object.entries(usage.breakdowns.byStatusCode).map(([code, count]) => (
                <div key={code} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{code}</span>
                  <span className="text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No data yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
