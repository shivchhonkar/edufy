'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { useDialog } from '@/shared/context/DialogContext';

interface GradeRow {
  id: number;
  grade: string;
  min_percentage: string | number;
  max_percentage: string | number;
  grade_point?: string | number | null;
  remarks?: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function GradeMasterPage() {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [form, setForm] = useState({
    grade: '',
    min_percentage: '',
    max_percentage: '',
    grade_point: '',
    remarks: '',
    sort_order: '0',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/exams/grades');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save grade', { title: 'Error', type: 'error' });
      return;
    }
    setForm({ grade: '', min_percentage: '', max_percentage: '', grade_point: '', remarks: '', sort_order: '0' });
    load();
  };

  const toggle = async (row: GradeRow) => {
    await fetch('/api/exams/grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    });
    load();
  };

  const remove = async (row: GradeRow) => {
    const ok = await confirm(`Delete grade ${row.grade}?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/exams/grades?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Grade Master</h1>
          <p className="mt-1 text-sm text-gray-500">Set the percentage bands used when compiling report cards.</p>
        </div>
        <ExamModuleLinks />
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 grid gap-3 sm:grid-cols-6">
          <input value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} placeholder="Grade" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="number" step="0.01" value={form.min_percentage} onChange={(e) => setForm((p) => ({ ...p, min_percentage: e.target.value }))} placeholder="Min %" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="number" step="0.01" value={form.max_percentage} onChange={(e) => setForm((p) => ({ ...p, max_percentage: e.target.value }))} placeholder="Max %" className="rounded-lg border px-3 py-2 text-sm" required />
          <input type="number" step="0.1" value={form.grade_point} onChange={(e) => setForm((p) => ({ ...p, grade_point: e.target.value }))} placeholder="GP" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Remarks" className="rounded-lg border px-3 py-2 text-sm" />
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">
            <FiPlus size={14} /> Add
          </button>
        </form>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2">GP</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.grade}</td>
                  <td className="px-3 py-2">{row.min_percentage} – {row.max_percentage}</td>
                  <td className="px-3 py-2">{row.grade_point ?? '—'}</td>
                  <td className="px-3 py-2">{row.remarks || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => toggle(row)} className="mr-3 text-sm text-primary-700 hover:underline">
                      {row.is_active ? 'Active' : 'Inactive'}
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
