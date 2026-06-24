'use client';

import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import type { AcademicCalendarEntry } from '@/lib/academic-calendar';

const BADGE_COLORS: Record<string, string> = {
  holiday: 'bg-rose-500',
  exam: 'bg-amber-500',
  ptm: 'bg-blue-500',
  event: 'bg-violet-500',
  term_date: 'bg-emerald-500',
};

const PILL_CLASSES: Record<string, string> = {
  holiday: 'bg-rose-100 text-rose-800 border-rose-200',
  exam: 'bg-amber-100 text-amber-800 border-amber-200',
  ptm: 'bg-blue-100 text-blue-800 border-blue-200',
  event: 'bg-violet-100 text-violet-800 border-violet-200',
  term_date: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  holiday: 'Holiday',
  exam: 'Exam',
  ptm: 'PTM',
  event: 'Event',
  term_date: 'Term Date',
};

function parseDateParts(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
}

function formatSubtitle(entry: AcademicCalendarEntry): string {
  const { weekday } = parseDateParts(entry.start_date);
  if (entry.end_date !== entry.start_date) {
    const end = parseDateParts(entry.end_date);
    return `${weekday} · until ${end.day} ${end.month}`;
  }
  if (entry.category === 'term_date' && entry.academic_year) {
    return `${weekday} · ${entry.academic_year}`;
  }
  return weekday;
}

export default function AcademicCalendarEntryRow({
  entry,
  highlighted = false,
  onEdit,
  onDelete,
}: {
  entry: AcademicCalendarEntry;
  highlighted?: boolean;
  onEdit: (entry: AcademicCalendarEntry) => void;
  onDelete: (entry: AcademicCalendarEntry) => void;
}) {
  const { month, day } = parseDateParts(entry.start_date);
  const badgeColor = BADGE_COLORS[entry.category] || 'bg-gray-500';

  return (
    <li
      className={`flex items-start gap-3 py-3 ${highlighted ? '-mx-2 rounded-xl bg-primary-50 px-2' : ''}`}
    >
      <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white text-center shadow-sm">
        <div className={`${badgeColor} px-1 py-1 text-[10px] font-bold tracking-wide text-white`}>
          {month}
        </div>
        <div className="py-2 text-xl font-bold leading-none text-gray-900">{day}</div>
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${PILL_CLASSES[entry.category]}`}
        >
          {CATEGORY_LABELS[entry.category]}
        </span>
        <p className="mt-1 text-sm font-semibold text-gray-900">{entry.title}</p>
        <p className="text-xs text-gray-500">{formatSubtitle(entry)}</p>
        {entry.location && <p className="mt-1 truncate text-xs text-gray-500">Venue: {entry.location}</p>}
        {entry.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-600">{entry.description}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-primary-600"
          aria-label="Edit"
        >
          <FiEdit2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export function entryColorClass(category: AcademicCalendarEntry['category']): string {
  return PILL_CLASSES[category] || 'bg-gray-100 text-gray-800 border-gray-200';
}
