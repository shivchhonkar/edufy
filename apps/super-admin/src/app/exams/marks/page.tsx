'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { useDialog } from '@/shared/context/DialogContext';

interface ExamOption {
  id: number;
  name: string;
  class_name?: string;
  class_id: number;
  subjects?: Array<{ subject_id: number; subject_name: string; total_marks: number }>;
}

interface StudentMark {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number?: string;
  marks_obtained?: string | number | null;
  is_absent?: boolean;
  remarks?: string | null;
}

export default function MarksFeedingPage() {
  const { alert } = useDialog();
  const [tab, setTab] = useState<'subject' | 'class'>('subject');
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [drafts, setDrafts] = useState<Record<number, { marks: string; absent: boolean }>>({});

  useEffect(() => {
    fetch('/api/exams')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setExams(data.data || []);
      });
  }, []);

  const selectedExam = exams.find((exam) => String(exam.id) === examId);
  const subjects = selectedExam?.subjects || [];

  const load = useCallback(async () => {
    if (!examId || !subjectId) {
      setStudents([]);
      return;
    }
    const res = await fetch(`/api/exams/marks/subject-wise?exam_id=${examId}&subject_id=${subjectId}`);
    const data = await res.json();
    if (!data.success) return;
    setStudents(data.data.students || []);
    setTotalMarks(data.data.total_marks || 100);
    const next: Record<number, { marks: string; absent: boolean }> = {};
    for (const student of data.data.students || []) {
      next[student.id] = {
        marks: student.marks_obtained != null ? String(student.marks_obtained) : '',
        absent: Boolean(student.is_absent),
      };
    }
    setDrafts(next);
  }, [examId, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const rows = students.map((student) => ({
      student_id: student.id,
      marks_obtained: drafts[student.id]?.marks || 0,
      is_absent: drafts[student.id]?.absent || false,
    }));
    const res = await fetch('/api/exams/marks/subject-wise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId, subject_id: subjectId, rows }),
    });
    const data = await res.json();
    await alert(data.message || data.error || 'Saved', {
      title: data.success ? 'Success' : 'Error',
      type: data.success ? 'success' : 'error',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Marks Feeding</h1>
          <p className="mt-1 text-sm text-gray-500">Enter marks subject-wise or open the full exam + class grid.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab('subject')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'subject' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>
            Subject Wise
          </button>
          <button type="button" onClick={() => setTab('class')} className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'class' ? 'bg-primary-600 text-white' : 'border bg-white'}`}>
            Exam + Class Wise
          </button>
        </div>

        {tab === 'class' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-600 mb-3">
              Use the existing exam card to enter all subjects for a class at once.
            </p>
            <Link href="/exams" className="inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
              Open exam + class marks grid
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <select value={examId} onChange={(e) => { setExamId(e.target.value); setSubjectId(''); }} className="rounded-lg border px-3 py-2 text-sm bg-white">
                <option value="">Select exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} {exam.class_name ? `· ${exam.class_name}` : ''}
                  </option>
                ))}
              </select>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white" disabled={!examId}>
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={save} disabled={!students.length} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                Save marks
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Marks / {totalMarks}</th>
                    <th className="px-3 py-2">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-gray-500">Select an exam and subject.</td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="border-t">
                        <td className="px-3 py-2">
                          {student.first_name} {student.last_name}
                          <div className="text-xs text-gray-500">{student.admission_number}</div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={totalMarks}
                            disabled={drafts[student.id]?.absent}
                            value={drafts[student.id]?.marks || ''}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [student.id]: { ...prev[student.id], marks: e.target.value, absent: prev[student.id]?.absent || false } }))
                            }
                            className="w-24 rounded-lg border px-2 py-1.5"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={drafts[student.id]?.absent || false}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [student.id]: { marks: prev[student.id]?.marks || '', absent: e.target.checked } }))
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
