'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AnnualMarksheet, { type MarksheetData } from '@/features/exams/components/AnnualMarksheet';
import type { ReportSettings } from '@/lib/report-settings';
import { FiAward, FiPrinter, FiInfo, FiFileText } from 'react-icons/fi';

interface Class { id: number; name: string; }
interface Term { id: number; name: string; }
interface Exam { id: number; name: string; exam_type: string; class_id: number; class_name?: string; }

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

export default function ReportCardsPage() {
  const [mode, setMode] = useState<'report' | 'marksheet'>('marksheet');
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [examId, setExamId] = useState('');
  const [halfYearlyExamId, setHalfYearlyExamId] = useState('');
  const [annualExamId, setAnnualExamId] = useState('');
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
  const [error, setError] = useState('');
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then((d) => d.success && setClasses(d.data));
    fetch('/api/exam-terms').then((r) => r.json()).then((d) => d.success && setTerms(d.data));
  }, []);

  useEffect(() => {
    if (!classId) {
      setExams([]);
      setExamId('');
      setHalfYearlyExamId('');
      setAnnualExamId('');
      return;
    }
    fetch(`/api/exams?class_id=${classId}`)
      .then((r) => r.json())
      .then((d) => d.success && setExams(d.data));
  }, [classId]);

  const loadReportCards = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    let url = `/api/report-cards?class_id=${classId}&only_with_results=true`;
    if (termId) url += `&term_id=${termId}`;
    if (examId) url += `&exam_id=${examId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setCards(data.data);
      setReportSettings(data.meta?.report_settings || null);
      if (data.data.length === 0) {
        setError('No report cards found. Upload exam results on Exams & Results page first.');
      }
    } else {
      setError(data.error || 'Failed to generate report cards');
      setCards([]);
      setReportSettings(null);
    }
    setLoading(false);
  }, [classId, termId, examId]);

  const loadMarksheets = useCallback(async () => {
    if (!classId || !annualExamId) return;
    setLoading(true);
    setError('');
    let url = `/api/marksheets?class_id=${classId}&annual_exam_id=${annualExamId}`;
    if (halfYearlyExamId) url += `&half_yearly_exam_id=${halfYearlyExamId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setMarksheets(data.data);
      setMarksheetMeta(data.meta);
      if (data.data.length === 0) {
        setError('No marksheets found. Ensure half-yearly and annual exam results are uploaded for this class.');
      }
    } else {
      setError(data.error || 'Failed to generate marksheets');
      setMarksheets([]);
      setMarksheetMeta(null);
    }
    setLoading(false);
  }, [classId, halfYearlyExamId, annualExamId]);

  const handleGenerate = () => {
    if (mode === 'report') loadReportCards();
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

  const canGenerate = mode === 'report' ? !!classId : !!classId && !!annualExamId;
  const hasOutput = mode === 'report' ? cards.length > 0 : marksheets.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 max-w-full print:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl flex items-center gap-2">
              <FiAward className="text-primary-600" /> Report Cards & Marksheets
            </h1>
            <p className="text-sm text-gray-500">Generate simple report cards or CBSE-style annual marksheets</p>
          </div>
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

        {/* Mode tabs */}
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => { setMode('marksheet'); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              mode === 'marksheet' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiFileText size={16} /> Annual Marksheet
          </button>
          <button
            type="button"
            onClick={() => { setMode('report'); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              mode === 'report' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiAward size={16} /> Simple Report Card
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 print:hidden">
          <p className="font-medium flex items-center gap-2 mb-2">
            <FiInfo />
            {mode === 'marksheet' ? 'How to generate annual marksheet (CBSE style)' : 'How to generate simple report cards'}
          </p>
          {mode === 'marksheet' ? (
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Create <strong>Half-Yearly</strong> exam on Exams page → upload results for all subjects</li>
              <li>Create <strong>Annual / Final</strong> exam with same subjects → upload results</li>
              <li>Select class, pick both exams below, click <strong>Generate Marksheet</strong></li>
              <li>Print — each student gets a marksheet with half-yearly + annual marks per subject</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Upload exam results on <strong>Exams & Results</strong></li>
              <li>Select class and optionally one exam</li>
              <li>Click <strong>Generate</strong></li>
            </ol>
          )}
        </div>

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
              }}
              className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
            >
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {mode === 'marksheet' ? (
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
            {loading ? 'Generating...' : mode === 'marksheet' ? 'Generate Marksheet' : 'Generate Report Cards'}
          </button>
        </div>

        {error && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 print:hidden">
            {error}
          </div>
        )}

        {/* Marksheet output */}
        {mode === 'marksheet' && marksheets.length > 0 && marksheetMeta && (
          <div className="space-y-8 print:space-y-0">
            {marksheets.map((ms) => (
              <AnnualMarksheet
                key={ms.student.admission_number}
                data={ms}
                school={marksheetMeta.school}
                annualExamName={marksheetMeta.annual_exam.name}
                halfYearlyExamName={marksheetMeta.half_yearly_exam?.name}
                reportSettings={marksheetMeta.report_settings}
              />
            ))}
          </div>
        )}

        {/* Simple report cards */}
        {mode === 'report' && (
          <div className="space-y-6 print:space-y-8">
            {cards.map((card) => (
              <div key={card.student.admission_number} className="bg-white border rounded-xl p-6 break-inside-avoid shadow-sm">
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
            ))}
            {cards.length === 0 && !loading && !error && (
              <p className="text-gray-400 text-sm text-center py-12 print:hidden">Select a class and generate report cards</p>
            )}
          </div>
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
            margin: 8mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
