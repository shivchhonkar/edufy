'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  FiUsers,
  FiClock,
  FiCalendar,
  FiEdit,
  FiCheckCircle,
  FiSend,
  FiPlus,
  FiBarChart2,
  FiCpu,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import RecordAttendanceModal from '@/features/attendance/components/RecordAttendanceModal';
import MarkStaffAttendancePanel, {
  type MarkStaffAttendancePanelHandle,
} from '@/features/attendance/components/MarkStaffAttendancePanel';
import PunchMachineModal from '@/features/attendance/components/PunchMachineModal';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface Department {
  id: number;
  name: string;
}

interface AttendanceRecord {
  id: number;
  staff_id: number;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours_worked?: number;
  status: string;
  attendance_type: string;
  remarks?: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface AttendanceStats {
  total_staff: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
}

interface PunchLog {
  id: number;
  device_id: string;
  staff_id: number;
  punch_time: string;
  punch_type: string;
  processed: boolean;
  first_name: string;
  last_name: string;
  employee_id: string;
  device_name: string;
}

function buildAttendanceStats(records: AttendanceRecord[], staffCount: number): AttendanceStats {
  return {
    total_staff: staffCount,
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

function getStatusColor(status: string) {
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
    case 'not_marked':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatStatus(status: string) {
  if (status === 'not_marked') return 'Not Marked';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Normalize API/DB date values to YYYY-MM-DD in local time for consistent map keys. */
function normalizeAttendanceDateKey(value: unknown): string {
  if (!value) return '';

  if (value instanceof Date) {
    return formatDateLocal(value);
  }

  const str = String(value).trim();
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateLocal(parsed);
  }

  const isoPrefix = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoPrefix?.[1] ?? str.slice(0, 10);
}

function attendanceHistoryKey(staffId: unknown, dateValue: unknown): string {
  return `${Number(staffId)}-${normalizeAttendanceDateKey(dateValue)}`;
}

function enumerateDates(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];

  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime()) || current > last) {
    return [];
  }

  while (current <= last) {
    dates.push(formatDateLocal(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function mergeStaffAttendanceHistory(
  staffList: Staff[],
  records: AttendanceRecord[],
  startDate: string,
  endDate: string,
): AttendanceRecord[] {
  const dates = enumerateDates(startDate, endDate);
  if (!dates.length || !staffList.length) return records;

  const recordMap = new Map<string, AttendanceRecord>();
  for (const record of records) {
    recordMap.set(attendanceHistoryKey(record.staff_id, record.attendance_date), record);
  }

  const merged: AttendanceRecord[] = [];

  for (const date of dates) {
    for (const member of staffList) {
      const existing = recordMap.get(attendanceHistoryKey(member.id, date));
      if (existing) {
        merged.push(existing);
        continue;
      }

      merged.push({
        id: 0,
        staff_id: member.id,
        attendance_date: date,
        status: 'not_marked',
        attendance_type: '—',
        first_name: member.first_name,
        last_name: member.last_name,
        employee_id: member.employee_id,
        department: member.department,
        position: member.position,
      });
    }
  }

  merged.sort((a, b) => {
    const dateCompare = normalizeAttendanceDateKey(b.attendance_date).localeCompare(
      normalizeAttendanceDateKey(a.attendance_date),
    );
    if (dateCompare !== 0) return dateCompare;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  return merged;
}

function formatTime(time: string | null | undefined) {
  if (!time) return '—';
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(hours: number | null | undefined) {
  if (!hours) return '—';
  return `${hours.toFixed(1)}h`;
}

function formatDateTime(dateTime: string) {
  return new Date(dateTime).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total_staff: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    on_leave_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showPunchMachineModal, setShowPunchMachineModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<
    'mark' | 'individual' | 'history' | 'punch-machines'
  >('mark');
  const [submitState, setSubmitState] = useState({ canSubmit: false, saving: false });
  const [statsExpanded, setStatsExpanded] = useState(false);
  const attendancePanelRef = useRef<MarkStaffAttendancePanelHandle>(null);
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    department: '',
    status: '',
  });

  const loadStats = async () => {
    const staffResponse = await fetch('/api/staff?limit=500&status=active');
    const staffData = await staffResponse.json();
    const staffList: Staff[] = staffData.success ? staffData.data : [];
    setStaff(staffList);

    const today = new Date().toISOString().split('T')[0];
    const statsResponse = await fetch(`/api/attendance?start_date=${today}&end_date=${today}`);
    const statsData = await statsResponse.json();
    if (statsData.success) {
      setStats(buildAttendanceStats(statsData.data, staffList.length));
      setMigrationRequired(false);
    } else if (statsData.migration_required) {
      setMigrationRequired(true);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);

      const staffParams = new URLSearchParams({ limit: '500', status: 'active' });
      if (filters.department) staffParams.set('department', filters.department);

      const includeUnmarked = !filters.status;
      const requests: Promise<Response>[] = [fetch(`/api/attendance?${params.toString()}`)];
      if (includeUnmarked) {
        requests.unshift(fetch(`/api/staff?${staffParams.toString()}`));
      }

      const responses = await Promise.all(requests);
      const staffResponse = includeUnmarked ? responses[0] : null;
      const attendanceResponse = includeUnmarked ? responses[1] : responses[0];

      const data = await attendanceResponse.json();
      let staffList: Staff[] = staff;

      if (includeUnmarked && staffResponse) {
        const staffData = await staffResponse.json();
        if (staffData.success) {
          staffList = (staffData.data as Array<Staff & { department_name?: string }>).map(
            (member) => ({
              ...member,
              department: member.department_name || member.department || '',
            }),
          );
          setStaff(staffList);
        } else if (staff.length > 0) {
          staffList = staff;
        }
      }

      if (data.success) {
        const records = data.data as AttendanceRecord[];
        setAttendanceRecords(
          includeUnmarked
            ? mergeStaffAttendanceHistory(
                staffList,
                records,
                filters.start_date,
                filters.end_date,
              )
            : records,
        );
        setMigrationRequired(false);
      } else if (data.migration_required) {
        setMigrationRequired(true);
        setAttendanceRecords([]);
      } else {
        setAttendanceRecords([]);
      }

      await loadStats();
    } catch (error) {
      console.error('Error loading attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPunchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await fetch(`/api/attendance/punch-machine?${params.toString()}`);
      const data = await response.json();
      setPunchLogs(data.success ? data.data : []);
      await loadStats();
    } catch (error) {
      console.error('Error loading punch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      })
      .catch(console.error);

    loadStats().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'punch-machines') loadPunchLogs();
  }, [activeTab, filters]);

  const handleRecordSuccess = () => {
    loadStats();
    if (activeTab === 'history') loadHistory();
    setShowRecordModal(false);
    setSelectedRecord(null);
  };

  const handleMarkSaved = () => {
    loadStats();
    if (activeTab === 'history') loadHistory();
  };

  const historyColumns = useMemo<VirtualizedTableColumn<AttendanceRecord>[]>(
    () => [
      {
        key: 'staff',
        header: 'Staff Member',
        width: 'minmax(180px, 2fr)',
        render: (record) => (
          <div className="min-w-0">
            <div className="text-gray-900 truncate">
              {record.first_name} {record.last_name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {record.employee_id} · {record.department}
            </div>
          </div>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        width: 'minmax(100px, 1fr)',
        cellClassName: 'text-gray-600',
        render: (record) =>
          new Date(record.attendance_date).toLocaleDateString('en-IN'),
      },
      {
        key: 'check_in',
        header: 'Check In',
        width: '90px',
        cellClassName: 'text-gray-600',
        render: (record) => formatTime(record.check_in_time),
      },
      {
        key: 'check_out',
        header: 'Check Out',
        width: '90px',
        cellClassName: 'text-gray-600',
        render: (record) => formatTime(record.check_out_time),
      },
      {
        key: 'hours',
        header: 'Hours',
        width: '72px',
        cellClassName: 'text-gray-600',
        render: (record) => formatHours(record.total_hours_worked),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'minmax(100px, 1fr)',
        render: (record) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}
          >
            {formatStatus(record.status)}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        width: 'minmax(90px, 1fr)',
        cellClassName: 'text-gray-600 capitalize',
        render: (record) =>
          record.status === 'not_marked' ? '—' : record.attendance_type.replace(/_/g, ' '),
      },
      {
        key: 'actions',
        header: '',
        width: '48px',
        render: (record) =>
          record.status === 'not_marked' ? null : (
            <button
              type="button"
              onClick={() => {
                setSelectedRecord(record);
                setShowRecordModal(true);
              }}
              className="text-primary-600 hover:text-primary-800 p-1"
              title="Edit"
            >
              <FiEdit className="w-4 h-4" />
            </button>
          ),
      },
    ],
    []
  );

  const punchColumns = useMemo<VirtualizedTableColumn<PunchLog>[]>(
    () => [
      {
        key: 'staff',
        header: 'Staff Member',
        width: 'minmax(160px, 1.5fr)',
        render: (log) => (
          <div>
            <div className="font-medium text-gray-900">
              {log.first_name} {log.last_name}
            </div>
            <div className="text-xs text-gray-500">{log.employee_id}</div>
          </div>
        ),
      },
      {
        key: 'device',
        header: 'Device',
        width: 'minmax(140px, 1.5fr)',
        render: (log) => (
          <div>
            <div>{log.device_name}</div>
            <div className="text-xs text-gray-500">{log.device_id}</div>
          </div>
        ),
      },
      {
        key: 'time',
        header: 'Punch Time',
        width: 'minmax(160px, 1.5fr)',
        cellClassName: 'text-gray-600',
        render: (log) => formatDateTime(log.punch_time),
      },
      {
        key: 'type',
        header: 'Type',
        width: 'minmax(100px, 1fr)',
        cellClassName: 'text-gray-600 capitalize',
        render: (log) => log.punch_type.replace(/_/g, ' '),
      },
      {
        key: 'processed',
        header: 'Processed',
        width: '100px',
        render: (log) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              log.processed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {log.processed ? 'Yes' : 'Pending'}
          </span>
        ),
      },
    ],
    []
  );

  const statCards = [
    {
      label: 'Total Staff',
      value: stats.total_staff,
      sub: null,
      valueClass: 'text-gray-900',
      icon: FiUsers,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Present Today',
      value: stats.present_today,
      sub: `${pct(stats.present_today, stats.total_staff)}%`,
      valueClass: 'text-green-600',
      icon: FiCheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Absent Today',
      value: stats.absent_today,
      sub: `${pct(stats.absent_today, stats.total_staff)}%`,
      valueClass: 'text-red-600',
      icon: FiCalendar,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'Late Today',
      value: stats.late_today,
      sub: `${pct(stats.late_today, stats.total_staff)}%`,
      valueClass: 'text-amber-600',
      icon: FiClock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'On Leave',
      value: stats.on_leave_today,
      sub: `${pct(stats.on_leave_today, stats.total_staff)}%`,
      valueClass: 'text-blue-600',
      icon: FiCalendar,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-2 max-w-7xl mx-auto space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg text-gray-900">Staff Attendance</h1>
              <p className="text-gray-600 mt-1 text-sm">
                Mark attendance.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatsExpanded((open) => !open)}
                className="inline-flex max-w-[min(100%,22rem)] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                aria-expanded={statsExpanded}
              >
                <span className="shrink-0 font-medium text-gray-900">{!statsExpanded ? 'Stats ': 'Collapse Stats '}</span>
                {!statsExpanded && (
                  <span className="hidden truncate text-xs text-gray-500 sm:inline">
                    {stats.total_staff} staff · {stats.present_today} present ·{' '}
                    {stats.absent_today} absent · {stats.late_today} late · {stats.on_leave_today}{' '}
                    on leave
                  </span>
                )}
                {statsExpanded ? (
                  <FiChevronUp className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                ) : (
                  <FiChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPunchMachineModal(true)}
                className="inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <FiCpu size={16} />
                Punch Machines
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecord(null);
                  setShowRecordModal(true);
                }}
                className="inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <FiPlus size={16} />
                Detailed Entry
              </button>
            </div>
          </div>

          {statsExpanded && (
            <div className="flex gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm">
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
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            Attendance tables are not set up for this school yet. Run the staff attendance migration
            to enable recording and reports.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-3 flex flex-wrap items-center justify-between gap-2">
            <nav className="-mb-px flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('mark')}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'mark'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Mark Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'individual'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Mark Individual Staff
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Attendance History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('punch-machines')}
                className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'punch-machines'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Punch Machine Logs
              </button>
            </nav>
            {(activeTab === 'mark' || activeTab === 'individual') && (
              <button
                type="button"
                onClick={() => attendancePanelRef.current?.submit()}
                disabled={!submitState.canSubmit || submitState.saving}
                className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 shrink-0 mb-1.5"
              >
                <FiSend size={14} />
                {submitState.saving ? 'Submitting...' : 'Submit Attendance'}
              </button>
            )}
          </div>

          <div className="p-3">
            {activeTab === 'mark' && (
              <MarkStaffAttendancePanel
                ref={attendancePanelRef}
                variant="bulk"
                onSaved={handleMarkSaved}
                onSubmitStateChange={setSubmitState}
              />
            )}

            {activeTab === 'individual' && (
              <MarkStaffAttendancePanel
                ref={attendancePanelRef}
                variant="individual"
                onSaved={handleMarkSaved}
                onSubmitStateChange={setSubmitState}
              />
            )}

            {activeTab === 'history' && (
              <>
                <div className="mb-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">Start Date</span>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">End Date</span>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">Department</span>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">Status</span>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </label>
                </div>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
                  </div>
                ) : (
                  <VirtualizedTable
                    key={`history-${filters.start_date}-${filters.end_date}-${filters.department}-${filters.status}`}
                    rows={attendanceRecords}
                    columns={historyColumns}
                    getRowKey={(row) =>
                      row.id > 0
                        ? String(row.id)
                        : `unmarked-${row.staff_id}-${String(row.attendance_date).slice(0, 10)}`
                    }
                    emptyMessage={
                      filters.status
                        ? 'No attendance records found.'
                        : 'No staff found for the selected filters.'
                    }
                    minWidth={1000}
                  />
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('mark')}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    ← Back to Mark Attendance
                  </button>
                </div>
              </>
            )}

            {activeTab === 'punch-machines' && (
              <>
                <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">Start Date</span>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600 text-xs font-medium">End Date</span>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
                  </div>
                ) : (
                  <VirtualizedTable
                    key={`punch-${filters.start_date}-${filters.end_date}`}
                    rows={punchLogs}
                    columns={punchColumns}
                    getRowKey={(row) => row.id}
                    emptyMessage="No punch machine logs found."
                    minWidth={800}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showRecordModal && (
        <RecordAttendanceModal
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedRecord(null);
          }}
          onSuccess={handleRecordSuccess}
          staff={staff}
          editingRecord={selectedRecord}
        />
      )}

      {showPunchMachineModal && (
        <PunchMachineModal
          isOpen={showPunchMachineModal}
          onClose={() => setShowPunchMachineModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
