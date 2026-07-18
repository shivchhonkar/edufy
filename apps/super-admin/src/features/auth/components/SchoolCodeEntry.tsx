'use client';

import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import AuthInput from '@/features/auth/components/AuthInput';
import AuthAlert from '@/features/auth/components/AuthAlert';

type SchoolCodeEntryProps = {
  initialCode?: string;
  onResolved: (payload: SchoolCodeLookupPayload) => void;
};

export type SchoolCodeLookupPayload = {
  school_code: string;
  manages_multiple_schools: boolean;
  organization: { id: number; name: string; slug: string; type?: string } | null;
  branding: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string | null;
    tagline?: string | null;
  } | null;
  schools: Array<{
    id: number;
    name: string;
    slug: string;
    city: string | null;
    is_primary?: boolean;
  }>;
};

export default function SchoolCodeEntry({ initialCode = '', onResolved }: SchoolCodeEntryProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters for your school code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/public/school-code?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'School code not found. Please check with your school office.');
        return;
      }
      onResolved(data.data as SchoolCodeLookupPayload);
    } catch {
      setError('Unable to verify school code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <AuthAlert type="error" title="School code not found">
          {error}
        </AuthAlert>
      )}

      <AuthInput
        label="School code"
        type="text"
        required
        autoComplete="organization"
        inputMode="text"
        placeholder="e.g. KMPI or GLOBAL"
        hint="Provided by your school. Same code for all campuses in a group."
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading || code.trim().length < 2}
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            Continue <FiArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
