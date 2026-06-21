'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiFilter,
  FiPrinter,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import StudentAttendanceReportOverview from '@/features/attendance/components/StudentAttendanceReportOverview';
import AttendancePrintBatchModal from '@/features/attendance/components/AttendancePrintBatchModal';
import {
  buildCalendarExportContext as createCalendarExportContext,
  downloadCalendarExcel,
  downloadCalendarPdf,
  fetchMonthlyDailyRecords,
  formatClassSectionLabel,
  printCalendarReport,
  type BatchPrintPromptRequest,
  type BatchPrintPromptResult,
  type CalendarPrintProgress,
} from '@/features/attendance/utils/student-attendance-calendar-export';
import { useSettings } from '@/shared/SettingsContext';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';
import { sortClassesByName } from '@/lib/class-sort';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

interface StudentReportRow {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  roll_number?: string | null;
  class_name?: string;
  section_name?: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  half_day: number;
  total_marked: number;
  attendance_percentage: number;
}

interface ReportSummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  half_day: number;
  total_marked: number;
  attendance_percentage: number;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: string;
  remarks?: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800';
    case 'absent':
      return 'bg-red-100 text-red-800';
    case 'late':
      return 'bg-amber-100 text-amber-800';
    case 'half_day':
      return 'bg-orange-100 text-orange-800';
    case 'on_leave':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const REPORT_TABLE_HEAD = 'whitespace-nowrap text-xs font-medium';
const LOW_ATTENDANCE_THRESHOLD = 75;
const CHRONIC_ABSENT_THRESHOLD = 3;

type ReportTab = 'overview' | 'summary' | 'daily' | 'absentees' | 'low';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'summary', label: 'Student Summary' },
  { id: 'daily', label: 'Daily Records' },
  { id: 'absentees', label: 'Absentees' },
  { id: 'low', label: 'Low Attendance' },
];

export default function StudentAttendanceReportsPage() {
  const { settings } = useSettings();
  const now = new Date();
  const [reportTab, setReportTab] = useState<ReportTab>('overview');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [studentRows, setStudentRows] = useState<StudentReportRow[]>([]);
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);
  const [period, setPeriod] = useState({ start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printProgress, setPrintProgress] = useState<CalendarPrintProgress | null>(null);
  type PendingBatchPrompt = {
    request: BatchPrintPromptRequest;
    resolve: (result: BatchPrintPromptResult) => void;
  };
  const [batchPrompt, setBatchPrompt] = useState<PendingBatchPrompt | null>(null);
  const batchPromptRef = useRef<PendingBatchPrompt | null>(null);
  const printAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClasses(sortClassesByName(data.data as ClassOption[]));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId('');
      return;
    }
    fetch(`/api/sections?class_id=${classId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSections(data.data);
      })
      .catch(console.error);
  }, [classId]);

  const loadSummaryReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      if (classId) params.set('class_id', classId);
      if (sectionId) params.set('section_id', sectionId);

      const response = await fetch(`/api/attendance/students/reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.data.summary);
        setStudentRows(data.data.students);
        setPeriod(data.data.period);
        setMigrationRequired(false);
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setSummary(null);
        setStudentRows([]);
      }
    } catch (error) {
      console.error('Error loading attendance summary:', error);
    } finally {
      setLoading(false);
    }
  }, [month, year, classId, sectionId]);

  const loadDailyReport = useCallback(async () => {
    setLoading(true);
    try {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const params = new URLSearchParams({ start_date: start, end_date: end });
      if (classId) params.set('class_id', classId);
      if (sectionId) params.set('section_id', sectionId);

      const response = await fetch(`/api/attendance/students?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDailyRecords(data.data);
        setPeriod({ start_date: start, end_date: end });
        setMigrationRequired(false);
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setDailyRecords([]);
      }
    } catch (error) {
      console.error('Error loading daily attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [month, year, classId, sectionId]);

  useEffect(() => {
    loadSummaryReport();
  }, [loadSummaryReport]);

  useEffect(() => {
    if (reportTab === 'daily') loadDailyReport();
  }, [reportTab, loadDailyReport]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studentRows;
    return studentRows.filter(
      (row) =>
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(q) ||
        row.admission_number.toLowerCase().includes(q) ||
        (row.roll_number && String(row.roll_number).toLowerCase().includes(q))
    );
  }, [studentRows, search]);

  const filteredDaily = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dailyRecords;
    return dailyRecords.filter(
      (row) =>
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(q) ||
        row.admission_number.toLowerCase().includes(q)
    );
  }, [dailyRecords, search]);

  const filteredAbsentees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentRows.filter((row) => {
      if (row.absent <= 0) return false;
      if (!q) return true;
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(q) ||
        row.admission_number.toLowerCase().includes(q) ||
        (row.roll_number && String(row.roll_number).toLowerCase().includes(q))
      );
    });
  }, [studentRows, search]);

  const filteredLowAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentRows.filter((row) => {
      if (row.attendance_percentage >= LOW_ATTENDANCE_THRESHOLD) return false;
      if (!q) return true;
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(q) ||
        row.admission_number.toLowerCase().includes(q) ||
        (row.roll_number && String(row.roll_number).toLowerCase().includes(q))
      );
    });
  }, [studentRows, search]);

  const chronicAbsenteeCount = useMemo(
    () =>
      studentRows.filter(
        (row) =>
          row.absent >= CHRONIC_ABSENT_THRESHOLD ||
          row.attendance_percentage < LOW_ATTENDANCE_THRESHOLD,
      ).length,
    [studentRows],
  );

  const activeTableRows = useMemo(() => {
    if (reportTab === 'daily') return filteredDaily;
    if (reportTab === 'absentees') return filteredAbsentees;
    if (reportTab === 'low') return filteredLowAttendance;
    return filteredStudents;
  }, [reportTab, filteredDaily, filteredAbsentees, filteredLowAttendance, filteredStudents]);

  const isStudentTableTab = reportTab === 'summary' || reportTab === 'absentees' || reportTab === 'low';

  const summaryColumns = useMemo<VirtualizedTableColumn<StudentReportRow>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        width: 'minmax(180px, 2fr)',
        headerClassName: REPORT_TABLE_HEAD,
        render: (row) => (
          <span className="text-gray-900 truncate">
            {row.first_name} {row.last_name}
            {row.roll_number ? (
              <span className="text-gray-400 font-normal ml-1">· Roll {row.roll_number}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'admission',
        header: 'Admission No.',
        width: 'minmax(7.5rem, 1fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (row) => row.admission_number,
      },
      {
        key: 'class',
        header: 'Class',
        width: 'minmax(120px, 1.2fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (row) => (
          <>
            {row.class_name || '—'}
            {row.section_name ? ` · ${row.section_name}` : ''}
          </>
        ),
      },
      {
        key: 'present',
        header: 'Present',
        width: '4.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right text-green-700`,
        cellClassName: 'justify-end text-green-600',
        render: (row) => row.present,
      },
      {
        key: 'absent',
        header: 'Absent',
        width: '4.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right text-red-700`,
        cellClassName: 'justify-end text-red-600',
        render: (row) => row.absent,
      },
      {
        key: 'late',
        header: 'Late',
        width: '4rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right text-amber-700`,
        cellClassName: 'justify-end text-amber-600',
        render: (row) => row.late,
      },
      {
        key: 'on_leave',
        header: 'On Leave',
        width: '5.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right text-blue-700`,
        cellClassName: 'justify-end text-blue-600',
        render: (row) => row.on_leave,
      },
      {
        key: 'half_day',
        header: 'Half Day',
        width: '5.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right`,
        cellClassName: 'justify-end text-gray-700',
        render: (row) => row.half_day,
      },
      {
        key: 'marked',
        header: 'Marked',
        width: '4.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right`,
        cellClassName: 'justify-end text-gray-600',
        render: (row) => row.total_marked,
      },
      {
        key: 'percentage',
        header: 'Attendance %',
        width: '6.5rem',
        headerClassName: `${REPORT_TABLE_HEAD} text-right`,
        cellClassName: 'justify-end',
        render: (row) => {
          const rate = row.attendance_percentage;
          const tone =
            rate >= 85
              ? 'bg-green-100 text-green-800'
              : rate >= LOW_ATTENDANCE_THRESHOLD
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800';
          return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>
              {rate}%
            </span>
          );
        },
      },
    ],
    []
  );

  const dailyColumns = useMemo<VirtualizedTableColumn<AttendanceRecord>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: 'minmax(100px, 0.9fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (record) => new Date(record.date).toLocaleDateString('en-IN'),
      },
      {
        key: 'student',
        header: 'Student',
        width: 'minmax(160px, 1.5fr)',
        headerClassName: REPORT_TABLE_HEAD,
        render: (record) => (
          <span className="text-gray-900 truncate">
            {record.first_name} {record.last_name}
          </span>
        ),
      },
      {
        key: 'admission',
        header: 'Admission No.',
        width: 'minmax(7.5rem, 1fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (record) => record.admission_number,
      },
      {
        key: 'class',
        header: 'Class',
        width: 'minmax(120px, 1.2fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (record) => (
          <>
            {record.class_name || '—'}
            {record.section_name ? ` · ${record.section_name}` : ''}
          </>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'minmax(100px, 1fr)',
        headerClassName: REPORT_TABLE_HEAD,
        render: (record) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(record.status)}`}
          >
            {formatStatus(record.status)}
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
        width: 'minmax(140px, 1.5fr)',
        headerClassName: REPORT_TABLE_HEAD,
        cellClassName: 'text-gray-500',
        render: (record) => (
          <span className="truncate" title={record.remarks || undefined}>
            {record.remarks || '—'}
          </span>
        ),
      },
    ],
    []
  );

  const schoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      address: settings.school_address || '',
      phone: settings.school_phone || '',
      email: settings.school_email || '',
      logoUrl: settings.logo_url || '',
    }),
    [settings],
  );

  const promptBatchPrint = useCallback((request: BatchPrintPromptRequest) => {
    return new Promise<BatchPrintPromptResult>((resolve) => {
      if (batchPromptRef.current) {
        batchPromptRef.current.resolve('exit');
      }

      const pending: PendingBatchPrompt = { request, resolve };
      batchPromptRef.current = pending;
      setBatchPrompt(pending);
    });
  }, []);

  const answerBatchPrintPrompt = useCallback((result: BatchPrintPromptResult) => {
    if (result === 'exit') {
      printAbortRef.current?.abort();
    }

    const pending = batchPromptRef.current;
    batchPromptRef.current = null;
    setBatchPrompt(null);
    pending?.resolve(result);
  }, []);

  const buildCalendarExportContext = useCallback(async () => {
    const className = classes.find((c) => c.id.toString() === classId)?.name;
    const sectionName = sections.find((s) => s.id.toString() === sectionId)?.name;
    const classLabel = formatClassSectionLabel(className, sectionName, 'All Classes');
    const dailyRecordsForExport = await fetchMonthlyDailyRecords({
      month,
      year,
      classId: classId || undefined,
      sectionId: sectionId || undefined,
    });

    return createCalendarExportContext(
      filteredStudents,
      dailyRecordsForExport,
      month,
      year,
      classLabel,
      summary,
      schoolInfo,
    );
  }, [classes, classId, sections, sectionId, month, year, filteredStudents, summary, schoolInfo]);

  const handleExportPdf = async () => {
    if (filteredStudents.length === 0) return;
    setExporting(true);
    try {
      const context = await buildCalendarExportContext();
      await downloadCalendarPdf(context);
    } catch (error) {
      console.error('Error exporting attendance PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) return;
    setExporting(true);
    try {
      const context = await buildCalendarExportContext();
      downloadCalendarExcel(context);
    } catch (error) {
      console.error('Error exporting attendance Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintCalendarReport = async () => {
    if (filteredStudents.length === 0) return;
    setExporting(true);
    setPrintProgress(null);
    const abortController = new AbortController();
    printAbortRef.current = abortController;
    try {
      const context = await buildCalendarExportContext();
      await printCalendarReport(context, {
        onProgress: setPrintProgress,
        promptBatch: promptBatchPrint,
        signal: abortController.signal,
      });
    } catch (error) {
      console.error('Error printing attendance report:', error);
    } finally {
      printAbortRef.current = null;
      const pending = batchPromptRef.current;
      batchPromptRef.current = null;
      setBatchPrompt(null);
      pending?.resolve('exit');
      setExporting(false);
      setPrintProgress(null);
    }
  };

  const resetFilters = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setClassId('');
    setSectionId('');
    setSearch('');
  };

  const tableTitle = useMemo(() => {
    switch (reportTab) {
      case 'summary':
        return `Student Summary (${filteredStudents.length})`;
      case 'daily':
        return `Daily Records (${filteredDaily.length})`;
      case 'absentees':
        return `Absentees (${filteredAbsentees.length})`;
      case 'low':
        return `Low Attendance (${filteredLowAttendance.length})`;
      default:
        return '';
    }
  }, [
    reportTab,
    filteredStudents.length,
    filteredDaily.length,
    filteredAbsentees.length,
    filteredLowAttendance.length,
  ]);

  const canExportOrPrint = filteredStudents.length > 0;

  const kpiCards = summary
    ? [
        {
          label: 'Total Students',
          value: summary.total_students,
          sub: `${filteredStudents.length} in view`,
          valueClass: 'text-gray-900',
          icon: FiUsers,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          label: 'Attendance %',
          value: `${summary.attendance_percentage}%`,
          sub: `${summary.total_marked} records`,
          valueClass: 'text-primary-700',
          icon: FiBarChart2,
          iconBg: 'bg-primary-100',
          iconColor: 'text-primary-600',
        },
        {
          label: 'Absent',
          value: summary.absent,
          sub: `${pct(summary.absent, summary.total_marked)}% of records`,
          valueClass: 'text-red-600',
          icon: FiXCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        },
        {
          label: 'Chronic Absentees',
          value: chronicAbsenteeCount,
          sub: chronicAbsenteeCount > 0 ? 'Action needed' : 'None flagged',
          valueClass: chronicAbsenteeCount > 0 ? 'text-amber-700' : 'text-gray-900',
          icon: FiAlertTriangle,
          iconBg: chronicAbsenteeCount > 0 ? 'bg-amber-100' : 'bg-gray-100',
          iconColor: chronicAbsenteeCount > 0 ? 'text-amber-600' : 'text-gray-500',
        },
        {
          label: 'Late',
          value: summary.late,
          sub: `${pct(summary.late, summary.total_marked)}% of records`,
          valueClass: 'text-amber-600',
          icon: FiClock,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="p-2 max-w-7xl mx-auto space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Student Attendance Reports</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Review detailed attendance by student, class, section, or date range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Link
              href="/attendance/students"
              className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <FiCheckCircle size={14} />
              Mark Attendance
            </Link>
            {canExportOrPrint && (
              <>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiDownload size={14} />
                  {exporting && !printProgress ? 'Exporting…' : 'Export PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiDownload size={14} />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={handlePrintCalendarReport}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiPrinter size={14} />
                  {exporting && printProgress
                    ? `Printing ${printProgress.batchIndex}/${printProgress.batchTotal}…`
                    : 'Print'}
                </button>
              </>
            )}
          </div>
        </div>

        {printProgress && !batchPrompt && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-lg text-xs">
            Printing part {printProgress.batchIndex} of {printProgress.batchTotal}…
          </div>
        )}

        {summary && kpiCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                        {card.label}
                      </p>
                      <p className={`text-lg leading-tight mt-0.5  ${card.valueClass}`}>
                        {card.value}
                      </p>
                      {card.sub && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{card.sub}</p>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full shrink-0 ${card.iconBg}`}>
                      <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setFiltersExpanded((open) => !open)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={filtersExpanded}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FiFilter className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Filters</p>
                {!filtersExpanded && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} {year}
                    {classId
                      ? ` · ${classes.find((c) => c.id.toString() === classId)?.name ?? 'Class'}`
                      : ' · All Classes'}
                    {sectionId
                      ? ` · ${sections.find((s) => s.id.toString() === sectionId)?.name ?? 'Section'}`
                      : classId
                        ? ' · All Sections'
                        : ''}
                    {search ? ` · "${search}"` : ''}
                  </p>
                )}
              </div>
            </div>
            {filtersExpanded ? (
              <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            ) : (
              <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            )}
          </button>

          {filtersExpanded && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <label className="block text-xs font-medium text-gray-600">
                  Month
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Year
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Class
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setSectionId('');
                    }}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Section
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    disabled={!classId}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white disabled:bg-gray-50"
                  >
                    <option value="">All Sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Search student
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or admission no."
                    className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </label>
              </div>

              {period.start_date && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <FiCalendar size={13} />
                  Period: {new Date(period.start_date).toLocaleDateString('en-IN')} –{' '}
                  {new Date(period.end_date).toLocaleDateString('en-IN')}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded(false)}
                  className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Apply Filter
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {migrationRequired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
            Student attendance is not set up for this school yet. Mark attendance first to build
            records.
          </div>
        )}

        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-0.5">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportTab(tab.id)}
              className={`px-3 py-1.5 rounded-t-md text-sm font-medium border-b-2 -mb-px transition-colors ${
                reportTab === tab.id
                  ? 'border-primary-600 text-primary-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-3">
          <div className="min-w-0 space-y-3">
            {reportTab === 'overview' ? (
              loading ? (
                <div className="flex justify-center py-12 bg-white border border-gray-200 rounded-lg">
                  <div className="animate-spin h-7 w-7 border-b-2 border-primary-600 rounded-full" />
                </div>
              ) : summary ? (
                <div className="space-y-3">
                  <StudentAttendanceReportOverview
                    summary={summary}
                    students={filteredStudents}
                    lowThreshold={LOW_ATTENDANCE_THRESHOLD}
                  />
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
                      <h2 className="text-sm font-semibold text-gray-900">
                        Student Summary ({filteredStudents.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => setReportTab('summary')}
                        className="text-sm text-primary-700 hover:text-primary-800 font-medium"
                      >
                        View all
                      </button>
                    </div>
                    <VirtualizedTable
                      key={`overview-summary-${month}-${year}-${classId}-${sectionId}-${search}`}
                      rows={filteredStudents}
                      columns={summaryColumns}
                      getRowKey={(row) => row.student_id}
                      emptyMessage="No students found for the selected filters."
                      minWidth={1200}
                      rowHeight={44}
                      maxHeight="min(45vh, 420px)"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500 text-center">
                  No attendance data for the selected filters.
                </div>
              )
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">{tableTitle}</h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canExportOrPrint && (
                      <>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          disabled={exporting}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-700 border border-primary-200 px-2.5 py-1.5 rounded-md hover:bg-primary-50 disabled:opacity-50"
                        >
                          <FiDownload size={14} />
                          Export PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          disabled={exporting}
                          className="inline-flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          <FiDownload size={14} />
                          Export Excel
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintCalendarReport}
                          disabled={exporting}
                          className="inline-flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          <FiPrinter size={14} />
                          Print
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-7 w-7 border-b-2 border-primary-600 rounded-full" />
                  </div>
                ) : isStudentTableTab ? (
                  <VirtualizedTable
                    key={`${reportTab}-${month}-${year}-${classId}-${sectionId}-${search}`}
                    rows={activeTableRows as StudentReportRow[]}
                    columns={summaryColumns}
                    getRowKey={(row) => row.student_id}
                    emptyMessage={
                      reportTab === 'absentees'
                        ? 'No absent students for the selected filters.'
                        : reportTab === 'low'
                          ? 'No students below the attendance threshold.'
                          : 'No students found for the selected filters.'
                    }
                    minWidth={1200}
                    rowHeight={44}
                    maxHeight="min(65vh, 680px)"
                  />
                ) : (
                  <VirtualizedTable
                    key={`daily-${month}-${year}-${classId}-${sectionId}-${search}`}
                    rows={filteredDaily}
                    columns={dailyColumns}
                    getRowKey={(row) => row.id}
                    emptyMessage="No attendance records found for the selected period."
                    minWidth={900}
                    rowHeight={44}
                    maxHeight="min(65vh, 680px)"
                  />
                )}
              </div>
            )}
          </div>

          <aside className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 h-fit xl:sticky xl:top-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="space-y-1.5">
              <Link
                href="/attendance/students"
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <FiCheckCircle size={14} className="text-primary-600 shrink-0" />
                Mark Attendance
              </Link>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!canExportOrPrint || exporting}
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload size={14} className="shrink-0" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!canExportOrPrint || exporting}
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload size={14} className="shrink-0" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handlePrintCalendarReport}
                disabled={!canExportOrPrint || exporting}
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPrinter size={14} className="shrink-0" />
                Print Report
              </button>
              {reportTab === 'low' && filteredLowAttendance.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReportTab('absentees')}
                  className="flex w-full items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-800 hover:bg-amber-100"
                >
                  <FiAlertTriangle size={14} className="shrink-0" />
                  View Absentees
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <AttendancePrintBatchModal
        open={Boolean(batchPrompt)}
        request={batchPrompt?.request ?? null}
        onContinue={() => answerBatchPrintPrompt('continue')}
        onExit={() => answerBatchPrintPrompt('exit')}
      />
    </DashboardLayout>
  );
}
