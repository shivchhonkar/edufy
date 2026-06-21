'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FiUsers,
  FiClock,
  FiCalendar,
  FiEdit,
  FiCheckCircle,
  FiSend,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RecordStudentAttendanceModal from '@/features/attendance/components/RecordStudentAttendanceModal';
import MarkStudentAttendancePanel, {
  type MarkStudentAttendancePanelHandle,
} from '@/features/attendance/components/MarkStudentAttendancePanel';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
}

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
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

interface AttendanceStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
}

function buildAttendanceStats(records: AttendanceRecord[], studentCount: number): AttendanceStats {
  return {
    total_students: studentCount,
    present_today: records.filter((r) => r.status === 'present').length,
    absent_today: records.filter((r) => r.status === 'absent').length,
    late_today: records.filter((r) => r.status === 'late').length,
    on_leave_today: records.filter((r) => r.status === 'on_leave').length,
  };
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

const HISTORY_TABLE_HEAD = 'whitespace-nowrap text-xs font-medium';

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800';
    case 'absent':
      return 'bg-red-100 text-red-800';
    case 'late':
      return 'bg-yellow-100 text-yellow-800';
    case 'half_day':
      return 'bg-orange-100 text-orange-800';
    case 'on_leave':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function StudentAttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    on_leave_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'mark' | 'individual' | 'history'>('mark');
  const [submitState, setSubmitState] = useState({ canSubmit: false, saving: false });
  const [statsExpanded, setStatsExpanded] = useState(false);
  const attendancePanelRef = useRef<MarkStudentAttendancePanelHandle>(null);
  const [filterSlotEl, setFilterSlotEl] = useState<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    class_id: '',
    section_id: '',
    status: '',
  });

  const loadStudents = async () => {
    const response = await fetch('/api/students?limit=500&status=active');
    const data = await response.json();
    if (data.success) {
      setStudents(
        data.data.map((s: Student & { class_name?: string }) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          class_name: s.class_name,
        }))
      );
      return data.data.length;
    }
    return 0;
  };

  const loadStats = async () => {
    const studentCount = await loadStudents();
    const today = new Date().toISOString().split('T')[0];
    const statsResponse = await fetch(`/api/attendance/students?start_date=${today}&end_date=${today}`);
    const statsData = await statsResponse.json();
    if (statsData.success) {
      setStats(buildAttendanceStats(statsData.data, studentCount));
      setMigrationRequired(false);
    } else if (statsData.migration_required) {
      setMigrationRequired(true);
    }
  };

  const loadRecords = async () => {
    if (activeTab !== 'history') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.section_id) params.append('section_id', filters.section_id);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/attendance/students?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAttendanceRecords(data.data);
        setMigrationRequired(false);
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords([]);
      }

      await loadStats();
    } catch (error) {
      console.error('Error loading student attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClasses(data.data);
      })
      .catch(console.error);

    loadStats().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filters.class_id) {
      fetch(`/api/sections?class_id=${filters.class_id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setSections(data.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setFilters((prev) => ({ ...prev, section_id: '' }));
    }
  }, [filters.class_id]);

  useEffect(() => {
    if (activeTab === 'history') loadRecords();
  }, [activeTab, filters]);

  const handleRecordSuccess = () => {
    loadStats();
    if (activeTab === 'history') loadRecords();
    setShowRecordModal(false);
    setSelectedRecord(null);
  };

  const handleMarkSaved = () => {
    loadStats();
    if (activeTab === 'history') loadRecords();
  };

  const openEditRecord = useCallback((record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowRecordModal(true);
  }, []);

  const historyColumns = useMemo<VirtualizedTableColumn<AttendanceRecord>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        width: 'minmax(140px, 1.4fr)',
        headerClassName: HISTORY_TABLE_HEAD,
        render: (record) => (
          <span className="font-medium text-gray-900 truncate">
            {record.first_name} {record.last_name}
          </span>
        ),
      },
      {
        key: 'admission',
        header: 'Admission No.',
        width: 'minmax(7rem, 1fr)',
        headerClassName: HISTORY_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (record) => record.admission_number,
      },
      {
        key: 'class',
        header: 'Class',
        width: 'minmax(100px, 1fr)',
        headerClassName: HISTORY_TABLE_HEAD,
        cellClassName: 'text-gray-600',
        render: (record) => (
          <span className="truncate">
            {record.class_name || '—'}
            {record.section_name ? ` · ${record.section_name}` : ''}
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        width: '6.5rem',
        headerClassName: HISTORY_TABLE_HEAD,
        cellClassName: 'text-gray-600 whitespace-nowrap',
        render: (record) => new Date(record.date).toLocaleDateString('en-IN'),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'minmax(5.5rem, 0.8fr)',
        headerClassName: HISTORY_TABLE_HEAD,
        render: (record) => (
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}
          >
            {formatStatusLabel(record.status)}
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
        width: 'minmax(120px, 1.2fr)',
        headerClassName: HISTORY_TABLE_HEAD,
        cellClassName: 'text-gray-500 min-w-0',
        render: (record) => (
          <span className="truncate" title={record.remarks || undefined}>
            {record.remarks || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '3.5rem',
        headerClassName: `${HISTORY_TABLE_HEAD} text-center`,
        cellClassName: 'justify-center',
        render: (record) => (
          <button
            type="button"
            onClick={() => openEditRecord(record)}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50"
            title="Edit"
          >
            <FiEdit className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [openEditRecord],
  );

  const statCards = [
    {
      label: 'Total Students',
      value: stats.total_students,
      sub: null,
      valueClass: 'text-gray-900',
      icon: FiUsers,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Present Today',
      value: stats.present_today,
      sub: `${pct(stats.present_today, stats.total_students)}%`,
      valueClass: 'text-green-600',
      icon: FiCheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Absent Today',
      value: stats.absent_today,
      sub: `${pct(stats.absent_today, stats.total_students)}%`,
      valueClass: 'text-red-600',
      icon: FiCalendar,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Late Today',
      value: stats.late_today,
      sub: `${pct(stats.late_today, stats.total_students)}%`,
      valueClass: 'text-amber-600',
      icon: FiClock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'On Leave',
      value: stats.on_leave_today,
      sub: `${pct(stats.on_leave_today, stats.total_students)}%`,
      valueClass: 'text-blue-600',
      icon: FiCalendar,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  // FiCheckCircle used above - need import
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Student Attendance</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Mark attendance by class or individually, then review today&apos;s records and history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'history' ? 'mark' : 'history')}
            className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {activeTab === 'history' ? (
              <>
                <FiEdit size={14} />
                Mark Attendance
              </>
            ) : (
              <>
                <FiClock size={14} />
                View Attendance History
              </>
            )}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setStatsExpanded((open) => !open)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={statsExpanded}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Today&apos;s overview</p>
              {!statsExpanded && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {stats.total_students} students · {stats.present_today} present · {stats.absent_today}{' '}
                  absent · {stats.late_today} late · {stats.on_leave_today} on leave
                </p>
              )}
            </div>
            {statsExpanded ? (
              <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            ) : (
              <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
            )}
          </button>

          {statsExpanded && (
            <div className="flex gap-2 overflow-x-auto px-3 pb-3 border-t border-gray-100 pt-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="shrink-0 min-w-[9.5rem] flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                          {card.label}
                        </p>
                        <p className={`text-xl leading-tight mt-0.5 ${card.valueClass}`}>
                          {card.value}
                          {card.sub && (
                            <span className="text-xs font-normal text-gray-400 ml-1">{card.sub}</span>
                          )}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full shrink-0 ${card.iconBg}`}>
                        <Icon className={`w-4 h-4 ${card.iconColor}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {migrationRequired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
            Student attendance table is not set up for this school yet.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-2 flex flex-wrap items-end justify-end gap-3">
            {(activeTab === 'mark' || activeTab === 'individual') && (
              <div ref={setFilterSlotEl} className="flex flex-1 min-w-0 items-end mr-auto" />
            )}
            {activeTab === 'history' && (
              <div className="flex flex-1 min-w-0 items-center gap-3 mr-auto">
                <p className="text-sm font-semibold text-gray-900 py-1">Attendance History</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('mark')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  <FiEdit size={14} />
                  Mark Attendance
                </button>
              </div>
            )}
            {(activeTab === 'mark' || activeTab === 'individual') && (
              <button
                type="button"
                onClick={() => attendancePanelRef.current?.submit()}
                disabled={!submitState.canSubmit || submitState.saving}
                className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 shrink-0"
              >
                <FiSend size={15} />
                {submitState.saving ? 'Submitting...' : 'Submit Attendance'}
              </button>
            )}
          </div>

          <div className="p-3">
            {activeTab === 'mark' && filterSlotEl && (
              <MarkStudentAttendancePanel
                ref={attendancePanelRef}
                classes={classes}
                variant="class"
                filterSlotEl={filterSlotEl}
                onSaved={handleMarkSaved}
                onCancel={() => setActiveTab('mark')}
                onSubmitStateChange={setSubmitState}
              />
            )}

            {activeTab === 'individual' && (
              <MarkStudentAttendancePanel
                ref={attendancePanelRef}
                classes={classes}
                variant="individual"
                onSaved={handleMarkSaved}
                onCancel={() => setActiveTab('mark')}
                onSubmitStateChange={setSubmitState}
              />
            )}

            {activeTab === 'history' && (
              <>
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                    <select
                      value={filters.class_id}
                      onChange={(e) =>
                        setFilters({ ...filters, class_id: e.target.value, section_id: '' })
                      }
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                    <select
                      value={filters.section_id}
                      onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
                      disabled={!filters.class_id}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 bg-white"
                    >
                      <option value="">All Sections</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-14">
                    <div className="animate-spin h-7 w-7 border-b-2 border-primary-600 rounded-full" />
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-14 text-gray-500 text-sm">
                    No attendance records found.
                  </div>
                ) : (
                  <div className="-mx-3 border-t border-gray-100">
                    <VirtualizedTable
                      key={`history-${filters.start_date}-${filters.end_date}-${filters.class_id}-${filters.section_id}-${filters.status}`}
                      rows={attendanceRecords}
                      columns={historyColumns}
                      getRowKey={(record) => record.id}
                      rowHeight={44}
                      maxHeight="min(65vh, 680px)"
                      minWidth={900}
                      emptyMessage="No attendance records found."
                      rowClassName="hover:bg-gray-50/80"
                    />
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('mark')}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    ← Back to Mark Attendance
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showRecordModal && (
        <RecordStudentAttendanceModal
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedRecord(null);
          }}
          onSuccess={handleRecordSuccess}
          students={students}
          editingRecord={selectedRecord}
        />
      )}
    </DashboardLayout>
  );
}
