'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';

interface AttendanceRow {
  id: number;
  attendance_date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
}

interface StaffAttendanceHistoryTabProps {
  staffId: number;
}

function formatTime(time: string | null | undefined) {
  if (!time) return '—';
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function statusLabel(status: string) {
  if (status === 'on_leave') return 'On Leave';
  if (status === 'half_day') return 'Half Day';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: string) {
  switch (status) {
    case 'present': return 'bg-green-100 text-green-800';
    case 'absent': return 'bg-red-100 text-red-800';
    case 'late': return 'bg-orange-100 text-orange-800';
    case 'half_day': return 'bg-amber-100 text-amber-800';
    case 'on_leave': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function StaffAttendanceHistoryTab({ staffId }: StaffAttendanceHistoryTabProps) {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (rangeDays - 1));
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const res = await fetch(
        `/api/attendance?staff_id=${staffId}&start_date=${startDate}&end_date=${endDate}`
      );
      const data = await res.json();
      if (data.success) {
        setRecords(
          [...data.data].sort(
            (a: AttendanceRow, b: AttendanceRow) =>
              new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
          )
        );
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Error loading staff attendance history:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [staffId, rangeDays]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => ({
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    on_leave: records.filter((r) => r.status === 'on_leave').length,
    half_day: records.filter((r) => r.status === 'half_day').length,
  }), [records]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <FiCalendar className="text-primary-600" />
          Daily attendance for the last {rangeDays} days
        </p>
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(parseInt(e.target.value, 10))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Present', value: stats.present, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Absent', value: stats.absent, color: 'text-red-700 bg-red-50 border-red-200' },
          { label: 'Late', value: stats.late, color: 'text-orange-700 bg-orange-50 border-orange-200' },
          { label: 'On Leave', value: stats.on_leave, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Half Day', value: stats.half_day, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg border p-3 ${item.color}`}>
            <p className="text-xs font-medium opacity-80">{item.label}</p>
            <p className="text-xl font-bold mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading attendance history...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">
          No attendance records found for this period.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Check In</th>
                <th className="px-4 py-3 text-left font-medium">Check Out</th>
                <th className="px-4 py-3 text-left font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {new Date(row.attendance_date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      {formatTime(row.check_in_time)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatTime(row.check_out_time)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate" title={row.remarks || ''}>
                    {row.remarks || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
