import type { TimetablePeriod, WorkingDay } from './types';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

export function formatTime(time: string | null | undefined) {
  if (!time) return '';
  return String(time).slice(0, 5);
}

export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [hours, mins] = String(time).slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  return hours * 60 + mins;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes == null) return '';
  const totalMinutes = startMinutes + minutes;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = ((totalMinutes % 60) + 60) % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function getPeriodDurationMinutes(startTime: string, endTime: string): number | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null) return null;
  const duration = end - start;
  return duration > 0 ? duration : null;
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function sortPeriodsByOrder<T extends { sort_order: number; id: number }>(periods: T[]): T[] {
  return [...periods].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function getPreviousPeriodEnd(
  periods: TimetablePeriod[],
  periodId: number | null,
): string | null {
  const sorted = sortPeriodsByOrder(periods);
  if (periodId == null) {
    const last = sorted[sorted.length - 1];
    return last?.end_time ? formatTime(last.end_time) : null;
  }
  const index = sorted.findIndex((period) => period.id === periodId);
  if (index <= 0) return null;
  return formatTime(sorted[index - 1].end_time) || null;
}

export interface ChainedPeriodUpdate {
  id: number;
  start_time: string;
  end_time: string;
}

export function computeChainedPeriodUpdates(periods: TimetablePeriod[]): ChainedPeriodUpdate[] {
  const sorted = sortPeriodsByOrder(periods);
  const updates: ChainedPeriodUpdate[] = [];
  const endById = new Map<number, string>();

  for (const period of sorted) {
    const end = formatTime(period.end_time);
    if (end) endById.set(period.id, end);
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const linkedStart = endById.get(previous.id) ?? formatTime(previous.end_time);
    if (!linkedStart) continue;

    const currentStart = formatTime(current.start_time);
    const currentEnd = formatTime(current.end_time);
    const duration = getPeriodDurationMinutes(currentStart, currentEnd) ?? 40;
    const nextEnd = addMinutesToTime(linkedStart, duration);

    if (linkedStart !== currentStart || nextEnd !== currentEnd) {
      updates.push({
        id: current.id,
        start_time: linkedStart,
        end_time: nextEnd,
      });
      endById.set(current.id, nextEnd);
    }
  }

  return updates;
}

export function getWorkingDays(workingDays: WorkingDay[]) {
  return workingDays
    .filter((day) => day.is_working && day.teaching_period_count > 0)
    .sort((a, b) => {
      const order = (d: number) => (d === 0 ? 7 : d);
      return order(a.day_of_week) - order(b.day_of_week);
    });
}

export function getSchedulablePeriodIndex(
  periodId: number,
  periods: TimetablePeriod[],
): number {
  const sorted = [...periods].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  let index = 0;
  for (const period of sorted) {
    const schedulable =
      period.is_schedulable !== false &&
      (period.slot_type === 'period' || !period.slot_type);
    if (period.id === periodId) {
      return schedulable ? index : -1;
    }
    if (schedulable) index += 1;
  }
  return -1;
}

export function isPeriodAllowedOnDay(
  periodId: number,
  dayOfWeek: number,
  periods: TimetablePeriod[],
  workingDays: WorkingDay[],
): boolean {
  const workingDay = workingDays.find((day) => day.day_of_week === dayOfWeek);
  if (!workingDay?.is_working) return false;
  const periodIndex = getSchedulablePeriodIndex(periodId, periods);
  if (periodIndex < 0) return false;
  return periodIndex <= workingDay.teaching_period_count;
}

export function subjectBadgeColor(name: string) {
  const palette = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + hash * 31;
  return palette[Math.abs(hash) % palette.length];
}
