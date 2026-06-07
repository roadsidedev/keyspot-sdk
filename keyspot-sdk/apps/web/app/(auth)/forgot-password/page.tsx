'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Shield className="w-6 h-6" />
        <span className="text-xl font-semibold">KeySpot</span>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
        {sent ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold mb-2">Check your email</h1>
            <p className="text-sm text-zinc-500 mb-6">
              If an account with that email exists, we&apos;ve sent a password reset link.
            </p>
            <Link
              href="/login"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-1">Reset your password</h1>
            <p className="text-sm text-zinc-500 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                  required
                />
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
