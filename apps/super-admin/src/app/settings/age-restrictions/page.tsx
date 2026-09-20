'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import type { AgeAsOnMode, ClassAgeRestriction } from '@/lib/class-age-restriction';
import { compareClassNames } from '@/lib/class-sort';
import { FiRefreshCw, FiSave } from 'react-icons/fi';

function sortAgeRestrictionRows(rows: ClassAgeRestriction[]): ClassAgeRestriction[] {
  return [...rows].sort((a, b) => compareClassNames(a.class_name, b.class_name));
}

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';

export default function AgeRestrictionsSettingsPage() {
  const { alert } = useDialog();
  const [rows, setRows] = useState<ClassAgeRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/age-restrictions', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setRows(sortAgeRestrictionRows(data.data || []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (classId: number, patch: Partial<ClassAgeRestriction>) => {
    setRows((prev) => prev.map((row) => (row.class_id === classId ? { ...row, ...patch } : row)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/age-restrictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restrictions: rows.map((row) => ({
            class_id: row.class_id,
            min_age_years: row.min_age_years,
            max_age_years: row.max_age_years,
            as_on_mode: row.as_on_mode,
            as_on_date: row.as_on_date,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) setRows(sortAgeRestrictionRows(data.data || rows));
      await alert(data.success ? 'Age restrictions saved' : data.error, {
        title: data.success ? 'Success' : 'Error',
        type: data.success ? 'success' : 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Age-wise Class Restriction</h1>
            <p className="mt-1 text-sm text-gray-500">
              Set minimum and maximum age for each class. Admission and student assignment will be blocked if the age is outside the range.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <FiSave />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Session</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Min age</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Max age</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Age as on</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <FiRefreshCw className="mr-2 inline animate-spin" />
                    Loading classes...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No active classes found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.class_id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.class_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.academic_year || '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={0.5}
                        className={INPUT}
                        value={row.min_age_years ?? ''}
                        onChange={(e) =>
                          updateRow(row.class_id, {
                            min_age_years: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        step={0.5}
                        className={INPUT}
                        value={row.max_age_years ?? ''}
                        onChange={(e) =>
                          updateRow(row.class_id, {
                            max_age_years: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <select
                          className={INPUT}
                          value={row.as_on_mode}
                          onChange={(e) =>
                            updateRow(row.class_id, { as_on_mode: e.target.value as AgeAsOnMode })
                          }
                        >
                          <option value="admission_date">Admission date</option>
                          <option value="academic_year_start">Session start date</option>
                          <option value="fixed_date">Fixed date</option>
                        </select>
                        {row.as_on_mode === 'fixed_date' && (
                          <input
                            type="date"
                            className={INPUT}
                            value={row.as_on_date || ''}
                            onChange={(e) => updateRow(row.class_id, { as_on_date: e.target.value })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
