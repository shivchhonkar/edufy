'use client';

import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import type { CalendarEvent } from '@/lib/school-calendar';

const BADGE_PALETTE = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
] as const;

function eventBadgeColor(
  eventType?: string,
  kind?: string,
  index = 0,
): (typeof BADGE_PALETTE)[number] {
  if (kind === 'holiday') return 'bg-rose-500';
  switch (eventType) {
    case 'exam':
      return 'bg-amber-500';
    case 'meeting':
    case 'ptm':
      return 'bg-blue-500';
    case 'sports':
      return 'bg-emerald-500';
    default:
      return BADGE_PALETTE[index % BADGE_PALETTE.length];
  }
}

function parseDateParts(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
}

function formatEventSubtitle(event: CalendarEvent): string {
  const { weekday } = parseDateParts(event.start_date);
  let line = weekday;

  if (!event.all_day && event.start_time) {
    const [hours, minutes] = event.start_time.slice(0, 5).split(':').map(Number);
    const timeDate = new Date(`${event.start_date}T12:00:00`);
    timeDate.setHours(hours, minutes || 0, 0, 0);
    const timeLabel = timeDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    line = `${weekday}, ${timeLabel}`;
  }

  if (event.end_date !== event.start_date) {
    const end = parseDateParts(event.end_date);
    line = `${line} · until ${end.weekday}, ${end.day} ${end.month}`;
  }

  return line;
}

function eventTypeLabel(event: CalendarEvent): string {
  if (event.kind === 'holiday') return `Holiday · ${event.event_type}`;
  if (event.event_type === 'ptm') return 'PTM';
  return event.event_type;
}

function eventTypePillClass(event: CalendarEvent): string {
  if (event.kind === 'holiday') return 'bg-rose-100 text-rose-800 border-rose-200';
  switch (event.event_type) {
    case 'exam':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'meeting':
    case 'ptm':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'sports':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-primary-50 text-primary-800 border-primary-200';
  }
}

function EventDateBadge({ date, headerColor }: { date: string; headerColor: string }) {
  const { month, day } = parseDateParts(date);

  return (
    <div
      className="w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white text-center"
      aria-hidden
    >
      <div className={`${headerColor} px-1 py-0.5 text-[10px] font-semibold tracking-wide text-white`}>
        {month}
      </div>
      <div className="py-1.5 text-base font-semibold leading-none text-gray-900">{day}</div>
    </div>
  );
}

export default function CalendarEventListRow({
  event,
  index = 0,
  highlighted = false,
  muted = false,
  compact = false,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  index?: number;
  highlighted?: boolean;
  muted?: boolean;
  compact?: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const badgeColor = eventBadgeColor(event.event_type, event.kind, index);
  const subtitle = formatEventSubtitle(event);

  return (
    <li
      className={`flex items-center gap-3 px-2 py-2.5 ${
        highlighted ? 'rounded-lg bg-primary-50' : ''
      } ${muted ? 'opacity-60' : ''}`}
    >
      <EventDateBadge date={event.start_date} headerColor={badgeColor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`min-w-0 truncate text-sm font-medium leading-5 ${
              event.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {event.title}
          </p>
          <span
            className={`inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize ${eventTypePillClass(event)}`}
          >
            {eventTypeLabel(event)}
          </span>
          {event.status && event.status !== 'published' && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">{event.status}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>
        {!compact && event.location && (
          <p className="mt-0.5 truncate text-xs text-gray-500">Venue: {event.location}</p>
        )}
        {!compact && event.description && (
          <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-gray-500">{event.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onEdit(event)}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-primary-600"
          aria-label="Edit"
        >
          <FiEdit2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(event)}
          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete"
        >
          <FiTrash2 size={15} />
        </button>
      </div>
    </li>
  );
}
