'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import StudentLookupListCard from '@/features/settings/components/StudentLookupListCard';
import {
  DEFAULT_STUDENT_LOOKUP_SETTINGS,
  STUDENT_LOOKUP_KEYS,
  STUDENT_LOOKUP_LABELS,
  mergeStudentLookupSettings,
  type StudentLookupSettings,
} from '@/lib/student-lookup-settings';
import { FiCheckCircle, FiRefreshCw, FiRotateCcw, FiSave } from 'react-icons/fi';

export default function StudentLookupSettingsPage() {
  const [settings, setSettings] = useState<StudentLookupSettings>(DEFAULT_STUDENT_LOOKUP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/student-lookups');
      const data = await res.json();
      if (data.success) {
        setSettings(mergeStudentLookupSettings(data.data));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load student master data' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load student master data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (next: StudentLookupSettings, successText = 'Student master data saved') => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/student-lookups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to save student master data' });
        return;
      }
      setSettings(mergeStudentLookupSettings(data.data));
      setMessage({ type: 'success', text: successText });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save student master data' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Student Master Data</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage nationality, religion, and caste type lists used on student forms.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSettings(DEFAULT_STUDENT_LOOKUP_SETTINGS);
                void save(DEFAULT_STUDENT_LOOKUP_SETTINGS, 'Restored default student master data');
              }}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <FiRotateCcw className={saving ? 'animate-spin' : ''} />
              Reset defaults
            </button>
            <button
              type="button"
              onClick={() => void save(settings)}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' && <FiCheckCircle className="shrink-0" />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <FiRefreshCw className="mr-2 animate-spin" />
            Loading student master data...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {STUDENT_LOOKUP_KEYS.map((key) => (
              <StudentLookupListCard
                key={key}
                title={STUDENT_LOOKUP_LABELS[key].title}
                description={STUDENT_LOOKUP_LABELS[key].description}
                placeholder={STUDENT_LOOKUP_LABELS[key].placeholder}
                list={settings[key]}
                onChange={(next) => setSettings((prev) => ({ ...prev, [key]: next }))}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
