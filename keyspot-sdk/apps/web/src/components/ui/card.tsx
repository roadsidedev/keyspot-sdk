import { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, subtitle, children, className = '', action }: CardProps) {
  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <p className="text-xs uppercase tracking-[2px] text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {sublabel && <p className="text-xs text-zinc-400 mt-1">{sublabel}</p>}
      {trend && (
        <p className={`text-xs mt-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.value}
        </p>
      )}
    </div>
  );
}
