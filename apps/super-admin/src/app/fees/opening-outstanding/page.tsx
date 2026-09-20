'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

interface OpeningRow {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  amount: string | number;
  remarks?: string;
}

export default function OpeningOutstandingPage() {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [rows, setRows] = useState<OpeningRow[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ student_id: '', amount: '', remarks: 'Opening outstanding' });

  const load = useCallback(async () => {
    const params = new URLSearchParams({ academic_year: academicYear });
    if (search) params.set('search', search);
    const res = await fetch(`/api/fees/opening-balances?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [academicYear, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/fees/opening-balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, academic_year: academicYear }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      return;
    }
    setForm({ student_id: '', amount: '', remarks: 'Opening outstanding' });
    load();
  };

  const remove = async (row: OpeningRow) => {
    const ok = await confirm(`Remove opening outstanding for ${row.first_name} ${row.last_name}?`, {
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    await fetch(`/api/fees/opening-balances?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <FeesPageHeader title="Opening Outstandings" description="Carry previous-year dues into the current academic year." />
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <StudentPickSelect value={form.student_id} onChange={(student_id) => setForm((prev) => ({ ...prev, student_id }))} />
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="Amount"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={form.remarks}
          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={!form.student_id} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          Save opening
        </button>
      </form>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search student"
        className="max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No opening outstandings yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {row.first_name} {row.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {row.admission_number} · {row.class_name || '—'} · {row.remarks}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-red-700">{formatFeeCurrency(row.amount)}</span>
                <button type="button" onClick={() => remove(row)} className="text-red-600 p-1" aria-label="Delete">
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
