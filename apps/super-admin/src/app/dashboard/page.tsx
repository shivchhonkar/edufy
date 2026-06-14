'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import KpiCard from '@/features/dashboard/components/KpiCard';
import {
  AttendanceTrendChart,
  FeeCollectionBarChart,
  CompositionDonutChart,
  TeacherComparisonBarChart,
  CategoryBarChart,
} from '@/features/dashboard/components/DashboardCharts';
import { DashboardOverview } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import {
  FiUsers,
  FiUser,
  FiUserCheck,
  FiAlertCircle,
  FiCalendar,
  FiUserPlus,
  FiAward,
  FiTruck,
  FiBook,
  FiChevronRight,
} from 'react-icons/fi';

function formatCurrency(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatCurrencyFull(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function PanelCard({
  title,
  subtitle,
  badge,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {badge && (
              <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {href && (
          <button
            type="button"
            onClick={() => router.push(href)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 shrink-0"
          >
            View <FiChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

function ModuleCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md hover:border-gray-200 transition-all w-full"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="text-xl text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const attendanceComposition = useMemo(() => {
    if (!stats) return [];
    const other = Math.max(0, stats.attendance_marked - stats.present_today - stats.absent_today);
    return [
      { name: 'Present', value: stats.present_today, color: '#16a34a' },
      { name: 'Absent', value: stats.absent_today, color: '#dc2626' },
      ...(other > 0 ? [{ name: 'Leave / Late', value: other, color: '#d97706' }] : []),
    ];
  }, [stats]);

  const feeComposition = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Collected', value: stats.fees_collected, color: '#2563eb' },
      { name: 'Pending', value: stats.pending_fees, color: '#f59e0b' },
    ];
  }, [stats]);

  const alertsChartData = useMemo(() => {
    if (!stats) return [];
    const typeLabels: Record<string, string> = {
      attendance: 'Attendance',
      fees: 'Fees',
      admissions: 'Admissions',
      inventory: 'Inventory',
      exams: 'Exams',
    };
    const typeColors: Record<string, string> = {
      attendance: '#16a34a',
      fees: '#d97706',
      admissions: '#2563eb',
      inventory: '#64748b',
      exams: '#7c3aed',
    };
    const counts = new Map<string, number>();
    for (const alert of stats.alerts) {
      counts.set(alert.type, (counts.get(alert.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, value]) => ({
      name: typeLabels[type] ?? type,
      value,
      color: typeColors[type] ?? '#64748b',
    }));
  }, [stats]);

  const activitiesChartData = useMemo(() => {
    if (!stats) return [];
    const typeLabels: Record<string, string> = {
      payment: 'Payments',
      admission: 'Admissions',
    };
    const typeColors: Record<string, string> = {
      payment: '#16a34a',
      admission: '#2563eb',
    };
    const counts = new Map<string, number>();
    for (const activity of stats.recent_activities) {
      counts.set(activity.type, (counts.get(activity.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, value]) => ({
      name: typeLabels[type] ?? type,
      value,
      color: typeColors[type] ?? '#64748b',
    }));
  }, [stats]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  const s = stats!;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Morning overview for principals and management
          </p>
        </div>

        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard
            title="Students"
            value={s.total_students.toLocaleString('en-IN')}
            subtitle="Active enrolled"
            icon={FiUsers}
            color="blue"
            onClick={() => router.push('/students')}
          />
          <KpiCard
            title="Teachers"
            value={s.total_teachers.toLocaleString('en-IN')}
            subtitle="Assigned staff"
            icon={FiUser}
            color="purple"
            onClick={() => router.push('/teachers')}
          />
          <KpiCard
            title="Attendance"
            value={s.attendance_marked > 0 ? `${s.attendance_rate}%` : '—'}
            subtitle={
              s.attendance_marked > 0
                ? `${s.present_today} present · ${s.absent_today} absent`
                : 'Not marked today'
            }
            icon={FiUserCheck}
            color="green"
            onClick={() => router.push('/attendance/students')}
          />
          <KpiCard
            title="Fees Collected"
            value={formatCurrency(s.fees_collected)}
            subtitle={formatCurrencyFull(s.fees_collected)}
            icon={RupeeIcon}
            color="green"
            onClick={() => router.push('/fees')}
          />
          <KpiCard
            title="Pending Fees"
            value={formatCurrency(s.pending_fees)}
            subtitle={formatCurrencyFull(s.pending_fees)}
            icon={RupeeIcon}
            color="yellow"
            onClick={() => router.push('/fees')}
          />
        </div>

        {/* Row 2 — Trends (line) + Comparisons (bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelCard
            title="Attendance Trend"
            badge="Line"
            subtitle="Present % over the last 7 days"
            href="/attendance/students"
          >
            <AttendanceTrendChart data={s.attendance_chart} />
          </PanelCard>
          <PanelCard
            title="Fee Collection"
            badge="Bar"
            subtitle="Monthly collections — last 6 months"
            href="/fees"
          >
            <FeeCollectionBarChart
              data={s.fee_collection_chart}
              formatValue={formatCurrencyFull}
            />
          </PanelCard>
        </div>

        {/* Row 2b — Composition (donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelCard
            title="Today's Attendance"
            badge="Donut"
            subtitle="Present vs absent breakdown"
            href="/attendance/students"
          >
            <CompositionDonutChart
              data={attendanceComposition}
              centerLabel={
                s.attendance_marked > 0 ? `${s.attendance_rate}% present` : 'Not marked'
              }
            />
          </PanelCard>
          <PanelCard
            title="Fee Status"
            badge="Donut"
            subtitle="Collected vs pending share"
            href="/fees"
          >
            <CompositionDonutChart
              data={feeComposition}
              formatValue={formatCurrencyFull}
              centerLabel={formatCurrency(s.fees_collected + s.pending_fees)}
            />
          </PanelCard>
        </div>

        {/* Row 3 — Today's classes + Teacher comparison bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelCard
            title="Today's Classes"
            subtitle={`${s.classes_conducted_today} periods scheduled`}
            href="/timetable"
          >
            {s.todays_classes.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                <FiCalendar className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                No classes scheduled for today
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {s.todays_classes.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{slot.subject_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {slot.class_name}
                        {slot.section_name ? ` · ${slot.section_name}` : ''} · {slot.teacher_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-700">{slot.period_name}</p>
                      <p className="text-[10px] text-gray-500">
                        {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Teacher Performance"
            badge="Bar"
            subtitle="Top teachers by score — last 30 days"
            href="/teachers/performance"
          >
            <TeacherComparisonBarChart data={s.teacher_performance} />
          </PanelCard>
        </div>

        {/* Row 4 — Alerts & Recent activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelCard title="Alerts" badge="Bar" subtitle="Items needing attention by category">
            <CategoryBarChart
              data={alertsChartData}
              emptyMessage="All clear — no urgent alerts"
            />
            {s.alerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 max-h-28 overflow-y-auto">
                {s.alerts.map((alert, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => alert.href && router.push(alert.href)}
                    className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 text-xs text-gray-700"
                  >
                    <FiAlertCircle
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        alert.severity === 'high'
                          ? 'text-red-600'
                          : alert.severity === 'medium'
                            ? 'text-amber-600'
                            : 'text-gray-500'
                      }`}
                    />
                    <span>{alert.message}</span>
                  </button>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Recent Activities" badge="Bar" subtitle="Activity volume by type">
            <CategoryBarChart
              data={activitiesChartData}
              emptyMessage="No recent activity recorded"
            />
            {s.recent_activities.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 max-h-28 overflow-y-auto">
                {s.recent_activities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${
                        activity.type === 'payment'
                          ? 'bg-green-500'
                          : activity.type === 'admission'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-gray-500">{activity.subtitle}</p>
                    </div>
                    <span className="text-gray-400 shrink-0">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        {/* Row 5 — Module shortcuts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard
            title="Admissions"
            value={s.admissions.active}
            subtitle={`${s.admissions.follow_up_today} follow-up · ${s.admissions.new_this_week} new`}
            icon={FiUserPlus}
            color="bg-blue-50 text-blue-600"
            href="/admissions"
          />
          <ModuleCard
            title="Exams"
            value={s.exams.upcoming}
            subtitle={`${s.exams.total} total scheduled`}
            icon={FiAward}
            color="bg-purple-50 text-purple-600"
            href="/exams"
          />
          <ModuleCard
            title="Transport"
            value={s.transport.student_assignments}
            subtitle={`${s.transport.active_routes} routes · ${s.transport.active_vehicles} vehicles`}
            icon={FiTruck}
            color="bg-indigo-50 text-indigo-600"
            href="/transport"
          />
          <ModuleCard
            title="Library"
            value={s.library.total_items}
            subtitle={`${s.library.low_stock} low stock`}
            icon={FiBook}
            color="bg-amber-50 text-amber-600"
            href="/inventory"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
