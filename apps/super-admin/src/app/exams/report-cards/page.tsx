'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';

type ReportView = 'exam_student' | 'exam_class' | 'final_student' | 'final_class' | 'calculated';

const VIEWS: Array<{ id: ReportView; label: string }> = [
  { id: 'exam_student', label: 'Exam + Student Wise' },
  { id: 'exam_class', label: 'Exam + Class Wise' },
  { id: 'final_student', label: 'Final Student Wise' },
  { id: 'final_class', label: 'Final Class Wise' },
  { id: 'calculated', label: 'Calculated' },
];

export default function ExamReportCardsPage() {
  const [view, setView] = useState<ReportView>('exam_class');
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [exams, setExams] = useState<Array<{ id: number; name: string; exam_type: string; class_id: number }>>([]);
  const [students, setStudents] = useState<Array<{ id: number; first_name: string; last_name: string }>>([]);
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [annualExamId, setAnnualExamId] = useState('');
  const [halfYearlyExamId, setHalfYearlyExamId] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/classes').then((res) => res.json()).then((data) => data.success && setClasses(data.data || []));
  }, []);

  useEffect(() => {
    if (!classId) {
      setExams([]);
      setStudents([]);
      return;
    }
    fetch(`/api/exams?class_id=${classId}`).then((res) => res.json()).then((data) => data.success && setExams(data.data || []));
    fetch(`/api/students?class_id=${classId}&limit=50000&page=1`).then((res) => res.json()).then((data) => data.success && setStudents(data.data || []));
  }, [classId]);

  const generate = async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    setRows([]);
    try {
      const needsStudent = view === 'exam_student' || view === 'final_student';
      if (view === 'exam_student' || view === 'exam_class') {
        let url = `/api/report-cards?class_id=${classId}&only_with_results=true`;
        if (examId) url += `&exam_id=${examId}`;
        if (needsStudent && studentId) url += `&student_id=${studentId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) setRows(data.data || []);
        else setError(data.error || 'Failed to generate');
      } else if (view === 'final_student' || view === 'final_class') {
        if (!annualExamId) {
          setError('Select the annual / final exam');
          return;
        }
        let url = `/api/marksheets?class_id=${classId}&annual_exam_id=${annualExamId}`;
        if (halfYearlyExamId) url += `&half_yearly_exam_id=${halfYearlyExamId}`;
        if (needsStudent && studentId) url += `&student_id=${studentId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) setRows(data.data || []);
        else setError(data.error || 'Failed to generate');
      } else {
        let url = `/api/performance-reports?class_id=${classId}&report_type=annual`;
        if (annualExamId) url += `&annual_exam_id=${annualExamId}`;
        if (halfYearlyExamId) url += `&half_yearly_exam_id=${halfYearlyExamId}`;
        if (examId) url += `&exam_id=${examId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) setRows(data.data || []);
        else setError(data.error || 'Failed to generate');
      }
    } finally {
      setLoading(false);
    }
  };

  const printRows = () => {
    printHtmlDocument(
      'Report Cards',
      `<h1>${VIEWS.find((item) => item.id === view)?.label}</h1>
       <table>
         <thead><tr><th>Student</th><th>Class</th><th>Result</th></tr></thead>
         <tbody>${rows
           .map((row) => {
             const student = (row.student || row) as Record<string, unknown>;
             const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || String(student.full_name || '');
             const summary = (row.summary || {}) as Record<string, unknown>;
             return `<tr><td>${name}</td><td>${student.class_name || ''}</td><td>${summary.overall_grade || summary.percentage || ''}</td></tr>`;
           })
           .join('')}</tbody>
       </table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Report Cards</h1>
          <p className="mt-1 text-sm text-gray-500">Exam-wise, final, and calculated report cards. Branding is on Report Card Setup.</p>
        </div>
        <ExamModuleLinks />
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((item) => (
            <button key={item.id} type="button" onClick={() => setView(item.id)} className={`rounded-lg px-3 py-1.5 text-sm ${view === item.id ? 'bg-primary-600 text-white' : 'border bg-white'}`}>
              {item.label}
            </button>
          ))}
          <Link href="/settings/reports" className="rounded-lg border bg-white px-3 py-1.5 text-sm">Report Card Setup</Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">Select class</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          {(view === 'exam_student' || view === 'exam_class' || view === 'calculated') && (
            <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Exam</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </select>
          )}
          {(view === 'final_student' || view === 'final_class' || view === 'calculated') && (
            <>
              <select value={halfYearlyExamId} onChange={(e) => setHalfYearlyExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
                <option value="">Half yearly</option>
                {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
              </select>
              <select value={annualExamId} onChange={(e) => setAnnualExamId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
                <option value="">Final / annual</option>
                {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
              </select>
            </>
          )}
          {(view === 'exam_student' || view === 'final_student') && (
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={generate} disabled={!classId || loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate'}
          </button>
          {rows.length > 0 && (
            <button type="button" onClick={printRows} className="rounded-lg border px-4 py-2 text-sm">Print</button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="bg-white rounded-xl border divide-y">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">Generate a report to see students here. Full printable cards are also on Report Cards.</p>
          ) : (
            rows.map((row, index) => {
              const student = (row.student || row) as Record<string, unknown>;
              const summary = (row.summary || {}) as Record<string, unknown>;
              return (
                <div key={String(student.id || index)} className="px-4 py-3 text-sm flex justify-between">
                  <span>{String(student.first_name || '')} {String(student.last_name || '')}</span>
                  <span className="text-gray-600">{String(summary.overall_grade || summary.percentage || 'Ready')}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
