'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamModuleLinks from '@/features/exams/components/ExamModuleLinks';
import { downloadResultsTemplate, parseResultsImportCsv } from '@/features/exams/utils/exam-results-import-export';
import { useDialog } from '@/shared/context/DialogContext';

interface ExamOption {
  id: number;
  name: string;
  class_id: number;
  class_name?: string;
  subjects?: Array<{ subject_id: number; subject_name: string; total_marks: number; passing_marks: number }>;
}

export default function ImportMarksPage() {
  const { alert } = useDialog();
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState('');
  const [csv, setCsv] = useState('');
  const [saving, setSaving] = useState(false);
  const exam = exams.find((item) => String(item.id) === examId);

  useEffect(() => {
    fetch('/api/exams')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setExams(data.data || []);
      });
  }, []);

  const downloadTemplate = async () => {
    if (!exam) return;
    const res = await fetch(`/api/students?class_id=${exam.class_id}&limit=50000&page=1`);
    const data = await res.json();
    downloadResultsTemplate(exam.name, data.data || [], exam.subjects || []);
  };

  const importMarks = async () => {
    if (!exam) return;
    const studentsRes = await fetch(`/api/students?class_id=${exam.class_id}&limit=50000&page=1`);
    const studentsData = await studentsRes.json();
    const students = studentsData.data || [];
    const parsed = parseResultsImportCsv(csv, students, exam.subjects || [], {});
    const results: Array<{ student_id: number; subject_id: number; marks_obtained: number; is_absent: boolean }> = [];
    for (const [studentId, subjects] of Object.entries(parsed.inputs)) {
      for (const [subjectId, cell] of Object.entries(subjects)) {
        results.push({
          student_id: Number(studentId),
          subject_id: Number(subjectId),
          marks_obtained: parseFloat(cell.marks || '0') || 0,
          is_absent: Boolean(cell.absent),
        });
      }
    }
    if (!results.length) {
      await alert(
        parsed.skippedRows
          ? `No matching students. ${parsed.skippedRows} row(s) skipped.`
          : 'No matching admission numbers found.',
        { title: 'Import failed', type: 'error' }
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      await alert(data.message || data.error || 'Import finished', {
        title: data.success ? 'Success' : 'Error',
        type: data.success ? 'success' : 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Import Marks</h1>
          <p className="mt-1 text-sm text-gray-500">Download a CSV template, fill marks, then import them into an exam.</p>
        </div>
        <ExamModuleLinks />
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">Select exam</option>
            {exams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.class_name ? `· ${item.class_name}` : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={downloadTemplate} disabled={!exam} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
              Download template
            </button>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setCsv(await file.text());
              }}
              className="text-sm"
            />
          </div>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={10} className="w-full rounded-lg border px-3 py-2 text-sm font-mono" />
          <button type="button" onClick={importMarks} disabled={saving || !exam || !csv} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Importing...' : 'Import marks'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
