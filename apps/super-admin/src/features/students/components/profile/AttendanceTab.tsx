'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  getMonthDateRange,
  getMonthLabel,
  getRegisterCellStyle,
  REGISTER_LEGEND,
  statusToRegisterCode,
} from '@/features/attendance/utils/attendance-status';

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
}

interface AttendanceTabProps {
  studentId: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  on_leave: 'Leave',
  half_day: 'Half Day',
};

function statusBadgeClass(status: string) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800';
    case 'absent':
      return 'bg-red-100 text-red-800';
    case 'late':
      return 'bg-yellow-100 text-yellow-800';
    case 'on_leave':
      return 'bg-blue-100 text-blue-800';
    case 'half_day':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AttendanceTab({ studentId }: AttendanceTabProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthDateRange(month, year);
      const [attendanceRes, holidaysRes] = await Promise.all([
        fetch(`/api/attendance/students?student_id=${studentId}&start_date=${start}&end_date=${end}`),
        fetch(`/api/holidays?start_date=${start}&end_date=${end}`),
      ]);

      const attendanceData = await attendanceRes.json();
      const holidaysData = await holidaysRes.json();

      if (attendanceData.success) {
        setRecords(attendanceData.data);
        setMigrationRequired(false);
      } else if (attendanceData.migration_required) {
        setMigrationRequired(true);
        setRecords([]);
      } else {
        setRecords([]);
      }

      if (holidaysData.success) {
        setHolidayDates(
          new Set(
            (holidaysData.data as { date: string }[]).map((h) => String(h.date).slice(0, 10)),
          ),
        );
      } else {
        setHolidayDates(new Set());
      }
    } catch {
      setRecords([]);
      setHolidayDates(new Set());
    } finally {
      setLoading(false);
    }
  }, [studentId, month, year]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of records) {
      map.set(String(record.date).slice(0, 10), record);
    }
    return map;
  }, [records]);

  const stats = useMemo(() => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      on_leave: 0,
      half_day: 0,
    };
    for (const record of records) {
      if (record.status in counts) {
        counts[record.status as keyof typeof counts] += 1;
      }
    }
    const marked =
      counts.present + counts.absent + counts.late + counts.on_leave + counts.half_day;
    const attendancePercentage =
      marked > 0 ? Math.round((counts.present / marked) * 100) : 0;
    return { ...counts, marked, attendancePercentage };
  }, [records]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const { daysInMonth } = getMonthDateRange(month, year);
    const startOffset = firstDay.getDay();
    const cells: Array<{
      date: string | null;
      day: number | null;
      code: string;
      status: string | null;
    }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: null, day: null, code: '-', status: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = recordsByDate.get(date);
      const isSunday = new Date(year, month - 1, day).getDay() === 0;
      const isHoliday = holidayDates.has(date);

      let code = '-';
      let status: string | null = null;

      if (record) {
        code = statusToRegisterCode(record.status);
        status = record.status;
      } else if (isHoliday) {
        code = 'H';
        status = 'holiday';
      } else if (isSunday) {
        code = '-';
        status = 'weekend';
      }

      cells.push({ date, day, code, status });
    }

    return cells;
  }, [month, year, recordsByDate, holidayDates]);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const monthLabel = `${getMonthLabel(month)} ${year}`;

  if (migrationRequired) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800 text-center">
        Student attendance is not set up yet. Mark attendance to build records.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FiCalendar className="text-primary-600" />
            Attendance Calendar
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Monthly attendance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
            aria-label="Previous month"
          >
            <FiChevronLeft />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[9rem] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
            aria-label="Next month"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Attendance %" value={`${stats.attendancePercentage}%`} tone="blue" />
        <StatCard label="Present" value={String(stats.present)} tone="green" />
        <StatCard label="Absent" value={String(stats.absent)} tone="red" />
        <StatCard label="Late" value={String(stats.late)} tone="amber" />
        <StatCard label="Leave" value={String(stats.on_leave)} tone="blue" />
        <StatCard label="Half Day" value={String(stats.half_day)} tone="orange" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-1 py-2 text-xs font-semibold text-gray-600 text-center"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, index) => {
              if (!cell.date || !cell.day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[4.5rem] border-b border-r border-gray-100 bg-gray-50/60"
                  />
                );
              }

              const isToday = cell.date === new Date().toISOString().slice(0, 10);
              const cellStyle = getRegisterCellStyle(cell.code);

              return (
                <div
                  key={cell.date}
                  className={`min-h-[4.5rem] border-b border-r border-gray-100 p-1.5 ${
                    isToday ? 'ring-2 ring-inset ring-primary-400 bg-primary-50/40' : ''
                  } ${cell.status === 'weekend' ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold text-gray-700">{cell.day}</span>
                    <span
                      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[10px] font-bold ${cellStyle}`}
                    >
                      {cell.code}
                    </span>
                  </div>
                  {cell.status && cell.status !== 'weekend' && cell.status !== 'holiday' && (
                    <p
                      className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${statusBadgeClass(cell.status)}`}
                    >
                      {STATUS_LABELS[cell.status] || cell.status}
                    </p>
                  )}
                  {cell.status === 'holiday' && (
                    <p className="mt-1 text-[10px] font-medium text-purple-700">Holiday</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {REGISTER_LEGEND.map((item) => (
          <span
            key={item.code}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${item.style}`}
          >
            <span className="font-bold">{item.code}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'orange';
}) {
  const tones = {
    green: 'bg-green-50 border-green-100 text-green-800',
    red: 'bg-red-50 border-red-100 text-red-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    orange: 'bg-orange-50 border-orange-100 text-orange-800',
    default: 'bg-white border-gray-200 text-gray-900',
  };
  const c = tone ? tones[tone] : tones.default;
  return (
    <div className={`rounded-lg border p-3 ${c}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg mt-0.5">{value}</p>
    </div>
  );
}
