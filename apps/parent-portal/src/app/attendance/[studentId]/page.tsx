'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiCalendar, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { getAuthHeaders, formatParentDate } from '@/lib/client-auth';

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  remarks: string | null;
}

interface AttendanceSummary {
  present_days: string;
  absent_days: string;
  late_days: string;
  leave_days: string;
  total_days: string;
  attendance_percentage: number;
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  half_day: 'bg-orange-100 text-orange-800',
  on_leave: 'bg-blue-100 text-blue-800',
};

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    fetchAttendance();
  }, [studentId, month, year, router]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?studentId=${studentId}&month=${month}&year=${year}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 mx-auto">
      <div className="mb-6">
        <h1 className="text-xl text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Monthly attendance record for your child</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Attendance %</p>
            <p className="text-xl text-blue-700">{summary.attendance_percentage}%</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Present</p>
            <p className="text-xl text-green-700">{summary.present_days}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Absent</p>
            <p className="text-xl text-red-700">{summary.absent_days}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Late / Leave</p>
            <p className="text-xl text-yellow-700">
              {parseInt(summary.late_days || '0', 10) + parseInt(summary.leave_days || '0', 10)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading attendance...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No attendance records for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <FiCalendar className="text-gray-400" />
                    {formatParentDate(record.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {record.status === 'present' && <FiCheckCircle />}
                      {record.status === 'absent' && <FiXCircle />}
                      {(record.status === 'late' || record.status === 'on_leave') && <FiClock />}
                      {record.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
