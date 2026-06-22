'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AnnualMarksheet, { type MarksheetData } from '@/features/exams/components/AnnualMarksheet';
import PerformanceReport from '@/features/exams/components/PerformanceReport';
import type { PerformanceReportData } from '@/services/exams/performance-report-builder';
import type { ReportSettings } from '@/lib/report-settings';
import { useDialog } from '@/shared/context/DialogContext';
import {
  buildReportCardFilename,
  downloadReportElementAsPdf,
  printReportElement,
} from '@/features/exams/utils/report-card-download';
import { FiAward, FiPrinter, FiInfo, FiFileText, FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';

interface Class { id: number; name: string; }
interface Term { id: number; name: string; }
interface Exam { id: number; name: string; exam_type: string; class_id: number; class_name?: string; }
interface ClassStudent {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
}

type ReportSubject = {
  subject_name: string;
  exam_name: string;
  exam_type: string;
  marks_obtained: string;
  max_marks: string | number;
  grade: string;
};

type ReportCard = {
  student: {
    id?: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    class_name: string;
    section_name: string | null;
  };
  school: { school_name: string; school_address: string; academic_year?: string };
  subjects: ReportSubject[];
  summary: {
    percentage: number;
    overall_grade: string;
    passed_subjects: number;
    total_subjects: number;
  };
};

type PageMode = 'performance' | 'marksheet' | 'report';
type PerformanceReportType = 'term' | 'half_yearly' | 'annual';

export default function ReportCardsPage() {
  const { alert } = useDialog();
  const [mode, setMode] = useState<PageMode>('performance');
  const [performanceType, setPerformanceType] = useState<PerformanceReportType>('half_yearly');
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [termId, setTermId] = useState('');
  const [examId, setExamId] = useState('');
  const [halfYearlyExamId, setHalfYearlyExamId] = useState('');
  const [annualExamId, setAnnualExamId] = useState('');
  const [unitTestExamId, setUnitTestExamId] = useState('');
  const [unitTest1ExamId, setUnitTest1ExamId] = useState('');
  const [unitTest2ExamId, setUnitTest2ExamId] = useState('');
  const [performanceReports, setPerformanceReports] = useState<PerformanceReportData[]>([]);
  const [performanceMeta, setPerformanceMeta] = useState<{
    school: Record<string, string>;
    report_settings?: ReportSettings;
  } | null>(null);
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [marksheets, setMarksheets] = useState<MarksheetData[]>([]);
  const [marksheetMeta, setMarksheetMeta] = useState<{
    school: Record<string, string>;
    annual_exam: { name: string };
    half_yearly_exam: { name: string } | null;
    report_settings?: ReportSettings;
  } | null>(null);
  const [reportSettings, setReportSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then((d) => d.success && setClasses(d.data));
    fetch('/api/exam-terms').then((r) => r.json()).then((d) => d.success && setTerms(d.data));
  }, []);

  useEffect(() => {
    if (!classId) {
      setExams([]);
      setClassStudents([]);
      setExamId('');
      setHalfYearlyExamId('');
      setAnnualExamId('');
      setUnitTestExamId('');
      setUnitTest1ExamId('');
      setUnitTest2ExamId('');
      setStudentId('');
      return;
    }
    fetch(`/api/exams?class_id=${classId}`)
      .then((r) => r.json())
      .then((d) => d.success && setExams(d.data));
    fetch(`/api/students?class_id=${classId}&limit=50000&page=1`)
      .then((r) => r.json())
      .then((d) => d.success && setClassStudents(d.data));
  }, [classId]);

  const reportCardElementId = (admissionNumber: string) =>
    `report-card-${admissionNumber.replace(/[^\w-]/g, '_')}`;

  const performanceElementId = (admissionNumber: string) =>
    `performance-report-${admissionNumber.replace(/[^\w-]/g, '_')}`;

  const marksheetElementId = (admissionNumber: string) =>
    `marksheet-${admissionNumber.replace(/[^\w-]/g, '_')}`;

  const handleDownloadPdf = async (
    elementId: string,
    filename: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
  ) => {
    const element = document.getElementById(elementId);
    if (!element) {
      await alert('Could not find the report to download. Try generating again.', {
        title: 'Download failed',
        type: 'error',
      });
      return;
    }
    setDownloadingId(elementId);
    try {
      await downloadReportElementAsPdf(element, filename, orientation);
    } catch (err) {
      console.error(err);
      await alert('Failed to generate PDF. Please try again.', { title: 'Download failed', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintOne = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    printReportElement(element);
  };

  const loadReportCards = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    let url = `/api/report-cards?class_id=${classId}&only_with_results=true`;
    if (studentId) url += `&student_id=${studentId}`;
    if (termId) url += `&term_id=${termId}`;
    if (examId) url += `&exam_id=${examId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setCards(data.data);
      setReportSettings(data.meta?.report_settings || null);
      if (data.data.length === 0) {
        setError(
          studentId
            ? 'No report card found for this student. Upload exam results on Exams & Results page first.'
            : 'No report cards found. Upload exam results on Exams & Results page first.',
        );
      }
    } else {
      setError(data.error || 'Failed to generate report cards');
      setCards([]);
      setReportSettings(null);
    }
    setLoading(false);
  }, [classId, studentId, termId, examId]);

  const loadMarksheets = useCallback(async () => {
    if (!classId || !annualExamId) return;
    setLoading(true);
    setError('');
    let url = `/api/marksheets?class_id=${classId}&annual_exam_id=${annualExamId}`;
    if (studentId) url += `&student_id=${studentId}`;
    if (halfYearlyExamId) url += `&half_yearly_exam_id=${halfYearlyExamId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setMarksheets(data.data);
      setMarksheetMeta(data.meta);
      if (data.data.length === 0) {
        setError(
          studentId
            ? 'No marksheet found for this student. Ensure half-yearly and annual exam results are uploaded.'
            : 'No marksheets found. Ensure half-yearly and annual exam results are uploaded for this class.',
        );
      }
    } else {
      setError(data.error || 'Failed to generate marksheets');
      setMarksheets([]);
      setMarksheetMeta(null);
    }
    setLoading(false);
  }, [classId, studentId, halfYearlyExamId, annualExamId]);

  const loadPerformanceReports = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    let url = `/api/performance-reports?class_id=${classId}&report_type=${performanceType}`;
    if (studentId) url += `&student_id=${studentId}`;

    if (performanceType === 'term') {
      if (!examId) {
        setError('Select a term exam');
        setLoading(false);
        return;
      }
      url += `&exam_id=${examId}`;
    } else if (performanceType === 'half_yearly') {
      if (!halfYearlyExamId) {
        setError('Select a half yearly exam');
        setLoading(false);
        return;
      }
      url += `&half_yearly_exam_id=${halfYearlyExamId}`;
      if (unitTestExamId) url += `&unit_test_exam_id=${unitTestExamId}`;
    } else {
      if (!annualExamId) {
        setError('Select an annual exam');
        setLoading(false);
        return;
      }
      url += `&annual_exam_id=${annualExamId}`;
      if (halfYearlyExamId) url += `&half_yearly_exam_id=${halfYearlyExamId}`;
      if (unitTest1ExamId) url += `&unit_test_1_exam_id=${unitTest1ExamId}`;
      if (unitTest2ExamId) url += `&unit_test_2_exam_id=${unitTest2ExamId}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setPerformanceReports(data.data);
      setPerformanceMeta(data.meta);
      if (data.data.length === 0) {
        setError(
          studentId
            ? 'No performance report found for this student. Upload exam results first.'
            : 'No performance reports found. Upload exam results for the selected exams.',
        );
      }
    } else {
      setError(data.error || 'Failed to generate performance reports');
      setPerformanceReports([]);
      setPerformanceMeta(null);
    }
    setLoading(false);
  }, [
    classId,
    studentId,
    performanceType,
    examId,
    halfYearlyExamId,
    unitTestExamId,
    annualExamId,
    unitTest1ExamId,
    unitTest2ExamId,
  ]);

  const handleGenerate = () => {
    if (mode === 'performance') loadPerformanceReports();
    else if (mode === 'report') loadReportCards();
    else loadMarksheets();
  };

  const addTerm = async () => {
    if (!newTerm.trim()) return;
    const year = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
    const res = await fetch('/api/exam-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTerm.trim(), academic_year: year }),
    });
    const data = await res.json();
    if (data.success) {
      setTerms((t) => [...t, data.data]);
      setNewTerm('');
    }
  };

  const formatExamType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const generateLabel = studentId
    ? mode === 'performance'
      ? 'Generate Performance Report'
      : mode === 'marksheet'
        ? 'Generate Marksheet'
        : 'Generate Report Card'
    : mode === 'performance'
      ? 'Generate Performance Reports'
      : mode === 'marksheet'
        ? 'Generate Marksheets'
        : 'Generate Report Cards';

  const canGenerate =
    mode === 'performance'
      ? !!classId &&
        (performanceType === 'term'
          ? !!examId
          : performanceType === 'half_yearly'
            ? !!halfYearlyExamId
            : !!annualExamId)
      : mode === 'report'
        ? !!classId
        : !!classId && !!annualExamId;
  const hasOutput =
    mode === 'performance'
      ? performanceReports.length > 0
      : mode === 'report'
        ? cards.length > 0
        : marksheets.length > 0;

  const clearOutput = () => {
    setCards([]);
    setMarksheets([]);
    setPerformanceReports([]);
    setMarksheetMeta(null);
    setPerformanceMeta(null);
    setReportSettings(null);
    setError('');
  };

  const handleModeChange = (next: PageMode) => {
    setMode(next);
    setError('');
    setShowHelp(false);
    clearOutput();
  };

  const handlePerformanceTypeChange = (next: PerformanceReportType) => {
    setPerformanceType(next);
    setError('');
    clearOutput();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 max-w-full print:space-y-0">
        <div className="flex flex-col gap-3 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl flex items-center gap-2">
                <FiAward className="text-primary-600 shrink-0" /> Report Cards & Marksheets
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Print performance reports
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHelp((open) => !open)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  showHelp
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiInfo size={16} className="shrink-0" />
                <span className="text-left">
                  {mode === 'performance'
                    ? 'How to generate performance reports (Term / Half Yearly / Annual)'
                    : mode === 'marksheet'
                      ? 'How to generate annual marksheet (CBSE style)'
                      : 'How to generate simple report cards'}
                </span>
                {showHelp ? <FiChevronUp size={14} className="shrink-0" /> : <FiChevronDown size={14} className="shrink-0" />}
              </button>
              {hasOutput && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  <FiPrinter size={16} /> Print All
                </button>
              )}
            </div>
          </div>

          {showHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
              {mode === 'performance' ? (
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Upload exam results on <strong>Exams & Results</strong> for the relevant exams</li>
                  <li>Select <strong>Term</strong>, <strong>Half Yearly</strong>, or <strong>Annual</strong> report type</li>
                  <li>Pick class, required exam(s), optionally unit test exams and one student</li>
                  <li>Click <strong>Generate</strong>, then <strong>Print</strong> or <strong>Download PDF</strong> per student</li>
                </ol>
              ) : mode === 'marksheet' ? (
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Create <strong>Half-Yearly</strong> exam on Exams page → upload results for all subjects</li>
                  <li>Create <strong>Annual / Final</strong> exam with same subjects → upload results</li>
                  <li>Select class, pick both exams below, optionally one student, click <strong>Generate Marksheet</strong></li>
                  <li>Use <strong>Print</strong> or <strong>Download PDF</strong> on each student&apos;s marksheet</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Upload exam results on <strong>Exams & Results</strong></li>
                  <li>Select class and optionally one exam or one student</li>
                  <li>Click <strong>Generate</strong>, then print or download PDF per student</li>
                </ol>
              )}
            </div>
          )}
        </div>

        {/* Mode tabs */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => handleModeChange('performance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              mode === 'performance' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiAward size={16} /> Performance Report
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('marksheet')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              mode === 'marksheet' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiFileText size={16} /> Annual Marksheet
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('report')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              mode === 'report' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiAward size={16} /> Simple Report Card
          </button>
        </div>

        {mode === 'performance' && (
          <div className="flex flex-wrap gap-2 print:hidden">
            {(
              [
                { id: 'term' as const, label: 'Term Exam' },
                { id: 'half_yearly' as const, label: 'Half Yearly Exam' },
                { id: 'annual' as const, label: 'Annual Exam' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePerformanceTypeChange(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  performanceType === t.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-4 print:hidden">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class *</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setExamId('');
                setHalfYearlyExamId('');
                setAnnualExamId('');
                setUnitTestExamId('');
                setUnitTest1ExamId('');
                setUnitTest2ExamId('');
                setStudentId('');
                clearOutput();
              }}
              className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Student (optional)</label>
            <select
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                clearOutput();
              }}
              disabled={!classId}
              className="border rounded-lg px-3 py-2 text-sm min-w-[220px] disabled:bg-gray-100"
            >
              <option value="">All students in class</option>
              {classStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.admission_number} — {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          {mode === 'performance' ? (
            <>
              {performanceType === 'term' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Term Exam *</label>
                  <select
                    value={examId}
                    onChange={(e) => {
                      setExamId(e.target.value);
                      clearOutput();
                    }}
                    disabled={!classId}
                    className="border rounded-lg px-3 py-2 text-sm min-w-[200px] disabled:bg-gray-100"
                  >
                    <option value="">Select term exam</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                    ))}
                  </select>
                </div>
              )}
              {performanceType === 'half_yearly' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit Test (UT-1) optional</label>
                    <select
                      value={unitTestExamId}
                      onChange={(e) => {
                        setUnitTestExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[200px] disabled:bg-gray-100"
                    >
                      <option value="">No unit test</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Half Yearly Exam *</label>
                    <select
                      value={halfYearlyExamId}
                      onChange={(e) => {
                        setHalfYearlyExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[200px] disabled:bg-gray-100"
                    >
                      <option value="">Select half yearly exam</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {performanceType === 'annual' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit Test 1 (optional)</label>
                    <select
                      value={unitTest1ExamId}
                      onChange={(e) => {
                        setUnitTest1ExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:bg-gray-100"
                    >
                      <option value="">No UT-1</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Half Yearly (optional)</label>
                    <select
                      value={halfYearlyExamId}
                      onChange={(e) => {
                        setHalfYearlyExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:bg-gray-100"
                    >
                      <option value="">No half yearly</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit Test 2 (optional)</label>
                    <select
                      value={unitTest2ExamId}
                      onChange={(e) => {
                        setUnitTest2ExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:bg-gray-100"
                    >
                      <option value="">No UT-2</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Annual Exam *</label>
                    <select
                      value={annualExamId}
                      onChange={(e) => {
                        setAnnualExamId(e.target.value);
                        clearOutput();
                      }}
                      disabled={!classId}
                      className="border rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:bg-gray-100"
                    >
                      <option value="">Select annual exam</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          ) : mode === 'marksheet' ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Half-Yearly Exam</label>
                <select
                  value={halfYearlyExamId}
                  onChange={(e) => setHalfYearlyExamId(e.target.value)}
                  disabled={!classId}
                  className="border rounded-lg px-3 py-2 text-sm min-w-[200px] disabled:bg-gray-100"
                >
                  <option value="">Select half-yearly exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Annual Exam *</label>
                <select
                  value={annualExamId}
                  onChange={(e) => setAnnualExamId(e.target.value)}
                  disabled={!classId}
                  className="border rounded-lg px-3 py-2 text-sm min-w-[200px] disabled:bg-gray-100"
                >
                  <option value="">Select annual exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Exam (optional)</label>
                <select
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  disabled={!classId}
                  className="border rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:bg-gray-100"
                >
                  <option value="">All exams with results</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({formatExamType(e.exam_type)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Term (optional)</label>
                <select value={termId} onChange={(e) => setTermId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm min-w-[140px]">
                  <option value="">All terms</option>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Generating...' : generateLabel}
          </button>
        </div>

        {error && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 print:hidden">
            {error}
          </div>
        )}

        {/* Performance report output */}
        {mode === 'performance' && performanceReports.length > 0 && performanceMeta && (
          <div className="space-y-8 print:space-y-0">
            {performanceReports.map((pr) => {
              const elementId = performanceElementId(pr.student.admission_number);
              const filename = buildReportCardFilename(
                `performance_${performanceType}`,
                pr.student.admission_number,
                pr.student.first_name,
                pr.student.last_name,
              );
              return (
                <div key={pr.student.admission_number} className="space-y-2 print:space-y-0">
                  <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => handlePrintOne(elementId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <FiPrinter size={14} /> Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(elementId, filename, 'portrait')}
                      disabled={downloadingId === elementId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <FiDownload size={14} />
                      {downloadingId === elementId ? 'Downloading…' : 'Download PDF'}
                    </button>
                  </div>
                  <div id={elementId}>
                    <PerformanceReport
                      data={pr}
                      school={performanceMeta.school}
                      reportSettings={performanceMeta.report_settings}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Marksheet output */}
        {mode === 'marksheet' && marksheets.length > 0 && marksheetMeta && (
          <div className="space-y-8 print:space-y-0">
            {marksheets.map((ms) => {
              const elementId = marksheetElementId(ms.student.admission_number);
              const filename = buildReportCardFilename(
                'marksheet',
                ms.student.admission_number,
                ms.student.first_name,
                ms.student.last_name,
              );
              return (
                <div key={ms.student.admission_number} className="space-y-2 print:space-y-0">
                  <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => handlePrintOne(elementId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <FiPrinter size={14} /> Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(elementId, filename, 'portrait')}
                      disabled={downloadingId === elementId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <FiDownload size={14} />
                      {downloadingId === elementId ? 'Downloading…' : 'Download PDF'}
                    </button>
                  </div>
                  <div id={elementId}>
                    <AnnualMarksheet
                      data={ms}
                      school={marksheetMeta.school}
                      annualExamName={marksheetMeta.annual_exam.name}
                      halfYearlyExamName={marksheetMeta.half_yearly_exam?.name}
                      reportSettings={marksheetMeta.report_settings}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Simple report cards */}
        {mode === 'report' && (
          <div className="space-y-6 print:space-y-8">
            {cards.map((card) => {
              const elementId = reportCardElementId(card.student.admission_number);
              const filename = buildReportCardFilename(
                'report_card',
                card.student.admission_number,
                card.student.first_name,
                card.student.last_name,
              );
              return (
              <div
                key={card.student.admission_number}
                id={elementId}
                className="bg-white border rounded-xl p-6 break-inside-avoid shadow-sm"
              >
                <div className="flex flex-wrap justify-end gap-2 mb-4 print:hidden">
                  <button
                    type="button"
                    onClick={() => handlePrintOne(elementId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FiPrinter size={14} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(elementId, filename, 'portrait')}
                    disabled={downloadingId === elementId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <FiDownload size={14} />
                    {downloadingId === elementId ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
                <div className="text-center border-b pb-4 mb-4">
                  {reportSettings?.logo_url ? (
                    <img
                      src={reportSettings.logo_url}
                      alt=""
                      className="w-16 h-16 mx-auto object-contain mb-2"
                    />
                  ) : null}
                  <h2 className="text-xl font-semibold">{card.school?.school_name || 'School'}</h2>
                  {card.school?.school_address && <p className="text-sm text-gray-500">{card.school.school_address}</p>}
                  <h3 className="text-lg font-semibold mt-2">Report Card</h3>
                  {card.school?.academic_year && <p className="text-xs text-gray-500 mt-1">Academic Year: {card.school.academic_year}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <p><strong>Student:</strong> {card.student.first_name} {card.student.last_name}</p>
                  <p><strong>Admission No:</strong> {card.student.admission_number}</p>
                  <p><strong>Class:</strong> {card.student.class_name}{card.student.section_name ? ` - ${card.student.section_name}` : ''}</p>
                  <p><strong>Overall:</strong> {card.summary.overall_grade} ({card.summary.percentage}%)</p>
                </div>
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border">Subject</th>
                      <th className="text-left p-2 border">Exam</th>
                      <th className="p-2 border">Marks</th>
                      <th className="p-2 border">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.subjects.map((s, i) => (
                      <tr key={i}>
                        <td className="p-2 border">{s.subject_name || '—'}</td>
                        <td className="p-2 border text-gray-600">{s.exam_name}</td>
                        <td className="p-2 border text-center">{s.marks_obtained}/{s.max_marks}</td>
                        <td className="p-2 border text-center font-medium">{s.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })}
            {cards.length === 0 && !loading && !error && (
              <p className="text-gray-400 text-sm text-center py-12 print:hidden">Select a class and generate report cards</p>
            )}
          </div>
        )}

        {mode === 'performance' && performanceReports.length === 0 && !loading && !error && (
          <p className="text-gray-400 text-sm text-center py-12 print:hidden">
            Select class, report type, required exam(s), then click Generate Performance Report
          </p>
        )}

        {mode === 'marksheet' && marksheets.length === 0 && !loading && !error && (
          <p className="text-gray-400 text-sm text-center py-12 print:hidden">
            Select class, half-yearly exam, annual exam, then click Generate Marksheet
          </p>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .marksheet-page, .marksheet-page * { visibility: visible; }
          .marksheet-page {
            position: relative;
            page-break-after: always;
            margin: 0 auto;
            box-shadow: none;
          }
          @page {
            size: A4 portrait;
            margin: 2mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
