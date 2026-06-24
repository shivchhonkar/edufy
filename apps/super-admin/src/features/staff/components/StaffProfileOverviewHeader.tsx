'use client';

import { useCallback, useEffect, useState } from 'react';
import { Staff } from '@/shared/types';

export interface StaffOverviewStats {
  attendance_percentage: number;
  leaves_remaining: number;
  salary: number;
  classes_assigned: number;
  subjects_assigned: number;
  students_handled: number;
}

interface StaffProfileOverviewHeaderProps {
  staff: Staff;
}

function formatSalary(value: number) {
  if (!value) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function StaffProfileOverviewHeader({ staff }: StaffProfileOverviewHeaderProps) {
  const [stats, setStats] = useState<StaffOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}/overview`);
      const data = await res.json();
      if (data.success) setStats(data.data);
      else setStats(null);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [staff.id]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const statItems = stats
    ? [
        { label: 'Attendance', value: `${stats.attendance_percentage}%` },
        { label: 'Leaves Remaining', value: String(stats.leaves_remaining) },
        { label: 'Salary', value: formatSalary(stats.salary) },
        { label: 'Classes Assigned', value: String(stats.classes_assigned) },
        { label: 'Subjects Assigned', value: String(stats.subjects_assigned) },
        { label: 'Students Handled', value: String(stats.students_handled) },
      ]
    : [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-center gap-4 lg:max-w-sm">
          <div className="shrink-0">
            {staff.photo_url ? (
              <img
                src={staff.photo_url}
                alt={`${staff.first_name} ${staff.last_name}`}
                className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-200 bg-primary-600">
                <span className="text-xl text-white">
                  {staff.first_name.charAt(0)}
                  {staff.last_name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl text-gray-900">
              {staff.first_name} {staff.last_name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {staff.designation || 'Staff Member'}
              {staff.department ? ` • ${staff.department}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  staff.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : staff.status === 'inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : staff.status === 'resigned'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                }`}
              >
                {staff.status?.toUpperCase()}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                {staff.employee_id}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-gray-200 lg:block" />

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-x-6 gap-y-5 lg:pl-2">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex min-w-0 flex-col animate-pulse">
                  <div className="mb-2 h-3 w-20 max-w-full rounded bg-gray-200" />
                  <div className="h-6 w-14 rounded bg-gray-200" />
                </div>
              ))
            : statItems.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col justify-start text-left">
                  <p className="text-xs font-medium leading-snug text-gray-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">{item.value}</p>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
