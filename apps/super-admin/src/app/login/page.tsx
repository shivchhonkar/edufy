'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiLock, FiMail } from 'react-icons/fi';
import AuthPageLayout from '@/features/auth/components/AuthPageLayout';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthAlert from '@/features/auth/components/AuthAlert';
import { setClientSession } from '@/lib/client-auth';

function formatLoginError(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'invalid credentials' || normalized === 'invalid email or password') {
    return 'The email or password you entered is incorrect. Please check your details and try again.';
  }
  return message;
}

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setClientSession(data.data.token, data.data.user);
        window.location.href = '/dashboard';
      } else {
        setError(formatLoginError(data.error || 'Invalid email or password. Please try again.'));
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Welcome back"
      subtitle="Sign in to your school admin dashboard"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <AuthAlert type="error" title="Sign in failed">
            {error}
          </AuthAlert>
        )}

        <AuthInput
          label="Email address"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@school.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <div>
          <AuthInput
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In <FiArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
        {/* <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 border border-primary-100">
          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <FiMail size={14} />
          </div>
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">Demo:</span> admin@school.com
          </div>
        </div> */}
        {/* <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-gray-200/60 text-gray-500 flex items-center justify-center shrink-0">
            <FiLock size={14} />
          </div>
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">Password:</span> password123
          </div>
        </div> */}

        <p className="text-center text-sm text-gray-600">
          New school?{' '}
          <Link href="/register-school" className="text-brand font-semibold hover:text-primary-700 transition-colors">
            Register your school
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
