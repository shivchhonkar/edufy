import type { RequestDb } from '@/lib/request-db';
import { getCalendarDateString } from '@edulakhya/utils';
import { ensureAcademicCalendarSchema } from '@/lib/ensure-academic-calendar-schema';

export type AcademicCalendarCategory =
  | 'holiday'
  | 'exam'
  | 'ptm'
  | 'event'
  | 'term_date'
  | 'all';

export type AcademicCalendarSourceKind = 'holiday' | 'school_event' | 'term_date';

export interface AcademicCalendarEntry {
  id: number;
  category: Exclude<AcademicCalendarCategory, 'all'>;
  source_kind: AcademicCalendarSourceKind;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  holiday_type?: string | null;
  event_type?: string | null;
  all_day?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  audience?: string | null;
  status?: string | null;
  academic_year?: string | null;
  term_number?: number | null;
}

function toDateString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return getCalendarDateString(value);
  return String(value).slice(0, 10);
}

function categoryFromSchoolEvent(eventType: string): Exclude<AcademicCalendarCategory, 'all' | 'holiday' | 'term_date'> {
  if (eventType === 'exam') return 'exam';
  if (eventType === 'ptm' || eventType === 'meeting') return 'ptm';
  return 'event';
}

function matchesCategory(entry: AcademicCalendarEntry, category: AcademicCalendarCategory): boolean {
  if (category === 'all') return true;
  return entry.category === category;
}

export async function fetchAcademicCalendarEntries(
  db: RequestDb,
  options?: {
    category?: AcademicCalendarCategory;
    startDate?: string;
    endDate?: string;
  },
): Promise<AcademicCalendarEntry[]> {
  await ensureAcademicCalendarSchema(db);

  const category = options?.category ?? 'all';
  const startDate = options?.startDate;
  const endDate = options?.endDate;

  const holidayFilter =
    startDate && endDate ? 'WHERE date BETWEEN $1 AND $2' : '';
  const holidayParams = startDate && endDate ? [startDate, endDate] : [];

  const eventConditions: string[] = [];
  const eventParams: unknown[] = [];
  let eventParamIndex = 1;

  if (startDate && endDate) {
    eventConditions.push(`start_date <= $${eventParamIndex + 1}`);
    eventConditions.push(`COALESCE(end_date, start_date) >= $${eventParamIndex}`);
    eventParams.push(startDate, endDate);
    eventParamIndex += 2;
  }

  if (category === 'exam') {
    eventConditions.push(`event_type = 'exam'`);
  } else if (category === 'ptm') {
    eventConditions.push(`event_type IN ('ptm', 'meeting')`);
  } else if (category === 'event') {
    eventConditions.push(`event_type IN ('event', 'sports', 'other')`);
  }

  const eventWhere = eventConditions.length > 0 ? `WHERE ${eventConditions.join(' AND ')}` : '';

  const termConditions: string[] = [];
  const termParams: unknown[] = [];
  let termParamIndex = 1;

  if (startDate && endDate) {
    termConditions.push(`start_date <= $${termParamIndex + 1}`);
    termConditions.push(`end_date >= $${termParamIndex}`);
    termParams.push(startDate, endDate);
    termParamIndex += 2;
  }

  const termWhere = termConditions.length > 0 ? `WHERE ${termConditions.join(' AND ')}` : '';

  const fetchHolidays = category === 'all' || category === 'holiday';
  const fetchEvents = category === 'all' || category === 'exam' || category === 'ptm' || category === 'event';
  const fetchTerms = category === 'all' || category === 'term_date';

  const [holidays, schoolEvents, termDates] = await Promise.all([
    fetchHolidays
      ? db.query<{ id: number; date: Date; name: string; type: string; description: string | null }>(
          `SELECT id, date, name, type, description FROM holidays ${holidayFilter} ORDER BY date ASC`,
          holidayParams,
        )
      : Promise.resolve({ rows: [] }),
    fetchEvents
      ? db.query<{
          id: number;
          title: string;
          description: string | null;
          event_type: string;
          start_date: Date;
          end_date: Date | null;
          all_day: boolean;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          audience: string;
          status: string;
        }>(
          `SELECT id, title, description, event_type, start_date, end_date,
                  all_day, start_time, end_time, location, audience, status
           FROM school_events
           ${eventWhere}
           ORDER BY start_date ASC, start_time ASC NULLS FIRST`,
          eventParams,
        )
      : Promise.resolve({ rows: [] }),
    fetchTerms
      ? db.query<{
          id: number;
          academic_year: string;
          term_name: string;
          term_number: number | null;
          start_date: Date;
          end_date: Date;
          description: string | null;
        }>(
          `SELECT id, academic_year, term_name, term_number, start_date, end_date, description
           FROM academic_term_dates
           ${termWhere}
           ORDER BY start_date ASC`,
          termParams,
        )
      : Promise.resolve({ rows: [] }),
  ]);

  const entries: AcademicCalendarEntry[] = [];

  for (const row of holidays.rows) {
    const date = toDateString(row.date);
    entries.push({
      id: row.id,
      category: 'holiday',
      source_kind: 'holiday',
      title: row.name,
      description: row.description,
      start_date: date,
      end_date: date,
      holiday_type: row.type,
      all_day: true,
      status: 'published',
      audience: 'all',
    });
  }

  for (const row of schoolEvents.rows) {
    entries.push({
      id: row.id,
      category: categoryFromSchoolEvent(row.event_type),
      source_kind: 'school_event',
      title: row.title,
      description: row.description,
      start_date: toDateString(row.start_date),
      end_date: toDateString(row.end_date ?? row.start_date),
      event_type: row.event_type,
      all_day: row.all_day,
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location,
      audience: row.audience,
      status: row.status,
    });
  }

  for (const row of termDates.rows) {
    entries.push({
      id: row.id,
      category: 'term_date',
      source_kind: 'term_date',
      title: row.term_name,
      description: row.description,
      start_date: toDateString(row.start_date),
      end_date: toDateString(row.end_date),
      academic_year: row.academic_year,
      term_number: row.term_number,
      all_day: true,
      status: row.description ? 'published' : 'published',
      audience: 'all',
    });
  }

  return entries
    .filter((entry) => matchesCategory(entry, category))
    .sort((a, b) => {
      const dateCompare = a.start_date.localeCompare(b.start_date);
      if (dateCompare !== 0) return dateCompare;
      return a.title.localeCompare(b.title);
    });
}
