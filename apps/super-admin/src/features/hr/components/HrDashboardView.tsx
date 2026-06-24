'use client';

import Link from 'next/link';
import { useState } from 'react';
import HrNav from '@/features/hr/components/HrNav';
import { useHrDashboard } from '@/features/hr/hooks/useHrDashboard';
import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HrDashboardView() {
  const { stats, teacherSummary, topTeachers, loading, refresh } = useHrDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const statCards = stats
    ? [
        { label: 'Active Staff', value: stats.total_staff, tone: 'blue' },
        { label: 'Teachers', value: stats.total_teachers, tone: 'indigo' },
        { label: 'Present Today', value: stats.staff_present_today, tone: 'green' },
        { label: 'Pending Leaves', value: stats.pending_leaves, tone: 'amber' },
        { label: 'Payroll Pending', value: stats.payroll_pending, tone: 'red' },
        { label: 'Avg Teacher Score', value: teacherSummary?.avg_score ?? 0, tone: 'purple', suffix: '/100' },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <HrNav />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-gray-900">Staff & HR Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of staff strength, attendance, leaves, payroll, and teacher performance
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
          Refresh
        </button>
      </header>

      {loading && !stats ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <QuickAction href="/staff" icon={FiUsers} label="Manage Staff" primary />
            <QuickAction href="/academics/teacher-assignments" icon={FiUserCheck} label="Assign Teachers" />
            <QuickAction href="/attendance/staff" icon={FiCalendar} label="Staff Attendance" />
            <QuickAction href="/hr/leave-management" icon={FiClock} label="Leave Management" />
            <QuickAction href="/payroll" icon={RupeeIcon} label="Payroll" />
            <QuickAction href="/teachers/performance" icon={FiTarget} label="Performance" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FiAward className="text-primary-600" />
                  Top Teachers
                </h2>
                <Link href="/teachers/ranking" className="text-sm text-primary-600 hover:underline">
                  View ranking
                </Link>
              </div>
              {topTeachers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">No teacher performance data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Rank</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Teacher</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Score</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Activities</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Syllabus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topTeachers.map((teacher) => (
                        <tr key={String(teacher.staff_id)} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">#{String(teacher.rank)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{String(teacher.teacher_name)}</td>
                          <td className="px-3 py-2 font-semibold text-green-700">{String(teacher.score)}</td>
                          <td className="px-3 py-2 text-gray-600">{String(teacher.activity_count)}</td>
                          <td className="px-3 py-2 text-gray-600">{String(teacher.syllabus_progress_pct)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <RupeeIcon className="text-primary-600" />
                  Payroll Snapshot
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period</span>
                    <span className="font-medium">
                      {MONTH_NAMES[stats.payroll_month - 1]} {stats.payroll_year}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Payroll</span>
                    <span className="font-semibold text-green-700">{formatCurrency(stats.payroll_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium">{stats.payroll_paid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-medium text-amber-700">{stats.payroll_pending}</span>
                  </div>
                </div>
                <Link href="/payroll" className="mt-4 inline-flex text-sm text-primary-600 hover:underline">
                  Open payroll
                </Link>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FiBriefcase className="text-primary-600" />
                  HR Summary
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Departments</span>
                    <span className="font-medium">{stats.departments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inactive Staff</span>
                    <span className="font-medium">{stats.inactive_staff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Top Teacher</span>
                    <span className="text-right font-medium">
                      {teacherSummary?.top_teacher?.teacher_name || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Recent Leave Requests"
              href="/hr/leave-management"
              linkLabel="View all leaves"
              icon={FiClock}
              emptyMessage="No leave requests yet"
              items={stats.recent_leaves}
              renderItem={(leave) => (
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {String(leave.first_name)} {String(leave.last_name)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {String(leave.leave_type_name || 'Leave')} · {formatDate(leave.start_date)} –{' '}
                      {formatDate(leave.end_date)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      leave.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : leave.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {String(leave.status)}
                  </span>
                </div>
              )}
            />

            <Panel
              title="Recent Teacher Activities"
              href="/teachers/daily-activities"
              linkLabel="View activities"
              icon={FiTrendingUp}
              emptyMessage="No teacher activities logged yet"
              items={stats.recent_activities}
              renderItem={(activity) => (
                <div className="border-b border-gray-100 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {String(activity.first_name)} {String(activity.last_name)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {String(activity.topic_covered || 'Activity logged')}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(activity.activity_date)}
                    </span>
                  </div>
                </div>
              )}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Unable to load dashboard data.</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  suffix = '',
}: {
  label: string;
  value: number;
  tone: string;
  suffix?: string;
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl">
        {value}
        {suffix && <span className="text-sm font-normal opacity-70">{suffix}</span>}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
        primary
          ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
          : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function Panel<T extends Record<string, unknown>>({
  title,
  href,
  linkLabel,
  icon: Icon,
  emptyMessage,
  items,
  renderItem,
}: {
  title: string;
  href: string;
  linkLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyMessage: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Icon className="text-primary-600" />
          {title}
        </h2>
        <Link href={href} className="text-sm text-primary-600 hover:underline">
          {linkLabel}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div>{items.map((item, index) => <div key={index}>{renderItem(item)}</div>)}</div>
      )}
    </div>
  );
}
