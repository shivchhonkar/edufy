'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';
import { writeClientAuthCookie } from '@/lib/auth-cookie';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const raw = await response.text();
      if (!raw.trim()) {
        setError('Login failed: empty server response.');
        return;
      }

      const data = JSON.parse(raw) as {
        success?: boolean;
        error?: string;
        data?: { token: string; user: Record<string, unknown> };
      };

      if (data.success && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        writeClientAuthCookie(data.data.token);
        window.location.href = '/';
        return;
      }

      setError(data.error || 'Invalid email or password');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen portal-login-page flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-md border portal-border-accent">
            <img
              src="https://shribi.com/assets/shribi-logo.png"
              alt="Shribi logo"
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-medium text-gray-900 mb-1">Shribi Edufy Admin</h1>
          <p className="text-gray-600">Manage your school's data</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-xl font-medium text-gray-900 mb-6">Login</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-gray-700">Email</span>
              <div className="relative">
                <FiUser className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 portal-focus-ring focus:ring-2"
                  placeholder="admin@edulakhya.com"
                />
              </div>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-gray-700">Password</span>
              <div className="relative">
                <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-10 portal-focus-ring focus:ring-2"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-3.5 text-gray-400"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 portal-btn-primary font-medium disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-sm text-gray-500">
              Powered by <a href="https://shribi.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 hover:underline">Shribi Technologies Pvt. Ltd.</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
