'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  FiUser,
  FiCalendar,
  FiBook,
  FiBell,
  FiChevronRight,
  FiCheck,
  FiClock,
  FiTruck,
  FiMessageSquare,
  FiFileText,
  FiAward,
} from 'react-icons/fi'
import { formatCurrency } from '@edulakhya/utils'
import RupeeIcon from '@/components/icons/RupeeIcon'
import { useSchoolBranding } from '@/contexts/SchoolBrandingContext'
import { studentFullName } from '@/lib/client-auth'
import ParentEventListRow from '@/features/calendar/components/ParentEventListRow'

export type DashboardChild = {
  id: number
  first_name: string
  middle_name?: string | null
  last_name?: string
  class_name?: string
  section_name?: string
  roll_number?: string
  admission_number?: string
  photo_url?: string
  status?: string
}

export type DashboardStats = {
  attendance: {
    percentage: string
    presentDays: number
    absentDays: number
    lateDays: number
    todayStatus: string
    trend: { label: string; percentage: number }[]
  }
  fees: {
    total: number
    paid: number
    pending: number
    nextDueDate: string | null
    paidPercent: number
  }
  homework: {
    pending: number
    dueToday: number
    recent: Array<{
      id: number
      title: string
      subject_name?: string
      due_date?: string
      submission_status?: string
    }>
  }
  exam: { name: string; start_date: string; end_date: string } | null
  notice: { title: string; content: string; published_at?: string } | null
  events: Array<{
    title: string
    content?: string
    start_date?: string
    event_type?: string
    kind?: string
    start_time?: string | null
    all_day?: boolean
  }>
  transport: { route_name?: string; stop_name?: string; vehicle_number?: string | null } | null
  schedule: Array<{
    period_name: string
    start_time?: string
    end_time?: string
    subject_name?: string | null
    room?: string | null
  }>
  unreadNotices: number
  notifications: Array<{
    id: number
    title: string
    message: string
    priority: string
    published_at?: string | null
    created_at: string
  }>
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayAttendance(status: string) {
  const map: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    on_leave: 'On leave',
    half_day: 'Half day',
    not_marked: 'Not marked',
  }
  return map[status] || 'Not marked'
}

function formatTimeLabel(value?: string) {
  if (!value) return ''
  const [hours, minutes] = value.split(':')
  const hour = Number(hours)
  if (Number.isNaN(hour)) return value
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:${minutes} ${ampm}`
}

function parsePercent(value: string) {
  return Number(String(value).replace('%', '')) || 0
}

function isStudentPhotoUrl(url?: string | null): boolean {
  if (!url?.trim()) return false
  const lower = url.trim().toLowerCase()
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.includes('/embed/')
  ) {
    return false
  }
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(lower)) return false
  return (
    /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(lower) ||
    lower.startsWith('data:image/') ||
    lower.includes('/uploads/') ||
    lower.includes('/api/') ||
    lower.includes('/students/')
  )
}

function StudentAvatar({
  name,
  photoUrl,
  className = '',
}: {
  name: string
  photoUrl?: string
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)
  const src = isStudentPhotoUrl(photoUrl) ? photoUrl!.trim() : ''
  const initial = name.charAt(0).toUpperCase() || 'S'

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-white/20 text-white font-bold ${className}`}
        aria-hidden
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-cover object-center ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

const CHIP_CLASS = {
  success: 'portal-chip-success',
  warning: 'portal-chip-warning',
  danger: 'portal-chip-danger',
  info: 'portal-chip-info',
  purple: 'portal-chip-purple',
} as const

const PAGE_CONTAINER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
const SECTION_STACK = 'flex flex-col gap-4 sm:gap-5'
const GRID_GAP = 'gap-3 sm:gap-4'
const GRID_GAP_LG = 'gap-4'
const CARD_SHELL = 'portal-card rounded-xl p-4 sm:p-5 shadow-sm'
const CARD_HEADER = 'flex items-center justify-between gap-2 mb-3 sm:mb-4 min-h-7'

export default function ParentDashboardView({
  userName,
  children,
  selectedChild,
  stats,
  loading,
  onChildChange,
}: {
  userName: string
  children: DashboardChild[]
  selectedChild: DashboardChild
  stats: DashboardStats | null
  loading: boolean
  onChildChange: (child: DashboardChild) => void
}) {
  const router = useRouter()
  const { branding } = useSchoolBranding()
  const studentId = selectedChild.id
  const attendancePct = stats ? parsePercent(stats.attendance.percentage) : 0

  return (
    <div className="portal-page-shell min-h-full">
      <div className="portal-page-header">
        <div className={`${PAGE_CONTAINER} py-4 sm:py-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="portal-page-header-muted text-xs sm:text-sm font-medium">
                {getGreeting()}, Welcome back, {userName}!
              </p>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight portal-text">
                Parent Dashboard
              </h1>
              <p className="portal-page-header-muted text-xs sm:text-sm max-w-2xl">
                Here&apos;s what&apos;s happening with your child today.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push('/notifications')}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg portal-header-control shadow-sm transition-colors"
                aria-label="Notifications"
              >
                <FiBell className="h-4 w-4" />
                {(stats?.unreadNotices || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {stats?.unreadNotices}
                  </span>
                )}
              </button>
              <div className="inline-flex items-center gap-1.5 rounded-lg portal-header-control px-2.5 py-2 text-xs sm:text-sm shadow-sm">
                <FiCalendar className="h-3.5 w-3.5 shrink-0 portal-text-muted" />
                <span className="whitespace-nowrap portal-text">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${PAGE_CONTAINER} py-4 sm:py-6 pb-8 flex flex-col gap-4 sm:gap-5`}>
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {children.map((child) => {
              const active = child.id === selectedChild.id
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onChildChange(child)}
                  className={`flex items-center shrink-0 rounded-full px-3 py-2 text-xs sm:text-sm font-medium transition-all gap-1.5 ${
                    active ? 'portal-child-tab-active' : 'portal-child-tab'
                  }`}
                >
                  <FiUser className="h-4 w-4 shrink-0 opacity-80" />
                  {studentFullName(child)}
                </button>
              )
            })}
          </div>
        )}

        <section className="portal-profile-banner rounded-xl shadow-sm">
          <div className="flex flex-row items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
            <StudentAvatar
              name={studentFullName(selectedChild)}
              photoUrl={selectedChild.photo_url}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full ring-2 ring-white/40 object-cover shadow-sm shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  {studentFullName(selectedChild)}
                </h2>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0">
                  {selectedChild.status || 'Active'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 leading-snug mt-0.5 truncate sm:whitespace-normal">
                {selectedChild.class_name}
                {selectedChild.section_name ? ` • ${selectedChild.section_name}` : ''}
                {selectedChild.roll_number ? ` • Roll No. ${selectedChild.roll_number}` : ''}
              </p>
              <p className="text-xs text-white/75 mt-0.5 truncate">{branding.school_name}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/profile/${studentId}`)}
              className="shrink-0 rounded-md portal-profile-btn px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
            >
              View Profile
            </button>
          </div>
        </section>

        {loading ? (
          <div className={SECTION_STACK}>
            <DashboardSkeleton />
          </div>
        ) : stats ? (
          <div className={SECTION_STACK}>
            <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 auto-rows-fr">
              <StatusCard
                title="Today's Attendance"
                value={formatTodayAttendance(stats.attendance.todayStatus)}
                icon={FiCheck}
                chip="success"
                actionLabel="View Details"
                onClick={() => router.push(`/attendance/${studentId}`)}
              />
              <StatusCard
                title="Pending Fees"
                value={formatCurrency(stats.fees.pending)}
                subtitle={
                  stats.fees.nextDueDate
                    ? `Due ${new Date(stats.fees.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : undefined
                }
                icon={RupeeIcon}
                chip="warning"
                actionLabel="Pay Now"
                onClick={() => router.push(`/fees/${studentId}`)}
              />
              <StatusCard
                title="Homework Due"
                value={String(stats.homework.pending)}
                subtitle={stats.homework.dueToday > 0 ? 'Due today' : 'Pending assignments'}
                icon={FiBook}
                chip="purple"
                actionLabel="View Homework"
                onClick={() => router.push(`/homework/${studentId}`)}
              />
              <StatusCard
                title="Upcoming Exam"
                value={stats.exam?.name || '—'}
                subtitle={
                  stats.exam
                    ? new Date(stats.exam.start_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'No exam scheduled'
                }
                icon={FiCalendar}
                chip="info"
                actionLabel="View Details"
                onClick={() => router.push('/results')}
              />
              <StatusCard
                title="Unread Messages"
                value={String(stats.unreadNotices)}
                subtitle="School notices"
                icon={FiMessageSquare}
                chip="danger"
                actionLabel="View Messages"
                onClick={() => router.push('/notifications')}
              />
            </section>

            <section className={`grid grid-cols-1 lg:grid-cols-2 ${GRID_GAP_LG}`}>
              <PanelCard title="Attendance Overview" actionLabel="This Month">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="portal-stat-cell px-2 py-3 flex items-center justify-center min-h-[5.5rem]">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
                      <AttendanceRing percentage={attendancePct} className="h-full w-full" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base sm:text-lg font-bold portal-text tracking-tight leading-none">
                          {attendancePct}%
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-medium portal-text-muted mt-0.5">
                          Attendance
                        </span>
                      </div>
                    </div>
                  </div>
                  <MiniStat label="Present" value={stats.attendance.presentDays} color="text-green-600" />
                  <MiniStat label="Absent" value={stats.attendance.absentDays} color="text-red-600" />
                  <MiniStat label="Late" value={stats.attendance.lateDays} color="text-amber-600" />
                </div>
                {stats.attendance.trend.length > 0 && (
                  <div className="mt-4 pt-4 border-t portal-divider">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide portal-text-muted mb-2 px-0.5">
                      Attendance Trend
                    </p>
                    <div className="flex items-end gap-2 sm:gap-3 h-16 sm:h-20 px-1 sm:px-2">
                      {stats.attendance.trend.map((point) => (
                        <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                          <div className="w-full h-full flex items-end justify-center">
                            <div
                              className="w-full max-w-[2.5rem] rounded-t-md portal-trend-bar"
                              style={{ height: `${Math.max(point.percentage, 12)}%` }}
                            />
                          </div>
                          <span className="text-[10px] portal-text-muted">{point.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PanelCard>

              <PanelCard
                title="Fee Summary"
                actionLabel="View Details"
                onAction={() => router.push(`/fees/${studentId}`)}
              >
                <div className="space-y-2">
                  <FeeRow label="Total Fees" value={formatCurrency(stats.fees.total)} />
                  <FeeRow label="Paid" value={formatCurrency(stats.fees.paid)} valueClass="text-green-600" />
                  <FeeRow label="Pending" value={formatCurrency(stats.fees.pending)} valueClass="text-orange-600" />
                </div>
                <div className="mt-4 pt-4 border-t portal-divider">
                  <div className="flex justify-between text-xs font-medium portal-text-muted mb-2.5">
                    <span>Paid {stats.fees.paidPercent}%</span>
                    <span>Pending {100 - stats.fees.paidPercent}%</span>
                  </div>
                  <div className="h-2.5 rounded-full portal-progress-track overflow-hidden">
                    <div
                      className="h-full rounded-full portal-progress-paid"
                      style={{ width: `${stats.fees.paidPercent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/fees/${studentId}`)}
                    className="portal-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Pay Now
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/fees/${studentId}`)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium portal-text portal-card hover:opacity-90 transition-opacity"
                  >
                    Fee History
                  </button>
                </div>
              </PanelCard>
            </section>

            <section className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 ${GRID_GAP_LG}`}>
              <InfoCard
                title="Today's Schedule"
                actionLabel="View Timetable"
                icon={FiClock}
                emptyMessage="No timetable configured for today."
              >
                {stats.schedule.length > 0 ? (
                  <ul className="divide-y portal-divider">
                    {stats.schedule.map((slot, index) => (
                      <li
                        key={`${slot.period_name}-${index}`}
                        className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium portal-text">{slot.subject_name || 'Free period'}</p>
                          <p className="text-xs portal-text-muted">{slot.period_name}</p>
                        </div>
                        <span className="text-xs portal-text-muted whitespace-nowrap">
                          {formatTimeLabel(slot.start_time)}
                          {slot.end_time ? ` - ${formatTimeLabel(slot.end_time)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </InfoCard>

              <InfoCard
                title="Recent Homework"
                actionLabel="View All"
                icon={FiBook}
                onAction={() => router.push(`/homework/${studentId}`)}
                emptyMessage="No homework assigned yet."
              >
                {stats.homework.recent.length > 0 ? (
                  <ul className="divide-y portal-divider">
                    {stats.homework.recent.map((hw) => (
                      <li key={hw.id} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium portal-text truncate">{hw.title}</p>
                            <p className="text-xs portal-text-muted">{hw.subject_name || 'Subject'}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              hw.submission_status === 'pending'
                                ? 'portal-badge-pending'
                                : 'portal-badge-done'
                            }`}
                          >
                            {hw.submission_status === 'pending' ? 'Pending' : 'Done'}
                          </span>
                        </div>
                        {hw.due_date && (
                          <p className="text-xs portal-text-muted mt-1 opacity-80">
                            Due {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </InfoCard>

              <InfoCard
                title="School Notifications"
                actionLabel="View All"
                icon={FiBell}
                onAction={() => router.push('/notifications')}
                emptyMessage="No notifications published yet."
              >
                {stats.notifications?.length ? (
                  <ul className="divide-y portal-divider">
                    {stats.notifications.map((item) => (
                      <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="font-semibold portal-text leading-snug">{item.title}</p>
                        <p className="text-sm portal-text-muted leading-relaxed line-clamp-2 mt-1">
                          {item.message}
                        </p>
                        {(item.published_at || item.created_at) && (
                          <p className="text-xs portal-text-muted mt-1 opacity-80">
                            {new Date(item.published_at || item.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : stats.notice ? (
                  <div className="space-y-3">
                    <p className="font-semibold portal-text leading-snug">{stats.notice.title}</p>
                    <p className="text-sm portal-text-muted leading-relaxed line-clamp-4">{stats.notice.content}</p>
                  </div>
                ) : null}
              </InfoCard>

              <InfoCard
                title="Upcoming Events"
                actionLabel="View Calendar"
                icon={FiCalendar}
                emptyMessage="No upcoming events."
                onAction={() => router.push('/calendar')}
              >
                {stats.events.length > 0 ? (
                  <ul className="divide-y portal-divider -mx-1">
                    {stats.events.map((event, index) =>
                      event.start_date ? (
                        <ParentEventListRow
                          key={`${event.title}-${event.start_date}-${index}`}
                          event={{
                            title: event.title,
                            start_date: event.start_date,
                            start_time: event.start_time,
                            all_day: event.all_day,
                            event_type: event.event_type,
                            kind: event.kind,
                          }}
                          index={index}
                        />
                      ) : (
                        <li key={`${event.title}-${index}`} className="py-2.5">
                          <p className="font-medium portal-text">{event.title}</p>
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}
              </InfoCard>

              <InfoCard
                title="Transport"
                actionLabel="View Details"
                icon={FiTruck}
                emptyMessage="No transport assigned."
              >
                {stats.transport ? (
                  <div className="space-y-2.5">
                    <p className="font-semibold portal-text">{stats.transport.route_name || 'Assigned route'}</p>
                    {stats.transport.stop_name && (
                      <p className="text-sm portal-text-muted">Stop: {stats.transport.stop_name}</p>
                    )}
                    {stats.transport.vehicle_number && (
                      <p className="text-sm portal-text-muted opacity-90">Vehicle: {stats.transport.vehicle_number}</p>
                    )}
                  </div>
                ) : null}
              </InfoCard>
            </section>

            <section>
              <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider portal-text-muted mb-2 sm:mb-3">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <QuickPill label="Apply Leave" icon={FiCalendar} onClick={() => router.push(`/attendance/${studentId}`)} />
                <QuickPill label="Fee Payment" icon={RupeeIcon} onClick={() => router.push(`/fees/${studentId}`)} />
                <QuickPill label="Homework" icon={FiBook} onClick={() => router.push(`/homework/${studentId}`)} />
                <QuickPill label="Download Receipt" icon={FiFileText} onClick={() => router.push(`/fees/${studentId}`)} />
                <QuickPill label="Report Card" icon={FiAward} onClick={() => router.push(`/grades/${studentId}`)} />
                <QuickPill label="Profile" icon={FiUser} onClick={() => router.push(`/profile/${studentId}`)} />
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-3xl portal-card px-6 py-14 sm:py-16 text-center portal-text-muted shadow-sm">
            Unable to load dashboard data. Please refresh the page.
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardCardHeader({
  title,
  actionLabel,
  onAction,
  icon: Icon,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className={CARD_HEADER}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md portal-icon-chip shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <h3 className="text-sm font-semibold portal-text tracking-tight truncate">{title}</h3>
      </div>
      {actionLabel ? (
        onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="text-xs sm:text-sm font-medium portal-link-accent shrink-0 transition-colors"
          >
            {actionLabel}
          </button>
        ) : (
          <span className="text-xs sm:text-sm font-medium portal-link-accent shrink-0">{actionLabel}</span>
        )
      ) : null}
    </div>
  )
}

function StatusCard({
  title,
  value,
  subtitle,
  icon: Icon,
  chip,
  actionLabel,
  onClick,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  chip: keyof typeof CHIP_CLASS
  actionLabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left portal-card rounded-xl p-4 shadow-sm h-full min-h-[8.5rem] flex flex-col gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium portal-text-muted leading-snug pr-1">{title}</p>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${CHIP_CLASS[chip]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-base sm:text-lg font-bold portal-text leading-snug break-words">{value}</p>
        {subtitle ? (
          <p className="text-xs portal-text-muted leading-snug">{subtitle}</p>
        ) : (
          <p className="text-xs sm:text-sm text-transparent select-none" aria-hidden>
            &nbsp;
          </p>
        )}
      </div>

      <p className="pt-0.5 text-xs sm:text-sm portal-link-action inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
        {actionLabel} <FiChevronRight className="h-3.5 w-3.5 shrink-0" />
      </p>
    </button>
  )
}

function PanelCard({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`${CARD_SHELL} h-full overflow-hidden flex flex-col`}>
      <DashboardCardHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="portal-stat-cell px-2 py-3 text-center min-h-[5.5rem] flex flex-col items-center justify-center">
      <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-[11px] font-medium portal-text-muted mt-1">{label}</p>
    </div>
  )
}

function FeeRow({
  label,
  value,
  valueClass = 'portal-text',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="portal-text-muted">{label}</span>
      <span className={`font-semibold tabular-nums text-right ${valueClass}`}>{value}</span>
    </div>
  )
}

function InfoCard({
  title,
  actionLabel,
  icon: Icon,
  onAction,
  emptyMessage,
  children,
}: {
  title: string
  actionLabel?: string
  icon: React.ComponentType<{ className?: string }>
  onAction?: () => void
  emptyMessage: string
  children?: React.ReactNode
}) {
  const hasContent = React.Children.count(children) > 0

  return (
    <div className={`${CARD_SHELL} min-h-[11rem] sm:min-h-[12rem] flex flex-col h-full`}>
      <DashboardCardHeader title={title} actionLabel={actionLabel} onAction={onAction} icon={Icon} />
      <div className="flex-1 min-h-0">
        {hasContent ? (
          children
        ) : (
          <div className="h-full min-h-[5rem] flex items-center justify-center text-center px-2">
            <p className="text-xs sm:text-sm portal-text-muted leading-relaxed max-w-[16rem]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickPill({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full portal-quick-pill px-3 py-2 text-xs sm:text-sm font-medium shadow-sm transition-all"
    >
      <Icon className="h-3.5 w-3.5 portal-text-muted shrink-0" />
      {label}
    </button>
  )
}

function AttendanceRing({
  percentage,
  className = 'h-36 w-36',
}: {
  percentage: number
  className?: string
}) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <svg className={`-rotate-90 ${className}`} viewBox="0 0 120 120" aria-hidden>
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="portal-attendance-ring-track"
        strokeWidth="10"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="portal-attendance-ring-progress"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl portal-card p-4 shadow-sm animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl portal-card p-4 shadow-sm animate-pulse" />
        <div className="h-64 rounded-xl portal-card p-4 shadow-sm animate-pulse" />
      </div>
    </>
  )
}
