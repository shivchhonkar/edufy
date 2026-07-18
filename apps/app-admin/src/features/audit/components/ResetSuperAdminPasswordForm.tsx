'use client';

import { useState } from 'react';
import type { SuperAdminUser } from '@/lib/school-audit';

export default function ResetSuperAdminPasswordForm({
  schoolId,
  user,
  onSuccess,
}: {
  schoolId: number;
  user: SuperAdminUser;
  onSuccess?: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/platform/schools/${schoolId}/super-admins/${user.id}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        },
      );
      const payload = await response.json();
      if (payload.success) {
        setPassword('');
        setConfirmPassword('');
        setMessage(`Password updated for ${user.email}.`);
        onSuccess?.();
      } else {
        setError(payload.error || 'Failed to reset password.');
      }
    } catch {
      setError('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
        <p className="text-xs text-slate-600 break-all">{user.email}</p>
        <p className="text-xs text-slate-500 mt-1 capitalize">{user.role.replace('_', ' ')}</p>
      </div>
      <label className="block text-sm">
        <span className="app-admin-label">New password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="app-admin-field"
          minLength={6}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">Confirm password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="app-admin-field"
          minLength={6}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Reset password'}
      </button>
    </form>
  );
}
