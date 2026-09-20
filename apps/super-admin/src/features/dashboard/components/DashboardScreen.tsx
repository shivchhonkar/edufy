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
  TeacherComparisonBarChart,
  CategoryBarChart,
} from '@/features/dashboard/components/DashboardCharts';
import { DASHBOARD_CHART_PALETTE } from '@/features/dashboard/components/dashboard-chart-theme';
import { DashboardOverview } from '@/shared/types';
import {
  FiAlertCircle,
  FiAward,
  FiBook,
  FiCalendar,
  FiChevronDown,
  FiGift,
  FiInfo,
  FiTruck,
  FiUserPlus,
} from 'react-icons/fi';
import SchoolSetupWelcomeModal from '@/features/setup/components/SchoolSetupWelcomeModal';
import { useSchoolSetupChecklist } from '@/features/setup/hooks/useSchoolSetupChecklist';
import { SETUP_CHECKLIST_ITEMS } from '@/features/setup/constants/setup-checklist';
import { useActiveSchoolId } from '@/hooks/use-active-school-id';
import { useEnrollmentSession, withSessionQuery } from '@/shared/context/EnrollmentContext';

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

function PanelCard({
  title,
  subtitle,
  href,
  linkLabel = 'View Report',
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {href && (
          <button
            type="button"
            onClick={() => router.push(href)}
            className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            {linkLabel}
          </button>
        )}
      </div>
      <div className="flex-1 p-4">{children}</div>
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
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${toneClasses}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ModuleShortcut({
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
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-0.5 text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      <div className={`shrink-0 rounded-xl p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </button>
  );
}

function alertIconClass(type: string, severity: string) {
  if (severity === 'high') return 'text-red-500';
  if (type === 'attendance') return 'text-amber-500';
  if (type === 'fees') return 'text-red-500';
  if (type === 'exams') return 'text-blue-500';
  if (severity === 'medium') return 'text-amber-500';
  return 'text-gray-400';
}

export default function DashboardScreen() {
  const router = useRouter();
  const activeSchoolId = useActiveSchoolId();
  const {
    academicYears,
    selectedAcademicYearId,
    setSelectedAcademicYearId,
    sessionQueryParams,
    loading: sessionLoading,
  } = useEnrollmentSession();
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupModalDismissed, setSetupModalDismissed] = useState(false);
  const { checklist, hasPending, loading: setupLoading } = useSchoolSetupChecklist();

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
    return `+${n} this week`;
  }, [stats]);

  if (loading || sessionLoading) {
    return <DashboardSkeleton />;
  }

  const s = stats ?? EMPTY_DASHBOARD;

  return (
    <>
      <SchoolSetupWelcomeModal
        open={!setupLoading && hasPending && !setupModalDismissed}
        checklist={checklist}
        onDismiss={() => setSetupModalDismissed(true)}
      />

      <div className="space-y-4 pb-2">
        {/* Session header */}
        {/* <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">This Session:</span>
            <div className="relative">
              <select
                value={selectedAcademicYearId ?? ''}
                onChange={(e) => setSelectedAcademicYearId(Number(e.target.value) || null)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
              <FiChevronDown
                className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            </div>
          </label>
        </div> */}

        {!setupLoading && hasPending && setupModalDismissed && (
          <button
            type="button"
            onClick={() => setSetupModalDismissed(false)}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100/80"
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
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}. Showing empty dashboard — refresh or check your connection.
          </div>
        )}

        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        {/* Row 2 — Trend charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PanelCard
            title="Attendance Trend"
            subtitle="Present % over the last 7 days"
            href="/attendance/students"
          >
            <AttendanceTrendChart data={s.attendance_chart} />
          </PanelCard>
          <PanelCard
            title="Fee Collection Overview"
            subtitle="Expected, received & due — session months (Apr–Mar)"
            href="/fees"
          >
            <FeeCollectionBarChart data={s.fee_collection_chart} formatValue={formatCurrencyFull} />
          </PanelCard>
        </div>

        {/* Row 3 — Birthdays + staff attendance */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PanelCard
            title="Upcoming Birthdays"
            subtitle="Next 7 days — students & staff"
            href="/students"
            linkLabel="View All"
          >
            {s.upcoming_birthdays.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <FiGift className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                No birthdays in the next 7 days
              </div>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {s.upcoming_birthdays.map((person) => (
                  <div
                    key={`${person.person_type}-${person.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary-100)] text-xs font-semibold text-[var(--theme-primary-800)]">
                        {getInitials(person.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{person.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {person.person_type === 'student'
                            ? [person.class_name, person.section_name].filter(Boolean).join(' · ') ||
                              'Student'
                            : 'Staff'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        person.days_until === 0
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
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
          >
            <div className="grid grid-cols-2 gap-2">
              <StatPill label="Present" value={s.staff_attendance_today.present} tone="green" />
              <StatPill label="Absent" value={s.staff_attendance_today.absent} tone="red" />
              <StatPill label="On Leave" value={s.staff_attendance_today.on_leave} tone="amber" />
              <StatPill
                label="Not Marked"
                value={s.staff_attendance_today.not_marked}
                tone="gray"
              />
            </div>
            {s.staff_attendance_today.marked === 0 && s.staff_attendance_today.total_staff > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Staff attendance has not been marked for today.
              </p>
            )}
          </PanelCard>
        </div>

        {/* Row 4 — Distribution charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <PanelCard title="Students by Class" href="/students">
            <CategoryBarChart
              data={s.students_by_class.slice(0, 10).map((row, i) => ({
                name: row.name,
                value: row.count,
                color: DASHBOARD_CHART_PALETTE[i % DASHBOARD_CHART_PALETTE.length],
              }))}
              emptyMessage="No students enrolled"
            />
          </PanelCard>
          <PanelCard title="Admission Pipeline" href="/admissions">
            <CompositionDonutChart
              data={s.admissions_by_status.map((row, i) => ({
                name: row.name,
                value: row.count,
                color: DASHBOARD_CHART_PALETTE[i % DASHBOARD_CHART_PALETTE.length],
              }))}
              centerLabel={
                pipelineTotal > 0 ? `${pipelineTotal}\nIn Pipeline` : undefined
              }
            />
          </PanelCard>
          <PanelCard title="Staff by Department" href="/hr/dashboard">
            <CategoryBarChart
              data={s.staff_by_department.slice(0, 8).map((row, i) => ({
                name: row.name,
                value: row.count,
                color: DASHBOARD_CHART_PALETTE[i % DASHBOARD_CHART_PALETTE.length],
              }))}
              emptyMessage="No staff records"
            />
          </PanelCard>
        </div>

        {/* Row 5 — Classes + teacher performance */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PanelCard
            title="Today's Classes"
            subtitle={`${s.classes_conducted_today} periods scheduled`}
            href="/academics/timetable"
          >
            {s.todays_classes.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <FiCalendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                No classes scheduled for today
              </div>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {s.todays_classes.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{slot.subject_name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {slot.class_name}
                        {slot.section_name ? ` · ${slot.section_name}` : ''} · {slot.teacher_name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
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
            subtitle="Top teachers by score — last 30 days"
            href="/teachers/performance"
          >
            <TeacherComparisonBarChart data={s.teacher_performance} />
          </PanelCard>
        </div>

        {/* Row 6 — Alerts + recent activities */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PanelCard title="Alerts" subtitle="Items needing attention">
            {s.alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">All clear — no urgent alerts</div>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {s.alerts.map((alert, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => alert.href && router.push(alert.href)}
                    className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
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

          <PanelCard title="Recent Activities" subtitle="Latest updates across the system">
            {s.recent_activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No recent activity recorded</div>
            ) : (
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {s.recent_activities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm">
                    <div
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        activity.type === 'payment'
                          ? 'bg-green-500'
                          : activity.type === 'admission'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        {/* Row 7 — Module shortcuts */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ModuleShortcut
            title="Admissions"
            value={s.admissions.active}
            subtitle={`${s.admissions.follow_up_today} follow-up · ${s.admissions.new_this_week} new`}
            icon={FiUserPlus}
            color="bg-blue-50 text-blue-600"
            href="/admissions"
          />
          <ModuleShortcut
            title="Exams"
            value={s.exams.upcoming}
            subtitle={`${s.exams.total} total scheduled`}
            icon={FiAward}
            color="bg-purple-50 text-purple-600"
            href="/exams"
          />
          <ModuleShortcut
            title="Transport"
            value={s.transport.student_assignments}
            subtitle={`${s.transport.active_routes} routes · ${s.transport.active_vehicles} vehicles`}
            icon={FiTruck}
            color="bg-indigo-50 text-indigo-600"
            href="/transport"
          />
          <ModuleShortcut
            title="Library"
            value={s.library.total_items}
            subtitle={`${s.library.low_stock} low stock`}
            icon={FiBook}
            color="bg-amber-50 text-amber-600"
            href="/inventory"
          />
        </div>
      </div>
    </>
  );
}
