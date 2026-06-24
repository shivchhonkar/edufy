'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiArrowLeft, FiBarChart2, FiCalendar } from 'react-icons/fi';

interface AttendanceRecord {
  staff_id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department?: string;
  designation?: string;
  status: string;
  attendance_date: string;
}

interface StaffReportRow {
  staff_id: number;
  employee_id: string;
  name: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  half_day: number;
  total_marked: number;
  attendance_percentage: number;
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function StaffReportsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StaffReportRow[]>([]);

  const { start, end } = useMemo(() => monthRange(year, month), [year, month]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: start, end_date: end });
      if (department) params.set('department', department);

      const res = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      if (!data.success) {
        setRows([]);
        return;
      }

      const records = data.data as AttendanceRecord[];
      const byStaff = new Map<number, StaffReportRow>();

      for (const record of records) {
        let row = byStaff.get(record.staff_id);
        if (!row) {
          row = {
            staff_id: record.staff_id,
            employee_id: record.employee_id,
            name: `${record.first_name} ${record.last_name}`.trim(),
            department: record.department || '—',
            present: 0,
            absent: 0,
            late: 0,
            on_leave: 0,
            half_day: 0,
            total_marked: 0,
            attendance_percentage: 0,
          };
          byStaff.set(record.staff_id, row);
        }

        row.total_marked += 1;
        if (record.status === 'present') row.present += 1;
        else if (record.status === 'absent') row.absent += 1;
        else if (record.status === 'late') row.late += 1;
        else if (record.status === 'on_leave') row.on_leave += 1;
        else if (record.status === 'half_day') row.half_day += 1;
      }

      const reportRows = Array.from(byStaff.values()).map((row) => ({
        ...row,
        attendance_percentage:
          row.total_marked > 0
            ? Math.round(((row.present + row.late + row.half_day * 0.5) / row.total_marked) * 100)
            : 0,
      }));

      reportRows.sort((a, b) => a.name.localeCompare(b.name));
      setRows(reportRows);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [start, end, department]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.department).filter((d) => d && d !== '—')),
      ).sort(),
    [rows],
  );

  const summary = useMemo(
    () => ({
      staff: rows.length,
      present: rows.reduce((sum, r) => sum + r.present, 0),
      absent: rows.reduce((sum, r) => sum + r.absent, 0),
      late: rows.reduce((sum, r) => sum + r.late, 0),
      avg:
        rows.length > 0
          ? Math.round(rows.reduce((sum, r) => sum + r.attendance_percentage, 0) / rows.length)
          : 0,
    }),
    [rows],
  );

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <Link
            href="/staff"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <FiArrowLeft size={14} /> Back to Staff
          </Link>
          <h1 className="flex items-center gap-2 text-xl text-gray-900">
            <FiBarChart2 className="text-primary-600" />
            Staff Reports
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monthly staff attendance summary and percentages.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Month</span>
            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-400" />
              <input
                type="month"
                value={`${year}-${String(month).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  setYear(parseInt(y, 10));
                  setMonth(parseInt(m, 10));
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/attendance/staff/register"
            className="ml-auto text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            Open staff register →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Staff', value: summary.staff },
            { label: 'Present', value: summary.present },
            { label: 'Absent', value: summary.absent },
            { label: 'Late', value: summary.late },
            { label: 'Avg %', value: `${summary.avg}%` },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-gray-900">{monthLabel} — Staff Attendance</h2>
          </div>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500">
              No attendance records for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Employee ID',
                      'Name',
                      'Department',
                      'Present',
                      'Absent',
                      'Late',
                      'Leave',
                      'Half Day',
                      'Marked',
                      'Attendance %',
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.staff_id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {row.employee_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{row.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {row.department}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-700">{row.present}</td>
                      <td className="px-4 py-3 text-sm text-red-700">{row.absent}</td>
                      <td className="px-4 py-3 text-sm text-orange-700">{row.late}</td>
                      <td className="px-4 py-3 text-sm text-blue-700">{row.on_leave}</td>
                      <td className="px-4 py-3 text-sm text-amber-700">{row.half_day}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.total_marked}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {row.attendance_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
