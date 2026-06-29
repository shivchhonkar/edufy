'use client'

export type ParentEventListItem = {
  title: string
  start_date: string
  start_time?: string | null
  end_date?: string
  all_day?: boolean
  event_type?: string
  kind?: string
}

const BADGE_PALETTE = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
] as const

export function eventBadgeColor(
  eventType?: string,
  kind?: string,
  index = 0,
): (typeof BADGE_PALETTE)[number] {
  if (kind === 'holiday') return 'bg-rose-500'
  switch (eventType) {
    case 'exam':
      return 'bg-amber-500'
    case 'meeting':
      return 'bg-blue-500'
    case 'sports':
      return 'bg-emerald-500'
    default:
      return BADGE_PALETTE[index % BADGE_PALETTE.length]
  }
}

function parseDateParts(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
  }
}

export function formatEventListSubtitle(
  date: string,
  startTime?: string | null,
  allDay = true,
): string {
  const { weekday } = parseDateParts(date)
  if (allDay && !startTime) return weekday

  if (startTime) {
    const [hours, minutes] = startTime.slice(0, 5).split(':').map(Number)
    const timeDate = new Date(`${date}T12:00:00`)
    timeDate.setHours(hours, minutes || 0, 0, 0)
    const timeLabel = timeDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${weekday}, ${timeLabel}`
  }

  return weekday
}

function EventDateBadge({
  date,
  headerColor,
}: {
  date: string
  headerColor: string
}) {
  const { month, day } = parseDateParts(date)

  return (
    <div
      className="shrink-0 w-[3.25rem] sm:w-14 overflow-hidden rounded-lg border border-gray-200/90 bg-white text-center shadow-sm"
      aria-hidden
    >
      <div className={`${headerColor} px-1 py-1 text-[9px] sm:text-[10px] font-bold tracking-wide text-white`}>
        {month}
      </div>
      <div className="py-1.5 sm:py-2 text-sm sm:text-sm leading-none portal-text">{day}</div>
    </div>
  )
}

export default function ParentEventListRow({
  event,
  index = 0,
  highlighted = false,
  muted = false,
}: {
  event: ParentEventListItem
  index?: number
  highlighted?: boolean
  muted?: boolean
}) {
  const badgeColor = eventBadgeColor(event.event_type, event.kind, index)
  const subtitle = formatEventListSubtitle(
    event.start_date,
    event.start_time,
    event.all_day ?? true,
  )

  return (
    <li
      className={`flex items-center gap-3 sm:gap-3.5 py-2.5 sm:py-3 transition-colors ${
        highlighted ? 'rounded-xl bg-primary-50/80 px-2 -mx-2' : ''
      } ${muted ? 'opacity-70' : ''}`}
    >
      <EventDateBadge date={event.start_date} headerColor={badgeColor} />
      <div className="min-w-0 flex-1">
        <p className="portal-text text-sm sm:text-[13px] leading-snug">{event.title}</p>
        <p className="text-xs sm:text-xs portal-text-muted mt-0.5">{subtitle}</p>
      </div>
    </li>
  )
}
