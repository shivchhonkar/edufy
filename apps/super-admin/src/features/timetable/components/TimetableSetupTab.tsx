'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorkingDay } from '@/features/timetable/types';
import { selectClass } from '@/features/timetable/utils';
import { useDialog } from '@/shared/context/DialogContext';

export default function TimetableSetupTab() {
  const { alert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);

  const loadSetup = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/timetable/setup');
      const data = await res.json();
      if (data.success) setWorkingDays(data.data.working_days);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  const saveWorkingWeek = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/timetable/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days: workingDays }),
      });
      const data = await res.json();
      if (data.success) {
        await alert('Working week saved', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading setup...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <div>
            <p className="font-medium">Step 1 — Define School Working Days</p>
            <p className="text-xs mt-0.5 text-blue-700">
              Configure which days the school operates and how many teaching periods run each day.
            </p>
          </div>
          <button
            type="button"
            onClick={saveWorkingWeek}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save working week'}
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Day</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Working</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Periods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workingDays.map((day) => (
                <tr key={day.day_of_week}>
                  <td className="px-4 py-3 font-medium">{day.day_name}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={day.is_working}
                      onChange={(e) =>
                        setWorkingDays((prev) =>
                          prev.map((row) =>
                            row.day_of_week === day.day_of_week
                              ? { ...row, is_working: e.target.checked }
                              : row,
                          ),
                        )
                      }
                      className="rounded border-gray-300 text-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={day.teaching_period_count}
                      disabled={!day.is_working}
                      onChange={(e) =>
                        setWorkingDays((prev) =>
                          prev.map((row) =>
                            row.day_of_week === day.day_of_week
                              ? { ...row, teaching_period_count: parseInt(e.target.value, 10) || 0 }
                              : row,
                          ),
                        )
                      }
                      className={`w-20 ${selectClass} disabled:bg-gray-50`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
