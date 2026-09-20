'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import { useDialog } from '@/shared/context/DialogContext';

interface OnlineRow {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  exam_name: string;
  subject_name?: string;
  marks_obtained: string | number;
  status: string;
}

export default function OnlineExamMarksPage() {
  const { alert, confirm } = useDialog();
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_id: number; subjects?: Array<{ subject_id: number; subject_name: string }> }>>([]);
  const [rows, setRows] = useState<OnlineRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState({ exam_id: '', student_id: '', subject_id: '', marks_obtained: '', remarks: '' });
  const exam = exams.find((item) => String(item.id) === form.exam_id);

  const load = useCallback(async () => {
    const res = await fetch('/api/exams/online-marks?status=pending');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    fetch('/api/exams').then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams/online-marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      return;
    }
    setForm((prev) => ({ ...prev, student_id: '', marks_obtained: '', remarks: '' }));
    load();
  };

  const importSelected = async () => {
    const res = await fetch('/api/exams/online-marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', ids: selected }),
    });
    const data = await res.json();
    await alert(data.message || data.error || 'Import finished', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
    if (data.success) {
      setSelected([]);
      load();
    }
  };

  const reject = async (row: OnlineRow) => {
    const ok = await confirm(`Reject online marks for ${row.first_name} ${row.last_name}?`, { type: 'danger', confirmText: 'Reject' });
    if (!ok) return;
    await fetch(`/api/exams/online-marks?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Online Exam Marks</h1>
          <p className="mt-1 text-sm text-gray-500">Capture marks from an online test, then import them into the exam register.</p>
        </div>
        <ExamModuleLinks />
        <form onSubmit={save} className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select required value={form.exam_id} onChange={(e) => setForm((p) => ({ ...p, exam_id: e.target.value, subject_id: '' }))} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Exam</option>
              {exams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select required value={form.subject_id} onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Subject</option>
              {(exam?.subjects || []).map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>{subject.subject_name}</option>
              ))}
            </select>
          </div>
          <StudentPickSelect value={form.student_id} onChange={(student_id) => setForm((p) => ({ ...p, student_id }))} classId={exam ? String(exam.class_id) : undefined} />
          <input type="number" min="0" required value={form.marks_obtained} onChange={(e) => setForm((p) => ({ ...p, marks_obtained: e.target.value }))} placeholder="Marks" className="rounded-lg border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">Add pending mark</button>
        </form>
        <div className="flex justify-end">
          <button type="button" onClick={importSelected} disabled={!selected.length} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            Import selected into exam
          </button>
        </div>
        <div className="bg-white rounded-xl border divide-y">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">No pending online marks.</p>
          ) : (
            rows.map((row) => (
              <label key={row.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)))}
                  />
                  {row.first_name} {row.last_name} · {row.exam_name} · {row.subject_name || '—'}
                </span>
                <span className="flex items-center gap-3">
                  <strong>{row.marks_obtained}</strong>
                  <button type="button" onClick={() => reject(row)} className="text-red-700 hover:underline">Reject</button>
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
