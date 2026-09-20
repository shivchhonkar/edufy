'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import { useDialog } from '@/shared/context/DialogContext';

const ACTIVITY_GRADE_OPTIONS = ['A+', 'A', 'B', 'C', 'D'];

interface Activity {
  id: number;
  name: string;
}

export default function ActivityFeedingPage() {
  const { alert } = useDialog();
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_id: number; class_name?: string }>>([]);
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<Record<number, string>>({});
  const exam = exams.find((item) => String(item.id) === examId);

  useEffect(() => {
    fetch('/api/exams').then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
  }, []);

  const load = useCallback(async () => {
    if (!examId) return;
    const params = new URLSearchParams({ exam_id: examId });
    if (studentId) params.set('student_id', studentId);
    const res = await fetch(`/api/exams/activity-grades?${params}`);
    const data = await res.json();
    if (!data.success) return;
    setActivities(data.data.activities || []);
    const next: Record<number, string> = {};
    for (const row of data.data.grades || []) {
      if (!studentId || String(row.student_id) === studentId) next[row.activity_id] = row.grade;
    }
    setGrades(next);
  }, [examId, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const rows = activities
      .filter((activity) => grades[activity.id])
      .map((activity) => ({
        activity_id: activity.id,
        exam_id: examId,
        student_id: studentId,
        class_id: exam?.class_id,
        grade: grades[activity.id],
      }));
    const res = await fetch('/api/exams/activity-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    await alert(data.success ? 'Activity grades saved' : data.error || 'Save failed', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Activities Feeding</h1>
          <p className="mt-1 text-sm text-gray-500">Enter co-scholastic grades for one student at a time.</p>
        </div>
        <ExamModuleLinks />
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">Select exam</option>
            {exams.map((item) => (
              <option key={item.id} value={item.id}>{item.name} {item.class_name ? `· ${item.class_name}` : ''}</option>
            ))}
          </select>
          <StudentPickSelect value={studentId} onChange={setStudentId} classId={exam ? String(exam.class_id) : undefined} />
          {!activities.length ? (
            <p className="text-sm text-gray-500">Select activities for this exam under Activity Selection first.</p>
          ) : (
            activities.map((activity) => (
              <label key={activity.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{activity.name}</span>
                <select
                  value={grades[activity.id] || ''}
                  onChange={(e) => setGrades((prev) => ({ ...prev, [activity.id]: e.target.value }))}
                  className="rounded-lg border px-3 py-2 bg-white"
                >
                  <option value="">Grade</option>
                  {ACTIVITY_GRADE_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </label>
            ))
          )}
          <button type="button" onClick={save} disabled={!examId || !studentId} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            Save grades
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
