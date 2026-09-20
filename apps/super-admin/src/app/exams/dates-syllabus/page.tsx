'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { useDialog } from '@/shared/context/DialogContext';

interface ScheduleRow {
  exam_id: number;
  exam_name: string;
  class_name?: string;
  subject_id: number;
  subject_name?: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  syllabus?: string;
  max_marks?: number;
}

export default function ExamDatesSyllabusPage() {
  const { alert } = useDialog();
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_name?: string }>>([]);
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ScheduleRow>>({});

  useEffect(() => {
    fetch('/api/exams')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setExams(data.data || []);
      });
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (examId) params.set('exam_id', examId);
    const res = await fetch(`/api/exams/schedule?${params}`);
    const data = await res.json();
    if (!data.success) return;
    setRows(data.data || []);
    const next: Record<string, ScheduleRow> = {};
    for (const row of data.data || []) {
      next[`${row.exam_id}-${row.subject_id}`] = {
        ...row,
        exam_date: row.exam_date ? String(row.exam_date).slice(0, 10) : '',
      };
    }
    setDrafts(next);
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => rows, [rows]);

  const save = async () => {
    const payload = Object.values(drafts);
    const res = await fetch('/api/exams/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payload }),
    });
    const data = await res.json();
    await alert(data.success ? 'Exam dates and syllabus saved' : data.error || 'Save failed', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
    if (data.success) load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Exam Dates & Syllabus</h1>
          <p className="mt-1 text-sm text-gray-500">Set the date, time, and syllabus for each subject in an exam.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex flex-wrap gap-3">
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} {exam.class_name ? `· ${exam.class_name}` : ''}
              </option>
            ))}
          </select>
          <button type="button" onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
            Save schedule
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Syllabus</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">Create an exam with subjects first.</td>
                </tr>
              ) : (
                visible.map((row) => {
                  const key = `${row.exam_id}-${row.subject_id}`;
                  const draft = drafts[key] || row;
                  return (
                    <tr key={key} className="border-t">
                      <td className="px-3 py-2">
                        {row.exam_name}
                        <div className="text-xs text-gray-500">{row.class_name}</div>
                      </td>
                      <td className="px-3 py-2">{row.subject_name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={draft.exam_date || ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, exam_date: e.target.value } }))}
                          className="rounded-lg border px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={draft.start_time || ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, start_time: e.target.value } }))}
                          className="rounded-lg border px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={draft.end_time || ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, end_time: e.target.value } }))}
                          className="rounded-lg border px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.syllabus || ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: { ...draft, syllabus: e.target.value } }))}
                          placeholder="Chapters / units"
                          className="w-64 rounded-lg border px-2 py-1.5"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
