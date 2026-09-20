'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { useDialog } from '@/shared/context/DialogContext';

interface Activity {
  id: number;
  name: string;
  category: string;
  description?: string | null;
  is_active: boolean;
}

export default function ExamActivitiesPage() {
  const { alert, confirm } = useDialog();
  const [tab, setTab] = useState<'master' | 'selection'>('master');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_id: number; class_name?: string }>>([]);
  const [form, setForm] = useState({ name: '', category: 'co-scholastic', description: '' });
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadActivities = useCallback(async () => {
    const res = await fetch('/api/exams/activities');
    const data = await res.json();
    if (data.success) setActivities(data.data || []);
  }, []);

  useEffect(() => {
    loadActivities();
    fetch('/api/classes').then((res) => res.json()).then((data) => data.success && setClasses(data.data || []));
    fetch('/api/exams').then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
  }, [loadActivities]);

  useEffect(() => {
    if (!classId || !examId) {
      setSelectedIds([]);
      return;
    }
    fetch(`/api/exams/activity-selections?class_id=${classId}&exam_id=${examId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSelectedIds((data.data || []).map((row: { activity_id: number }) => row.activity_id));
      });
  }, [classId, examId]);

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      return;
    }
    setForm({ name: '', category: 'co-scholastic', description: '' });
    loadActivities();
  };

  const remove = async (row: Activity) => {
    const ok = await confirm(`Delete activity "${row.name}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/exams/activities?id=${row.id}`, { method: 'DELETE' });
    loadActivities();
  };

  const saveSelection = async () => {
    const res = await fetch('/api/exams/activity-selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: classId, exam_id: examId, activity_ids: selectedIds }),
    });
    const data = await res.json();
    await alert(data.success ? 'Activity selection saved' : data.error || 'Save failed', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
  };

  const filteredExams = exams.filter((exam) => !classId || String(exam.class_id) === classId);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Activities</h1>
          <p className="mt-1 text-sm text-gray-500">Co-scholastic activities for report cards, then select which ones apply to an exam.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab('master')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'master' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>Activities</button>
          <button type="button" onClick={() => setTab('selection')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'selection' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>Activity Selection</button>
          <Link href="/exams/activities/feeding" className="rounded-lg border bg-white px-3 py-1.5 text-sm">Activities Feeding</Link>
          <Link href="/exams/activities/class-feeding" className="rounded-lg border bg-white px-3 py-1.5 text-sm">Class-wise Feeding</Link>
        </div>

        {tab === 'master' ? (
          <>
            <form onSubmit={saveActivity} className="bg-white rounded-xl border p-4 grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto]">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Activity name" className="rounded-lg border px-3 py-2 text-sm" required />
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm bg-white">
                <option value="co-scholastic">Co-scholastic</option>
                <option value="health">Health</option>
                <option value="art">Art</option>
                <option value="discipline">Discipline</option>
              </select>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="rounded-lg border px-3 py-2 text-sm" />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white"><FiPlus size={14} /> Add</button>
            </form>
            <div className="bg-white rounded-xl border divide-y">
              {activities.map((row) => (
                <div key={row.id} className="px-4 py-3 flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.category}{row.description ? ` · ${row.description}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => remove(row)} className="text-red-600" aria-label="Delete"><FiTrash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setExamId(''); }} className="rounded-lg border px-3 py-2 text-sm bg-white">
                <option value="">Select class</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
              <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white" disabled={!classId}>
                <option value="">Select exam</option>
                {filteredExams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
              </select>
              <button type="button" onClick={saveSelection} disabled={!classId || !examId} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save selection</button>
            </div>
            <div className="grid gap-2">
              {activities.filter((row) => row.is_active).map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) => (e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)))
                    }
                  />
                  {row.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
