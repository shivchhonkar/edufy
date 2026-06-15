'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheck, FiHome, FiLink } from 'react-icons/fi';
import AuthPageLayout from '@/features/auth/components/AuthPageLayout';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthAlert from '@/features/auth/components/AuthAlert';
import {
  getDefaultAcademicYearConfig,
  formatAcademicYearDates,
} from '@/lib/academic-year-utils';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

export default function RegisterSchoolPage() {
  const [form, setForm] = useState({
    school_name: '',
    slug: '',
    academic_year_name: '',
    academic_year_start: '',
    academic_year_end: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: '',
  });

  useEffect(() => {
    const defaultYear = getDefaultAcademicYearConfig();
    setForm((prev) => ({
      ...prev,
      academic_year_name: defaultYear.name,
      academic_year_start: defaultYear.start_date,
      academic_year_end: defaultYear.end_date,
    }));
  }, []);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ login_url: string; slug: string; academic_year?: string } | null>(null);

  const checkSlug = async (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/platform/schools/check-slug?slug=${clean}`);
      const data = await res.json();
      if (data.success) setSlugAvailable(data.data.available);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSchoolNameChange = (name: string) => {
    const updates: typeof form = { ...form, school_name: name };
    if (!slugTouched) {
      updates.slug = slugify(name);
      if (updates.slug.length >= 3) checkSlug(updates.slug);
    }
    setForm(updates);
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm({ ...form, slug: clean });
    checkSlug(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugAvailable === false) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/platform/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <AuthPageLayout
        title="You're all set!"
        subtitle="Your school has been registered successfully"
      >
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
            <FiCheck className="text-green-600" size={32} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">{form.school_name}</h2>
            <p className="text-sm text-gray-500 mt-1">is ready to use</p>
          </div>

          <div className="p-4 rounded-lg bg-primary-50 border border-primary-100 text-left space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your login URL</p>
            <a
              href={result.login_url}
              className="text-sm text-brand font-medium break-all hover:underline flex items-start gap-2"
            >
              <FiLink className="shrink-0 mt-0.5" size={14} />
              {result.login_url}
            </a>
            {(result.academic_year || form.academic_year_name) && (
              <p className="text-sm text-gray-600">
                Active academic year:{' '}
                <span className="font-semibold text-gray-900">
                  {result.academic_year || form.academic_year_name}
                </span>
                {form.academic_year_start && form.academic_year_end && (
                  <span className="text-gray-500">
                    {' '}
                    ({formatAcademicYearDates(form.academic_year_start, form.academic_year_end)})
                  </span>
                )}
              </p>
            )}
          </div>

          <Link
            href={result.login_url}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <FiHome size={16} /> Go to Login
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  const slugError = slugAvailable === false ? 'This URL is already taken — try another' : undefined;

  return (
    <AuthPageLayout
      title="Register your school"
      subtitle="Get started with Shribi Edufy in minutes"
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <AuthAlert type="error">{error}</AuthAlert>}

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold text-brand uppercase tracking-wider mb-1">
            School details
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthInput
              label="School name"
              required
              placeholder="e.g. Green Valley Public School"
              value={form.school_name}
              onChange={(e) => handleSchoolNameChange(e.target.value)}
            />

            <div>
              <AuthInput
                label="School URL"
                required
                placeholder="greenvalley"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                hint={form.slug.length < 3 ? 'At least 3 characters (letters, numbers, hyphens)' : undefined}
                error={slugError}
              />
              {form.slug.length >= 3 && (
                <div className="flex items-center justify-between mt-1.5 text-xs gap-2">
                  <span className="text-gray-400 font-mono truncate">
                    {form.slug}.{process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || 'localhost:7000'}
                  </span>
                  {checkingSlug && <span className="text-gray-400 shrink-0">Checking...</span>}
                  {!checkingSlug && slugAvailable === true && (
                    <span className="text-green-600 font-medium shrink-0">Available</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AuthInput
              label="Academic year"
              required
              placeholder="e.g. 2026-27"
              value={form.academic_year_name}
              onChange={(e) => setForm({ ...form, academic_year_name: e.target.value })}
              hint=""
            />
            <AuthInput
              label="Session start"
              type="date"
              required
              value={form.academic_year_start}
              onChange={(e) => setForm({ ...form, academic_year_start: e.target.value })}
            />
            <AuthInput
              label="Session end"
              type="date"
              required
              value={form.academic_year_end}
              onChange={(e) => setForm({ ...form, academic_year_end: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold text-brand uppercase tracking-wider mb-1">
            Administrator
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthInput
              label="Full name"
              required
              placeholder="Principal or admin name"
              value={form.admin_name}
              onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
            />

            <AuthInput
              label="Email address"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@school.com"
              value={form.admin_email}
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            />

            <AuthInput
              label="Phone number"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.admin_phone}
              onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
            />

            <AuthInput
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              value={form.admin_password}
              onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
              hint="You'll use this to sign in to your dashboard"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting || slugAvailable === false || checkingSlug}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating your school...
            </>
          ) : (
            <>
              Register School <FiArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-brand font-semibold hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthPageLayout>
  );
}
