'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import StudentPickSelect, { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { useDialog } from '@/shared/context/DialogContext';

interface LatePass {
  id: number;
  pass_number: string;
  late_date: string;
  arrival_time: string;
  reason: string;
  remarks?: string | null;
  student_snapshot?: { full_name?: string; admission_number?: string; class_name?: string };
}

export default function LatePassPage() {
  const { confirm, alert } = useDialog();
  const [tab, setTab] = useState<'feed' | 'register'>('feed');
  const [rows, setRows] = useState<LatePass[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    student_id: '',
    late_date: new Date().toISOString().split('T')[0],
    arrival_time: '',
    reason: '',
    remarks: '',
  });

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/students/late-passes?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/students/late-passes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save late pass');
      return;
    }
    setForm({ ...form, student_id: '', reason: '', remarks: '' });
    setTab('register');
    load();
  };

  const remove = async (row: LatePass) => {
    const ok = await confirm(`Delete late pass ${row.pass_number}?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/late-passes/${row.id}`, { method: 'DELETE' });
    load();
  };

  const printRegister = () => {
    printHtmlDocument(
      'Late Pass Register',
      `<h1>Late Pass Register</h1>
       <table><thead><tr><th>No.</th><th>Date</th><th>Student</th><th>Time</th><th>Reason</th></tr></thead>
       <tbody>${rows
         .map(
           (row) =>
             `<tr><td>${row.pass_number}</td><td>${row.late_date?.slice(0, 10)}</td><td>${
               row.student_snapshot?.full_name || ''
             }</td><td>${row.arrival_time}</td><td>${row.reason}</td></tr>`
         )
         .join('')}</tbody></table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Late Pass</h1>
          <p className="mt-1 text-sm text-gray-500">Feed late arrivals and print the late pass register.</p>
        </div>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('feed')}
            className={`rounded-lg px-3 py-2 text-sm ${tab === 'feed' ? 'bg-primary-600 text-white' : 'border bg-white'}`}
          >
            Feed Late Pass
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`rounded-lg px-3 py-2 text-sm ${tab === 'register' ? 'bg-primary-600 text-white' : 'border bg-white'}`}
          >
            Late Pass Register
          </button>
        </div>

        {tab === 'feed' ? (
          <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl border bg-white p-6">
            <StudentPickSelect value={form.student_id} onChange={(student_id) => setForm({ ...form, student_id })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Date
                <input type="date" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.late_date} onChange={(e) => setForm({ ...form, late_date: e.target.value })} />
              </label>
              <label className="text-sm">
                Arrival time
                <input type="time" required className={`${STUDENT_OPS_INPUT} mt-1`} value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm">
              Reason
              <textarea required className={`${STUDENT_OPS_INPUT} mt-1`} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
              <FiPlus /> Save late pass
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input className={`${STUDENT_OPS_INPUT} max-w-sm`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
              <button type="button" onClick={printRegister} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <FiPrinter /> Print
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">No.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.pass_number}</td>
                      <td className="px-4 py-2.5">{row.student_snapshot?.full_name}</td>
                      <td className="px-4 py-2.5">{row.late_date?.slice(0, 10)}</td>
                      <td className="px-4 py-2.5">{row.arrival_time}</td>
                      <td className="px-4 py-2.5">{row.reason}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => remove(row)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
