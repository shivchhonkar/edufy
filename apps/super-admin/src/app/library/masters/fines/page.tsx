'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryMasterLinks from '@/features/library/components/LibraryMasterLinks';

interface FineRule {
  id: number;
  name: string;
  borrower_type: string;
  days_allowed: number;
  fine_per_day: string | number;
  max_fine?: string | number | null;
  grace_days: number;
  is_active: boolean;
}

const EMPTY = {
  name: '',
  borrower_type: 'student',
  days_allowed: '14',
  fine_per_day: '10',
  max_fine: '',
  grace_days: '0',
};

export default function FineMasterPage() {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<FineRule[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/library/fine-rules');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/library/fine-rules', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save rule', { title: 'Error', type: 'error' });
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  };

  const remove = async (row: FineRule) => {
    const ok = await confirm(`Delete fine rule "${row.name}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/library/fine-rules?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Fine Rules</h1>
          <p className="mt-1 text-sm text-gray-500">Loan days and per-day overdue fines for students and staff.</p>
        </div>
        {/* <LibraryModuleLinks /> */}
        <LibraryMasterLinks />
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Rule name" className="rounded-lg border px-3 py-2 text-sm" required />
          <select value={form.borrower_type} onChange={(e) => setForm((p) => ({ ...p, borrower_type: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="all">All</option>
          </select>
          <input type="number" min={1} value={form.days_allowed} onChange={(e) => setForm((p) => ({ ...p, days_allowed: e.target.value }))} placeholder="Days allowed" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="number" min={0} step="0.01" value={form.fine_per_day} onChange={(e) => setForm((p) => ({ ...p, fine_per_day: e.target.value }))} placeholder="Fine / day" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="number" min={0} step="0.01" value={form.max_fine} onChange={(e) => setForm((p) => ({ ...p, max_fine: e.target.value }))} placeholder="Max fine" className="rounded-lg border px-3 py-2 text-sm" />
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">
            <FiPlus size={14} /> {editingId ? 'Update' : 'Add'}
          </button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Applies to</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Fine / day</th>
                <th className="px-3 py-2">Max</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 capitalize">{row.borrower_type}</td>
                  <td className="px-3 py-2">{row.days_allowed}</td>
                  <td className="px-3 py-2">₹ {Number(row.fine_per_day).toFixed(2)}</td>
                  <td className="px-3 py-2">{row.max_fine != null ? `₹ ${Number(row.max_fine).toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          name: row.name,
                          borrower_type: row.borrower_type,
                          days_allowed: String(row.days_allowed),
                          fine_per_day: String(row.fine_per_day),
                          max_fine: row.max_fine != null ? String(row.max_fine) : '',
                          grace_days: String(row.grace_days ?? 0),
                        });
                      }}
                      className="mr-3 text-sm text-primary-700 hover:underline"
                    >
                      Modify
                    </button>
                    <button type="button" onClick={() => remove(row)} className="text-red-600" aria-label="Delete">
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
