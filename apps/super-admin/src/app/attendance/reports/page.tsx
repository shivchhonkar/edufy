'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
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

function resolveDefaultClassId(classes: ClassOption[]): string {
  const classOne = classes.find((c) => c.name.trim().toLowerCase() === 'class 1');
  const defaultClass = classOne ?? sortClassesByName(classes)[0];
  return defaultClass ? defaultClass.id.toString() : '';
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

export default function StudentAttendanceReportsPage() {
  const now = new Date();
  const [reportView, setReportView] = useState<'summary' | 'daily'>('summary');
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

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClasses(sortClassesByName(data.data as ClassOption[]));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classId || classes.length === 0) return;
    const defaultId = resolveDefaultClassId(classes);
    if (defaultId) setClassId(defaultId);
  }, [classes, classId]);

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
    if (reportView === 'summary') loadSummaryReport();
    else loadDailyReport();
  }, [reportView, loadSummaryReport, loadDailyReport]);

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

  const summaryColumns = useMemo<VirtualizedTableColumn<StudentReportRow>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        width: 'minmax(180px, 2fr)',
        render: (row) => (
          <span className="font-medium text-gray-900 truncate">
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
        width: 'minmax(110px, 1fr)',
        cellClassName: 'text-gray-600',
        render: (row) => row.admission_number,
      },
      {
        key: 'class',
        header: 'Class',
        width: 'minmax(120px, 1.2fr)',
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
        width: '72px',
        headerClassName: 'text-right text-green-700',
        cellClassName: 'justify-end text-green-600',
        render: (row) => row.present,
      },
      {
        key: 'absent',
        header: 'Absent',
        width: '72px',
        headerClassName: 'text-right text-red-700',
        cellClassName: 'justify-end text-red-600',
        render: (row) => row.absent,
      },
      {
        key: 'late',
        header: 'Late',
        width: '64px',
        headerClassName: 'text-right text-amber-700',
        cellClassName: 'justify-end text-amber-600',
        render: (row) => row.late,
      },
      {
        key: 'on_leave',
        header: 'On Leave',
        width: '80px',
        headerClassName: 'text-right text-blue-700',
        cellClassName: 'justify-end text-blue-600',
        render: (row) => row.on_leave,
      },
      {
        key: 'half_day',
        header: 'Half Day',
        width: '80px',
        headerClassName: 'text-right',
        cellClassName: 'justify-end text-gray-700',
        render: (row) => row.half_day,
      },
      {
        key: 'marked',
        header: 'Marked',
        width: '72px',
        headerClassName: 'text-right',
        cellClassName: 'justify-end text-gray-600',
        render: (row) => row.total_marked,
      },
      {
        key: 'percentage',
        header: 'Attendance %',
        width: '96px',
        headerClassName: 'text-right',
        cellClassName: 'justify-end font-semibold text-gray-900',
        render: (row) => `${row.attendance_percentage}%`,
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
        cellClassName: 'text-gray-600',
        render: (record) => new Date(record.date).toLocaleDateString('en-IN'),
      },
      {
        key: 'student',
        header: 'Student',
        width: 'minmax(160px, 1.5fr)',
        render: (record) => (
          <span className="font-medium text-gray-900 truncate">
            {record.first_name} {record.last_name}
          </span>
        ),
      },
      {
        key: 'admission',
        header: 'Admission No.',
        width: 'minmax(110px, 1fr)',
        cellClassName: 'text-gray-600',
        render: (record) => record.admission_number,
      },
      {
        key: 'class',
        header: 'Class',
        width: 'minmax(120px, 1.2fr)',
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

  const exportSummaryCsv = () => {
    const headers = [
      'Student',
      'Admission No.',
      'Roll No.',
      'Class',
      'Section',
      'Present',
      'Absent',
      'Late',
      'On Leave',
      'Half Day',
      'Total Marked',
      'Attendance %',
    ];
    const lines = filteredStudents.map((row) =>
      [
        `"${row.first_name} ${row.last_name}"`,
        row.admission_number,
        row.roll_number ?? '',
        row.class_name ?? '',
        row.section_name ?? '',
        row.present,
        row.absent,
        row.late,
        row.on_leave,
        row.half_day,
        row.total_marked,
        row.attendance_percentage,
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-attendance-summary-${year}-${String(month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statCards = summary
    ? [
        {
          label: 'Students',
          value: summary.total_students,
          sub: null,
          valueClass: 'text-gray-900',
          icon: FiUsers,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
        {
          label: 'Present',
          value: summary.present,
          sub: `${pct(summary.present, summary.total_marked)}%`,
          valueClass: 'text-green-600',
          icon: FiCheckCircle,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'Absent',
          value: summary.absent,
          sub: `${pct(summary.absent, summary.total_marked)}%`,
          valueClass: 'text-red-600',
          icon: FiXCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        },
        {
          label: 'Late',
          value: summary.late,
          sub: `${pct(summary.late, summary.total_marked)}%`,
          valueClass: 'text-amber-600',
          icon: FiClock,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        },
        {
          label: 'Attendance Rate',
          value: `${summary.attendance_percentage}%`,
          sub: `${summary.total_marked} records`,
          valueClass: 'text-primary-700',
          icon: FiBarChart2,
          iconBg: 'bg-primary-100',
          iconColor: 'text-primary-600',
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Student Attendance Reports</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Review student attendance by class, section, and date range.
            </p>
          </div>
          <Link
            href="/attendance/students"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <FiCheckCircle size={16} />
            Mark Attendance
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['summary', 'daily'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setReportView(view)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  reportView === view
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {view === 'summary' ? 'Summary by Student' : 'Daily Records'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Month</span>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Year</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Class</span>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Section</span>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Search student</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or admission no."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          {period.start_date && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <FiCalendar size={14} />
              Period: {new Date(period.start_date).toLocaleDateString('en-IN')} –{' '}
              {new Date(period.end_date).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>

        {migrationRequired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            Student attendance is not set up for this school yet. Mark attendance first to build
            records.
          </div>
        )}

        {reportView === 'summary' && summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{card.label}</p>
                      <p className={`text-xl mt-0.5 ${card.valueClass}`}>
                        {card.value}
                        {card.sub && (
                          <span className="text-sm font-normal text-gray-400 ml-1">{card.sub}</span>
                        )}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-full ${card.iconBg}`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              {reportView === 'summary'
                ? `Student-wise Summary (${filteredStudents.length})`
                : `Daily Attendance Log (${filteredDaily.length})`}
            </h2>
            {reportView === 'summary' && filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={exportSummaryCsv}
                className="inline-flex items-center gap-2 text-sm text-primary-700 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50"
              >
                <FiDownload size={14} />
                Export CSV
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
            </div>
          ) : reportView === 'summary' ? (
            <VirtualizedTable
              key={`summary-${month}-${year}-${classId}-${sectionId}-${search}`}
              rows={filteredStudents}
              columns={summaryColumns}
              getRowKey={(row) => row.student_id}
              emptyMessage="No students found for the selected filters."
              minWidth={1100}
            />
          ) : (
            <VirtualizedTable
              key={`daily-${month}-${year}-${classId}-${sectionId}-${search}`}
              rows={filteredDaily}
              columns={dailyColumns}
              getRowKey={(row) => row.id}
              emptyMessage="No attendance records found for the selected period."
              minWidth={900}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
