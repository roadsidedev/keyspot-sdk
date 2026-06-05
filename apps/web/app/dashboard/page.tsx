'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [keys, setKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('keyspot_keys');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const createKey = () => {
    const newKey = `ks_${Math.random().toString(36).slice(2, 18)}`;
    const updated = [...keys, newKey];
    setKeys(updated);
    localStorage.setItem('keyspot_keys', JSON.stringify(updated));
  };

  const revokeKey = (key: string) => {
    const updated = keys.filter(k => k !== key);
    setKeys(updated);
    localStorage.setItem('keyspot_keys', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">KeySpot Dashboard</div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">← Back to site</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[3px] text-zinc-500">WELCOME BACK</div>
            <h1 className="text-3xl font-semibold tracking-tight">API Keys &amp; Usage</h1>
          </div>
          <button
            onClick={createKey}
            className="rounded-full bg-zinc-950 dark:bg-white px-5 py-2 text-sm font-medium text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
          >
            Create new key
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-500">No API keys yet. Create your first key to start using the hosted service.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 font-mono text-sm">
                <div className="font-mono tracking-tight">{key}</div>
                <button
                  onClick={() => revokeKey(key)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 mb-4">USAGE THIS MONTH</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="text-4xl font-semibold tabular-nums">12,481</div>
              <div className="text-sm text-zinc-500 mt-1">Requests</div>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="text-4xl font-semibold tabular-nums">3</div>
              <div className="text-sm text-zinc-500 mt-1">Secrets vaulted</div>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="text-4xl font-semibold tabular-nums">99.8%</div>
              <div className="text-sm text-zinc-500 mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
