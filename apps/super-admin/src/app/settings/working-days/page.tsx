'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import type { WorkingDay } from '@/lib/working-days';
import { FiRefreshCw, FiSave } from 'react-icons/fi';

interface ClassOption {
  id: number;
  name: string;
  has_override?: boolean;
}

const INPUT =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';

export default function WorkingDaysSettingsPage() {
  const { alert, confirm } = useDialog();
  const [tab, setTab] = useState<'school' | 'class'>('school');
  const [schoolDays, setSchoolDays] = useState<WorkingDay[]>([]);
  const [classDays, setClassDays] = useState<WorkingDay[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSchool = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/working-days', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setSchoolDays(data.data.school_days || []);
        setClasses(data.data.classes || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClass = useCallback(async (id: string) => {
    if (!id) {
      setClassDays([]);
      setHasOverride(false);
      return;
    }
    const res = await fetch(`/api/settings/working-days?class_id=${id}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success) {
      setClassDays(data.data.working_days || []);
      setHasOverride(Boolean(data.data.has_override));
    }
  }, []);

  useEffect(() => {
    void loadSchool();
  }, [loadSchool]);

  useEffect(() => {
    if (tab === 'class' && classId) void loadClass(classId);
  }, [tab, classId, loadClass]);

  const updateDay = (
    setter: Dispatch<SetStateAction<WorkingDay[]>>,
    dayOfWeek: number,
    patch: Partial<WorkingDay>,
  ) => {
    setter((prev) => prev.map((day) => (day.day_of_week === dayOfWeek ? { ...day, ...patch } : day)));
  };

  const saveSchool = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/working-days', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'school', working_days: schoolDays }),
      });
      const data = await res.json();
      await alert(data.success ? 'School working days saved' : data.error, {
        title: data.success ? 'Success' : 'Error',
        type: data.success ? 'success' : 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveClass = async () => {
    if (!classId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/working-days', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'class', class_id: Number(classId), working_days: classDays }),
      });
      const data = await res.json();
      if (data.success) setHasOverride(true);
      await alert(data.success ? 'Class working days saved' : data.error, {
        title: data.success ? 'Success' : 'Error',
        type: data.success ? 'success' : 'error',
      });
      await loadSchool();
    } finally {
      setSaving(false);
    }
  };

  const resetClass = async () => {
    if (!classId) return;
    const ok = await confirm('Remove this class override and use the school working week?', {
      title: 'Reset class working days',
      type: 'warning',
      confirmText: 'Reset',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/working-days', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'class', class_id: Number(classId), reset: true }),
      });
      const data = await res.json();
      if (data.success) {
        setClassDays(data.data.working_days || schoolDays);
        setHasOverride(false);
      }
      await alert(data.success ? 'Class now follows the school week' : data.error, {
        title: data.success ? 'Success' : 'Error',
        type: data.success ? 'success' : 'error',
      });
      await loadSchool();
    } finally {
      setSaving(false);
    }
  };

  const renderDays = (
    days: WorkingDay[],
    setter: Dispatch<SetStateAction<WorkingDay[]>>,
  ) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Day</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Working</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Periods</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {days.map((day) => (
            <tr key={day.day_of_week}>
              <td className="px-4 py-3 font-medium text-gray-900">{day.day_name}</td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={day.is_working}
                  onChange={(e) =>
                    updateDay(setter, day.day_of_week, { is_working: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={12}
                  disabled={!day.is_working}
                  value={day.teaching_period_count}
                  onChange={(e) =>
                    updateDay(setter, day.day_of_week, {
                      teaching_period_count: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className={`${INPUT} w-24 disabled:bg-gray-50`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Working Days</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set the school week, then override specific classes that follow a different schedule.
          </p>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('school')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'school' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            School-wise
          </button>
          <button
            type="button"
            onClick={() => setTab('class')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'class' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Class-wise
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            <FiRefreshCw className="mr-2 inline animate-spin" />
            Loading working days...
          </div>
        ) : tab === 'school' ? (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Applies to all classes unless a class override is saved.</p>
              <button
                type="button"
                onClick={() => void saveSchool()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <FiSave />
                {saving ? 'Saving...' : 'Save school week'}
              </button>
            </div>
            {renderDays(schoolDays, setSchoolDays)}
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Class
                <select
                  className={INPUT}
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                      {cls.has_override ? ' (custom)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void resetClass()}
                  disabled={saving || !classId || !hasOverride}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Use school week
                </button>
                <button
                  type="button"
                  onClick={() => void saveClass()}
                  disabled={saving || !classId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <FiSave />
                  {saving ? 'Saving...' : 'Save class week'}
                </button>
              </div>
            </div>
            {classId ? (
              <>
                <p className="text-xs text-gray-500">
                  {hasOverride
                    ? 'This class has a custom working week.'
                    : 'Showing the school week. Save to create a class-wise override.'}
                </p>
                {renderDays(classDays, setClassDays)}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Select a class to set its working days.</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
