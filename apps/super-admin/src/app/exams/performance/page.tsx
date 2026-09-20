'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';

type PerfView = 'student' | 'class' | 'teacher' | 'ranks';

function ExamPerformanceContent() {
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as PerfView) || 'class';
  const [view, setView] = useState<PerfView>(initialView);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [exams, setExams] = useState<Array<{ id: number; name: string; class_id: number }>>([]);
  const [students, setStudents] = useState<Array<{ id: number; first_name: string; last_name: string }>>([]);
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch('/api/classes').then((res) => res.json()).then((data) => data.success && setClasses(data.data || []));
    fetch('/api/exams').then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    fetch(`/api/students?class_id=${classId}&limit=50000&page=1`)
      .then((res) => res.json())
      .then((data) => data.success && setStudents(data.data || []));
  }, [classId]);

  const load = useCallback(async () => {
    if (view === 'teacher') {
      const params = new URLSearchParams();
      if (examId) params.set('exam_id', examId);
      if (classId) params.set('class_id', classId);
      const res = await fetch(`/api/exams/teacher-performance?${params}`);
      const data = await res.json();
      if (data.success) setRows(data.data || []);
      return;
    }
    if (view === 'ranks') {
      const params = new URLSearchParams({ limit: '50' });
      if (examId) params.set('exam_id', examId);
      if (classId) params.set('class_id', classId);
      const res = await fetch(`/api/exams/rank-holders?${params}`);
      const data = await res.json();
      if (data.success) setRows(data.data || []);
      return;
    }
    if (!classId || !examId) {
      setRows([]);
      return;
    }
    let url = `/api/performance-reports?class_id=${classId}&report_type=term&exam_id=${examId}`;
    if (view === 'student' && studentId) url += `&student_id=${studentId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [view, classId, examId, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Performance Report</h1>
          <p className="mt-1 text-sm text-gray-500">Student-wise, class-wise, teacher-wise, and rank holders.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex flex-wrap gap-2">
          {([
            ['student', 'Student Wise'],
            ['class', 'Class Wise'],
            ['teacher', 'Teacher Wise'],
            ['ranks', 'Rank Holders'],
          ] as Array<[PerfView, string]>).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`rounded-lg px-3 py-1.5 text-sm ${view === id ? 'bg-primary-600 text-white' : 'border bg-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">All classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">All exams</option>
            {exams.filter((exam) => !classId || String(exam.class_id) === classId).map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
          {view === 'student' && (
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="bg-white rounded-xl border overflow-auto">
          {view === 'teacher' ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Teacher</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2 text-right">Students</th>
                  <th className="px-3 py-2 text-right">Average</th>
                  <th className="px-3 py-2 text-right">Passed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{String(row.teacher_name)}</td>
                    <td className="px-3 py-2">{String(row.subject_name)}</td>
                    <td className="px-3 py-2">{String(row.class_name || '—')}</td>
                    <td className="px-3 py-2 text-right">{String(row.student_count)}</td>
                    <td className="px-3 py-2 text-right">{String(row.average_marks ?? '—')}</td>
                    <td className="px-3 py-2 text-right">{String(row.passed_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : view === 'ranks' ? (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Exam</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={String(row.id || index)} className="border-t">
                    <td className="px-3 py-2">{String(row.class_rank || index + 1)}</td>
                    <td className="px-3 py-2">{String(row.first_name)} {String(row.last_name)}</td>
                    <td className="px-3 py-2">{String(row.class_name || '—')}</td>
                    <td className="px-3 py-2">{String(row.exam_name || '—')}</td>
                    <td className="px-3 py-2 text-right">{String(row.percentage)}</td>
                    <td className="px-3 py-2">{String(row.overall_grade || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="divide-y">
              {rows.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Select a class and exam. Compile results first for rank holders.</p>
              ) : (
                rows.map((row, index) => {
                  const student = (row.student || row) as Record<string, unknown>;
                  const summary = (row.summary || row) as Record<string, unknown>;
                  return (
                    <div key={String(student.id || index)} className="px-4 py-3 text-sm flex justify-between">
                      <span>{String(student.first_name || '')} {String(student.last_name || '')}</span>
                      <span>{String(summary.overall_grade || summary.percentage || '')}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ExamPerformancePage() {
  return (
    <Suspense fallback={<DashboardLayout><p className="p-8 text-sm text-gray-500">Loading performance report...</p></DashboardLayout>}>
      <ExamPerformanceContent />
    </Suspense>
  );
}
