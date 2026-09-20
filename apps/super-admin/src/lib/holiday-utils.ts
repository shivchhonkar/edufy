export type HolidayScope = 'school' | 'class';

export interface HolidayRecord {
  id: number;
  date: string;
  name: string;
  type: string;
  description: string | null;
  academic_year: string | null;
  scope: HolidayScope;
  class_id: number | null;
  class_name?: string | null;
  start_date: string;
  end_date: string;
  remark: string | null;
  created_at?: string;
}

export function toDateOnly(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function expandDateRange(start: string, end: string): string[] {
  const from = toDateOnly(start);
  const to = toDateOnly(end) || from;
  if (!from) return [];

  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime()) || cursor > last) {
    return from ? [from] : [];
  }

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function collectHolidayDates(
  holidays: Array<{ start_date?: unknown; end_date?: unknown; date?: unknown }>,
): string[] {
  const dates = new Set<string>();
  for (const holiday of holidays) {
    const start = toDateOnly(holiday.start_date || holiday.date);
    const end = toDateOnly(holiday.end_date || start);
    for (const date of expandDateRange(start, end)) {
      dates.add(date);
    }
  }
  return [...dates];
}

export function formatHolidayRange(start: string, end: string): string {
  const from = toDateOnly(start);
  const to = toDateOnly(end) || from;
  if (!from) return '—';
  if (from === to) return from;
  return `${from} – ${to}`;
}

export function holidayTitle(holiday: Pick<HolidayRecord, 'name' | 'remark'>): string {
  return holiday.remark?.trim() || holiday.name?.trim() || 'Holiday';
}
