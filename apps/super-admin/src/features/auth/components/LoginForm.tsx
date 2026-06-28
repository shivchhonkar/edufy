'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
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

interface LoginFormProps {
  showRegisterLink?: boolean;
  submitLabel?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  emailLabel?: string;
  passwordLabel?: string;
}

export default function LoginForm({
  showRegisterLink = true,
  submitLabel = 'Sign In',
  buttonClassName = 'w-full flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm',
  buttonStyle,
  emailLabel = 'Email address',
  passwordLabel = 'Password',
}: LoginFormProps) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

      if (response.status === 404) {
        window.location.href = '/';
        return;
      }

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
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <AuthAlert type="error" title="Sign in failed">
            {error}
          </AuthAlert>
        )}

        <AuthInput
          label={emailLabel}
          type="email"
          required
          autoComplete="email"
          placeholder="admin@school.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {passwordLabel}
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none hover:border-gray-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={buttonClassName}
          style={buttonStyle}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              {submitLabel} <FiArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {showRegisterLink && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-center text-sm text-gray-600">
            New school?{' '}
            <Link
              href="/register-school"
              className="text-brand font-semibold hover:text-primary-700 transition-colors"
            >
              Register your school
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
