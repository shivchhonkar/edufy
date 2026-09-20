'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeeSetupLinks from '@/features/fees/components/FeeSetupLinks';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';

interface SeriesRow {
  id: number;
  name: string;
  prefix: string;
  academic_year: string;
  last_number: number;
  is_default: boolean;
  is_active: boolean;
}

export default function FeeSeriesPage() {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [form, setForm] = useState({ name: '', prefix: 'RCP', is_default: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (academicYear) params.set('academic_year', academicYear);
    const res = await fetch(`/api/fees/series?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/fees/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, academic_year: academicYear }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save series', { title: 'Error', type: 'error' });
        return;
      }
      setForm({ name: '', prefix: 'RCP', is_default: false });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (row: SeriesRow) => {
    await fetch(`/api/fees/series/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true, is_active: true }),
    });
    load();
  };

  const remove = async (row: SeriesRow) => {
    const ok = await confirm(`Remove series ${row.name}? Used prefixes are deactivated instead of deleted.`, {
      type: 'danger',
      confirmText: 'Remove',
    });
    if (!ok) return;
    await fetch(`/api/fees/series/${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <FeesPageHeader title="Receipt Series" description="Manage receipt prefixes used when collecting fees." />
      <FeeSetupLinks />

      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto_auto]">
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Series name (e.g. Main Receipts)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          required
        />
        <input
          value={form.prefix}
          onChange={(e) => setForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
          placeholder="Prefix"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
          required
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
          />
          Default
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <FiPlus size={14} />
          Add Series
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No series for this academic year yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {row.name} <span className="text-gray-500 font-normal">({row.prefix})</span>
                </p>
                <p className="text-xs text-gray-500">
                  Last number {row.last_number} · {row.is_active ? 'Active' : 'Inactive'}
                  {row.is_default ? ' · Default' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!row.is_default && row.is_active && (
                  <button type="button" onClick={() => setDefault(row)} className="text-sm text-primary-700 hover:underline">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => remove(row)} className="text-red-600 p-1" aria-label="Remove series">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
