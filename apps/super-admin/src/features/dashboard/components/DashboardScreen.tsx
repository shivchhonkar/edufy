'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentStatsKpiCard from '@/features/dashboard/components/StudentStatsKpiCard';
import FeeRevenueSummaryKpiCard from '@/features/dashboard/components/FeeRevenueSummaryKpiCard';
import AttendanceStatsKpiCard from '@/features/dashboard/components/AttendanceStatsKpiCard';
import TodayCollectionKpiCard from '@/features/dashboard/components/TodayCollectionKpiCard';
import DashboardSkeleton from '@/features/dashboard/components/DashboardSkeleton';
import {
  AttendanceTrendChart,
  FeeCollectionBarChart,
  CompositionDonutChart,
  CategoryBarChart,
  HorizontalMetricBars,
} from '@/features/dashboard/components/DashboardCharts';
import {
  DASHBOARD_CHART_PALETTE,
  DASHBOARD_CHART_THEME,
  pipelineColor,
} from '@/features/dashboard/components/dashboard-chart-theme';
import { DashboardOverview } from '@/shared/types';
import {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGift,
  FiInfo,
  FiMessageSquare,
  FiSend,
  FiTruck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import SchoolSetupWelcomeModal from '@/features/setup/components/SchoolSetupWelcomeModal';
import { useSchoolSetupChecklist } from '@/features/setup/hooks/useSchoolSetupChecklist';
import { SETUP_CHECKLIST_ITEMS } from '@/features/setup/constants/setup-checklist';
import { useActiveSchoolId } from '@/hooks/use-active-school-id';
import { useEnrollmentSession, withSessionQuery } from '@/shared/context/EnrollmentContext';
import { getClientUser } from '@/lib/client-auth';
import { getTimeOfDayGreeting } from '@edulakhya/utils';
import { useSettings } from '@/shared/SettingsContext';

const EMPTY_DASHBOARD: DashboardOverview = {
  total_students: 0,
  total_staff: 0,
  total_teachers: 0,
  total_classes: 0,
  total_vehicles: 0,
  present_today: 0,
  absent_today: 0,
  pending_fees: 0,
  low_stock_items: 0,
  fees_collected: 0,
  today_collection: { total: 0, receipt_count: 0, cash: 0, bank: 0 },
  fee_revenue_summary: {
    total: 0,
    total_due: 0,
    total_received: 0,
    total_discount: 0,
    due_percent: 0,
    received_percent: 0,
    discount_percent: 0,
  },
  attendance_rate: 0,
  attendance_marked: 0,
  attendance_stats: { marked: 0, present: 0, absent: 0, rate: 0, rate_change: null },
  attendance_chart: [],
  fee_collection_chart: [],
  student_stats: { total: 0, boys: 0, girls: 0, new_admissions: 0, previous_students: 0 },
  todays_classes: [],
  classes_conducted_today: 0,
  teacher_performance: [],
  alerts: [],
  recent_activities: [],
  admissions: { total: 0, active: 0, follow_up_today: 0, new_this_week: 0 },
  exams: { upcoming: 0, total: 0 },
  transport: { active_routes: 0, student_assignments: 0, active_vehicles: 0 },
  library: { total_items: 0, low_stock: 0 },
  students_by_class: [],
  admissions_by_status: [],
  staff_by_department: [],
  upcoming_birthdays: [],
  pending_tasks: [],
  staff_attendance_today: {
    total_staff: 0,
    present: 0,
    absent: 0,
    on_leave: 0,
    marked: 0,
    not_marked: 0,
  },
  outstanding_fees: { total: 0, students_with_dues: 0 },
};

function formatCurrencyFull(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function classSlotStatus(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return 'Upcoming';
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (current > end) return 'Completed';
  if (current >= start) return 'Ongoing';
  return 'Upcoming';
}

function statusBadgeClass(status: string) {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Ongoing') return 'bg-sky-50 text-sky-700';
  return 'bg-amber-50 text-amber-700';
}

function PanelCard({
  title,
  subtitle,
  href,
  linkLabel = 'View Report',
  icon: Icon,
  scrollable = false,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {href && (
          <button
            type="button"
            onClick={() => router.push(href)}
            className="shrink-0 text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            {linkLabel}
          </button>
        )}
      </div>
      <div
        className={`min-h-0 flex-1 px-5 pb-5 pt-1 ${scrollable ? 'overflow-y-auto overscroll-contain' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'red' | 'amber' | 'gray';
}) {
  const toneClasses = {
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-slate-50 text-slate-600',
  }[tone];

  return (
    <div className={`rounded-xl px-3 py-3 ${toneClasses}`}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function alertIconClass(type: string, severity: string) {
  if (severity === 'high' || type === 'fees') return 'text-rose-500';
  if (type === 'attendance' || severity === 'medium') return 'text-amber-500';
  if (type === 'exams') return 'text-sky-500';
  return 'text-slate-400';
}

const QUICK_ACTIONS = [
  { label: 'Add Student', href: '/students', icon: FiUserPlus, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Mark Attendance', href: '/attendance/students', icon: FiCheckCircle, color: 'bg-sky-50 text-sky-600' },
  { label: 'Add Fee Payment', href: '/fees/collect', icon: FiCreditCard, color: 'bg-orange-50 text-orange-600' },
  { label: 'Create Exam', href: '/exams', icon: FiClipboard, color: 'bg-cyan-50 text-cyan-600' },
  { label: 'Send Message', href: '/communications?tab=sms', icon: FiSend, color: 'bg-blue-50 text-blue-600' },
  { label: 'Generate Report', href: '/dashboard/analytics', icon: FiBarChart2, color: 'bg-violet-50 text-violet-600' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const activeSchoolId = useActiveSchoolId();
  const {
    selectedAcademicYearId,
    sessionQueryParams,
    loading: sessionLoading,
  } = useEnrollmentSession();
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupModalDismissed, setSetupModalDismissed] = useState(false);
  const { checklist, hasPending, loading: setupLoading } = useSchoolSetupChecklist();
  const [greeting, setGreeting] = useState('Welcome');
  const [displayName, setDisplayName] = useState('Admin');

  useEffect(() => {
    const user = getClientUser();
    const fullName = String(user?.full_name || user?.name || 'Admin');
    setDisplayName(firstName(fullName));
    setGreeting(getTimeOfDayGreeting());
  }, []);

  useEffect(() => {
    if (sessionLoading) return;

    setLoading(true);
    setError(null);

    const statsUrl = withSessionQuery('/api/dashboard/stats', sessionQueryParams);

    fetch(statsUrl, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.success && data.data) {
          setStats(data.data);
          return;
        }
        setError(data.error || 'Failed to load dashboard statistics');
        setStats(EMPTY_DASHBOARD);
      })
      .catch(() => {
        setError('Failed to load dashboard statistics');
        setStats(EMPTY_DASHBOARD);
      })
      .finally(() => setLoading(false));
  }, [activeSchoolId, selectedAcademicYearId, sessionQueryParams, sessionLoading]);

  const pipelineTotal = useMemo(() => {
    if (!stats) return 0;
    return stats.admissions_by_status.reduce((sum, row) => sum + row.count, 0);
  }, [stats]);

  const studentGrowthText = useMemo(() => {
    if (!stats) return undefined;
    const n = stats.admissions.new_this_week;
    if (n <= 0) return undefined;
    return `${n} new this week`;
  }, [stats]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [],
  );

  const schoolName = settings.school_name?.trim() || 'your school';

  if (loading || sessionLoading) {
    return <DashboardSkeleton />;
  }

  const s = stats ?? EMPTY_DASHBOARD;
  const feePayments = s.recent_activities.filter((activity) => activity.type === 'payment');

  return (
    <>
      <SchoolSetupWelcomeModal
        open={!setupLoading && hasPending && !setupModalDismissed}
        checklist={checklist}
        onDismiss={() => setSetupModalDismissed(true)}
      />

      <div className="space-y-5 pb-4">
        {/* <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl tracking-tight text-slate-900">
              {greeting}, {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here&apos;s what&apos;s happening at {schoolName} today.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
            <FiCalendar className="h-4 w-4 text-slate-400" aria-hidden />
            {todayLabel}
          </div>
        </div> */}

        {!setupLoading && hasPending && setupModalDismissed && (
          <button
            type="button"
            onClick={() => setSetupModalDismissed(false)}
            className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100/80"
          >
            <span className="font-medium">School setup incomplete</span>
            <span className="text-amber-800">
              {' '}
              — {SETUP_CHECKLIST_ITEMS.filter((i) => !checklist[i.id]).length} steps pending. Click
              to open the setup checklist.
            </span>
          </button>
        )}

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}. Showing empty dashboard — refresh or check your connection.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudentStatsKpiCard
            stats={s.student_stats}
            growthText={studentGrowthText}
            onClick={() => router.push('/students')}
          />
          <FeeRevenueSummaryKpiCard
            stats={s.fee_revenue_summary}
            onClick={() => router.push('/fees')}
          />
          <AttendanceStatsKpiCard
            stats={s.attendance_stats}
            onClick={() => router.push('/attendance/students')}
          />
          <TodayCollectionKpiCard
            stats={s.today_collection}
            onClick={() => router.push('/fees')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:h-[360px] xl:grid-cols-12 xl:items-stretch">
          <div className="h-full min-h-0 xl:col-span-5">
            <PanelCard
              title="Attendance Trend"
              subtitle="Showing percentage for the last 7 days"
              href="/attendance/students"
              icon={FiCheckCircle}
            >
              <AttendanceTrendChart data={s.attendance_chart} />
            </PanelCard>
          </div>
          <div className="h-full min-h-0 xl:col-span-4">
            <PanelCard
              title="Fee Collection Overview"
              subtitle="Expected, Received & Due (Apr – Mar)"
              href="/fees"
              icon={FiCreditCard}
            >
              <FeeCollectionBarChart data={s.fee_collection_chart} formatValue={formatCurrencyFull} />
            </PanelCard>
          </div>
          <div className="h-full min-h-0 xl:col-span-3">
            <PanelCard title="Quick Actions" icon={FiAward} scrollable>
              <div className="space-y-1">
                {s.pending_tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => router.push(task.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        task.severity === 'high'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <FiBell className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{task.title}</span>
                      <span className="block truncate text-xs text-slate-500">{task.subtitle}</span>
                    </span>
                    <FiChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                ))}
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-700">{action.label}</span>
                    <FiChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </PanelCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PanelCard
            title="Upcoming Birthdays"
            subtitle="Next 7 days — students & staff"
            href="/students"
            linkLabel="View All"
            icon={FiGift}
          >
            {s.upcoming_birthdays.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                <FiGift className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No birthdays in the next 7 days
              </div>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {s.upcoming_birthdays.map((person) => (
                  <div
                    key={`${person.person_type}-${person.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-1 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                        {getInitials(person.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{person.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {person.person_type === 'student'
                            ? [person.class_name, person.section_name].filter(Boolean).join(' · ') ||
                              'Student'
                            : 'Staff'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                      {person.birthday_label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Staff Attendance Today"
            subtitle={`${s.staff_attendance_today.marked} of ${s.staff_attendance_today.total_staff} marked`}
            href="/attendance/staff"
            icon={FiUsers}
          >
            <div className="grid grid-cols-2 gap-2.5">
              <StatPill label="Present" value={s.staff_attendance_today.present} tone="green" />
              <StatPill label="Absent" value={s.staff_attendance_today.absent} tone="red" />
              <StatPill label="On Leave" value={s.staff_attendance_today.on_leave} tone="amber" />
              <StatPill label="Not Marked" value={s.staff_attendance_today.not_marked} tone="gray" />
            </div>
            {s.staff_attendance_today.marked === 0 && s.staff_attendance_today.total_staff > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Staff attendance has not been marked for today.
              </p>
            )}
          </PanelCard>

          <PanelCard title="Recent Activities" subtitle="Latest updates across the system" icon={FiFileText}>
            {s.recent_activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No recent activity recorded</div>
            ) : (
              <div className="max-h-56 space-y-3 overflow-y-auto">
                {s.recent_activities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        activity.type === 'payment'
                          ? 'bg-emerald-500'
                          : activity.type === 'admission'
                            ? 'bg-sky-500'
                            : 'bg-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-500">{activity.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PanelCard title="Students by Class" href="/students" icon={FiBarChart2}>
            <CategoryBarChart
              data={s.students_by_class.slice(0, 10).map((row, i) => ({
                name: row.name,
                value: row.count,
                color:
                  i % 2 === 0 ? DASHBOARD_CHART_THEME.primary : DASHBOARD_CHART_THEME.secondary,
              }))}
              emptyMessage="No students enrolled"
            />
          </PanelCard>
          <PanelCard title="Admission Pipeline" href="/admissions" icon={FiUserPlus}>
            <CompositionDonutChart
              data={s.admissions_by_status.map((row, i) => ({
                name: row.name,
                value: row.count,
                color: pipelineColor(row.name, DASHBOARD_CHART_PALETTE[i % DASHBOARD_CHART_PALETTE.length]),
              }))}
              centerLabel={pipelineTotal > 0 ? `${pipelineTotal}\nIn Pipeline` : undefined}
            />
          </PanelCard>
          <PanelCard title="Staff by Department" href="/hr/dashboard" icon={FiUsers}>
            <HorizontalMetricBars
              data={s.staff_by_department.slice(0, 8).map((row) => ({
                name: row.name,
                value: row.count,
              }))}
              emptyMessage="No staff records"
            />
          </PanelCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PanelCard
            title="Today's Classes"
            subtitle={`${s.classes_conducted_today} periods scheduled`}
            href="/academics/timetable"
            icon={FiCalendar}
          >
            {s.todays_classes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                <FiCalendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No classes scheduled for today
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {s.todays_classes.map((slot, idx) => {
                  const status = classSlotStatus(slot.start_time, slot.end_time);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </p>
                        <p className="truncate text-sm font-medium text-slate-900">
                          {slot.class_name}
                          {slot.section_name ? ` · ${slot.section_name}` : ''} — {slot.subject_name}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(status)}`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Recent Fee Payments" href="/fees/receipts" linkLabel="View All" icon={FiCreditCard}>
            {feePayments.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No fee payments recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-slate-400">
                      <th className="pb-2 font-medium">Student Name</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feePayments.map((payment, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="py-2.5 pr-2 font-medium text-slate-800">
                          {payment.title.replace(/^Fee payment — /, '')}
                        </td>
                        <td className="py-2.5 pr-2 tabular-nums text-slate-700">{payment.subtitle}</td>
                        <td className="py-2.5 text-right text-xs text-slate-500">{payment.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Alerts" subtitle="Items needing attention" icon={FiAlertCircle}>
            {s.alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">All clear — no urgent alerts</div>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {s.alerts.map((alert, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => alert.href && router.push(alert.href)}
                    className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FiAlertCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${alertIconClass(alert.type, alert.severity)}`}
                    />
                    <span>{alert.message}</span>
                  </button>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FooterStat
            icon={FiMessageSquare}
            label="Follow-up · 0 new"
            value={s.admissions.follow_up_today}
            href="/admissions"
          />
          <FooterStat
            icon={FiClipboard}
            label="Total scheduled"
            value={s.exams.upcoming}
            href="/exams"
          />
          <FooterStat
            icon={FiTruck}
            label={`Transport · ${s.transport.active_vehicles} vehicles`}
            value={s.transport.student_assignments}
            href="/transport"
          />
          <FooterStat
            icon={FiBell}
            label="Low stock"
            value={s.library.low_stock || s.low_stock_items}
            href="/inventory"
          />
        </div>
      </div>
    </>
  );
}

function FooterStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm hover:border-slate-200 hover:shadow-md"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-lg font-semibold tabular-nums text-slate-900">{value}</span>
        <span className="block text-xs text-slate-500">{label}</span>
      </span>
    </button>
  );
}
