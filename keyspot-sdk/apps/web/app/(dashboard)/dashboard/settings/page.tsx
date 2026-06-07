'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useUpdateProfile } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, User, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  if (status === 'unauthenticated') redirect('/login');

  const user = session?.user as any;
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateProfile = useUpdateProfile();

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      await updateProfile.mutateAsync({ name });
      await update();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    try {
      await updateProfile.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Password change failed' });
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile */}
        <Card title="Profile" subtitle="Update your name">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
              />
            </div>
            <Button type="submit" loading={updateProfile.isPending}>
              <User className="w-4 h-4 mr-1" />
              Save changes
            </Button>
          </form>
        </Card>

        {/* Password */}
        <Card title="Password" subtitle="Change your password">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                minLength={8}
              />
              <p className="text-xs text-zinc-400 mt-1">At least 8 characters</p>
            </div>
            <Button type="submit" disabled={!currentPassword || !newPassword} loading={updateProfile.isPending}>
              <Lock className="w-4 h-4 mr-1" />
              Update password
            </Button>
          </form>
        </Card>

        {/* Account info */}
        <Card title="Account" subtitle="Account details">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <p>
              <span className="text-zinc-500">User ID:</span>{' '}
              <span className="font-mono text-xs">{user?.id}</span>
            </p>
            <p>
              <span className="text-zinc-500">Role:</span>{' '}
              {user?.role || 'USER'}
            </p>
            <p>
              <span className="text-zinc-500">Signed in with:</span>{' '}
              Email
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
