'use client';

import { useEffect, useState } from 'react';
import { setClientSession, getClientUser } from '@/lib/client-auth';
import { setLastSelectedSchoolId } from '@/lib/selected-school';

type SchoolOption = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
};

export default function OrgSelectSchoolPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/org/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.schools) {
          setSchools(data.data.schools);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectSchool = async (schoolId: number) => {
    const res = await fetch('/api/auth/switch-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId }),
    });
    const data = await res.json();
    if (data.success) {
      const prev = getClientUser() || {};
      setClientSession(data.data.token, { ...prev, ...data.data.user });
      if (data.data.school?.id) {
        const orgSlug = String(prev.organization_slug ?? '');
        if (orgSlug) {
          setLastSelectedSchoolId(orgSlug, data.data.school.id);
        }
      }
      window.location.href = '/admin';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h1 className="text-lg font-bold text-gray-900">Choose a school</h1>
        <p className="mt-1 text-sm text-gray-500">Select which campus you want to manage.</p>
        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Loading schools…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {schools.map((school) => (
              <li key={school.id}>
                <button
                  type="button"
                  onClick={() => selectSchool(school.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-primary-300 hover:bg-primary-50"
                >
                  <span className="font-medium text-gray-900">{school.name}</span>
                  {school.city && <span className="text-xs text-gray-500">{school.city}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            window.location.href = '/org/dashboard';
          }}
          className="mt-4 w-full text-center text-sm text-primary-600 hover:text-primary-700"
        >
          Go to organization dashboard instead
        </button>
      </div>
    </div>
  );
}
