'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { useDialog } from '@/shared/context/DialogContext';

const ACTIVITY_GRADE_OPTIONS = ['A+', 'A', 'B', 'C', 'D'];

interface Activity { id: number; name: string; }
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
}

export default function ClassActivityFeedingPage() {
  const { alert } = useDialog();
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_id: number; class_name?: string }>>([]);
  const [examId, setExamId] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const exam = exams.find((item) => String(item.id) === examId);

  useEffect(() => {
    fetch('/api/exams').then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
  }, []);

  const load = useCallback(async () => {
    if (!exam) {
      setStudents([]);
      setActivities([]);
      return;
    }
    const [gradeRes, studentRes] = await Promise.all([
      fetch(`/api/exams/activity-grades?exam_id=${exam.id}`),
      fetch(`/api/students?class_id=${exam.class_id}&limit=50000&page=1`),
    ]);
    const gradeData = await gradeRes.json();
    const studentData = await studentRes.json();
    if (gradeData.success) setActivities(gradeData.data.activities || []);
    if (studentData.success) setStudents(studentData.data || []);
    const next: Record<string, string> = {};
    for (const row of gradeData.data?.grades || []) {
      next[`${row.student_id}-${row.activity_id}`] = row.grade;
    }
    setGrades(next);
  }, [exam]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const rows = [];
    for (const student of students) {
      for (const activity of activities) {
        const grade = grades[`${student.id}-${activity.id}`];
        if (!grade) continue;
        rows.push({
          activity_id: activity.id,
          exam_id: exam?.id,
          student_id: student.id,
          class_id: exam?.class_id,
          grade,
        });
      }
    }
    const res = await fetch('/api/exams/activity-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    await alert(data.success ? 'Class activity grades saved' : data.error || 'Save failed', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Class-wise Activity Feeding</h1>
          <p className="mt-1 text-sm text-gray-500">Enter co-scholastic grades for the whole class in one grid.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex flex-wrap gap-3">
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">Select exam</option>
            {exams.map((item) => (
              <option key={item.id} value={item.id}>{item.name} {item.class_name ? `· ${item.class_name}` : ''}</option>
            ))}
          </select>
          <button type="button" onClick={save} disabled={!students.length} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            Save class grades
          </button>
        </div>
        <div className="bg-white rounded-xl border overflow-auto">
          {!activities.length ? (
            <p className="p-6 text-sm text-gray-500 text-center">Select activities for this exam first.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  {activities.map((activity) => (
                    <th key={activity.id} className="px-3 py-2">{activity.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="px-3 py-2">
                      {student.first_name} {student.last_name}
                      <div className="text-xs text-gray-500">{student.admission_number}</div>
                    </td>
                    {activities.map((activity) => {
                      const key = `${student.id}-${activity.id}`;
                      return (
                        <td key={activity.id} className="px-3 py-2">
                          <select
                            value={grades[key] || ''}
                            onChange={(e) => setGrades((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="rounded-lg border px-2 py-1.5 bg-white"
                          >
                            <option value="">—</option>
                            {ACTIVITY_GRADE_OPTIONS.map((grade) => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
