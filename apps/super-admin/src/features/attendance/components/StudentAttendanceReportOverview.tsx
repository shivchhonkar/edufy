'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

interface StudentReportRow {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  section_name?: string;
  absent: number;
  attendance_percentage: number;
}

const DISTRIBUTION_COLORS = ['#16a34a', '#dc2626', '#d97706', '#2563eb', '#ea580c'];

interface StudentAttendanceReportOverviewProps {
  summary: ReportSummary;
  students: StudentReportRow[];
  lowThreshold?: number;
}

export default function StudentAttendanceReportOverview({
  summary,
  students,
  lowThreshold = 75,
}: StudentAttendanceReportOverviewProps) {
  const distribution = useMemo(
    () =>
      [
        { name: 'Present', value: summary.present },
        { name: 'Absent', value: summary.absent },
        { name: 'Late', value: summary.late },
        { name: 'On Leave', value: summary.on_leave },
        { name: 'Half Day', value: summary.half_day },
      ].filter((item) => item.value > 0),
    [summary],
  );

  const classComparison = useMemo(() => {
    const byClass = new Map<string, { total: number; count: number }>();
    for (const row of students) {
      const key = row.class_name
        ? `${row.class_name}${row.section_name ? ` · ${row.section_name}` : ''}`
        : 'Unassigned';
      const entry = byClass.get(key) ?? { total: 0, count: 0 };
      entry.total += row.attendance_percentage;
      entry.count += 1;
      byClass.set(key, entry);
    }
    return Array.from(byClass.entries())
      .map(([name, { total, count }]) => ({
        name: name.length > 14 ? `${name.slice(0, 14)}…` : name,
        fullName: name,
        rate: count ? Math.round(total / count) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
  }, [students]);

  const lowAttendance = useMemo(
    () =>
      [...students]
        .filter((s) => s.attendance_percentage < lowThreshold)
        .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
        .slice(0, 6),
    [students, lowThreshold],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Attendance distribution</h3>
        {distribution.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No marked attendance in this period.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {distribution.map((_, index) => (
                    <Cell key={distribution[index].name} fill={DISTRIBUTION_COLORS[index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Records']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-1">
          {distribution.map((item, index) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-1 text-xs text-gray-600"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: DISTRIBUTION_COLORS[index % 5] }}
              />
              {item.name}: {item.value}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Class comparison</h3>
        {classComparison.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No class data for selected filters.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classComparison} layout="vertical" margin={{ left: 4, right: 8 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                />
                <Bar dataKey="rate" fill="#2380D6" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 xl:col-span-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Low attendance students (&lt; {lowThreshold}%)
        </h3>
        {lowAttendance.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No students below the attendance threshold.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lowAttendance.map((student) => (
              <li
                key={student.student_id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-gray-900 truncate">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {student.admission_number}
                    {student.class_name
                      ? ` · ${student.class_name}${student.section_name ? ` · ${student.section_name}` : ''}`
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                    {student.attendance_percentage}%
                  </span>
                  <p className="text-xs text-red-600 mt-0.5">{student.absent} absent</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
