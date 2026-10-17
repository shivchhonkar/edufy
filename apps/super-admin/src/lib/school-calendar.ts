import type { RequestDb } from '@/lib/request-db';
import { ensureSchoolEventsSchema } from '@/lib/ensure-school-events-schema';
import { ensureHolidaySchema } from '@/lib/ensure-holiday-schema';
import { syncUnlinkedPtmSchedules } from '@/lib/ptm-calendar-sync';
import { getCalendarDateString } from '@edulakhya/utils';

export type CalendarEventKind = 'holiday' | 'school_event';

export interface CalendarEvent {
  id: number;
  kind: CalendarEventKind;
  title: string;
  description?: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  audience?: string;
  status?: string;
}

function toDateString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const iso = value.toISOString();
    if (iso.endsWith('T00:00:00.000Z')) return iso.slice(0, 10);
    return getCalendarDateString(value);
  }
  return String(value).slice(0, 10);
}

export async function fetchCalendarEventsInRange(
  db: RequestDb,
  startDate: string,
  endDate: string,
  options?: { parentVisibleOnly?: boolean },
): Promise<CalendarEvent[]> {
  await ensureSchoolEventsSchema(db);
  await ensureHolidaySchema(db);
  await syncUnlinkedPtmSchedules(db);

  const parentVisibleOnly = options?.parentVisibleOnly ?? false;
  const schoolEventFilter = parentVisibleOnly
    ? `AND status = 'published' AND audience IN ('all', 'parents')`
    : '';
  const holidayScopeFilter = parentVisibleOnly
    ? `AND (scope = 'school' OR scope IS NULL OR class_id IS NULL)`
    : '';

  const [holidays, schoolEvents] = await Promise.all([
    db.query<{
      id: number;
      date: Date;
      name: string;
      type: string;
      description: string | null;
      start_date: Date | null;
      end_date: Date | null;
      remark: string | null;
    }>(
      `SELECT id, date, name, type, description,
              COALESCE(start_date, date) AS start_date,
              COALESCE(end_date, start_date, date) AS end_date,
              COALESCE(remark, description) AS remark
       FROM holidays
       WHERE COALESCE(start_date, date) <= $2
         AND COALESCE(end_date, start_date, date) >= $1
         ${holidayScopeFilter}
       ORDER BY COALESCE(start_date, date) ASC`,
      [startDate, endDate],
    ),
    db.query<{
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
      `SELECT id, title, description, event_type,
              to_char(start_date, 'YYYY-MM-DD') AS start_date,
              to_char(COALESCE(end_date, start_date), 'YYYY-MM-DD') AS end_date,
              all_day, start_time, end_time, location, audience, status
       FROM school_events
       WHERE start_date <= $2
         AND COALESCE(end_date, start_date) >= $1
         ${schoolEventFilter}
       ORDER BY start_date ASC, start_time ASC NULLS FIRST`,
      [startDate, endDate],
    ),
  ]);

  const holidayEvents: CalendarEvent[] = holidays.rows.map((row) => {
    const start = toDateString(row.start_date || row.date);
    const end = toDateString(row.end_date || start);
    return {
      id: row.id,
      kind: 'holiday',
      title: row.remark || row.name,
      description: row.description || row.remark,
      event_type: row.type,
      start_date: start,
      end_date: end,
      all_day: true,
      audience: 'all',
      status: 'published',
    };
  });

  const eventRows: CalendarEvent[] = schoolEvents.rows.map((row) => ({
    id: row.id,
    kind: 'school_event',
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date ?? row.start_date),
    all_day: row.all_day,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    audience: row.audience,
    status: row.status,
  }));

  return [...holidayEvents, ...eventRows].sort((a, b) => {
    const dateCompare = a.start_date.localeCompare(b.start_date);
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });
}

export async function fetchAllCalendarEvents(
  db: RequestDb,
  options?: { parentVisibleOnly?: boolean },
): Promise<CalendarEvent[]> {
  await ensureSchoolEventsSchema(db);
  await ensureHolidaySchema(db);
  await syncUnlinkedPtmSchedules(db);

  const parentVisibleOnly = options?.parentVisibleOnly ?? false;
  const schoolEventFilter = parentVisibleOnly
    ? `WHERE status = 'published' AND audience IN ('all', 'parents')`
    : '';
  const holidayScopeFilter = parentVisibleOnly
    ? `WHERE (scope = 'school' OR scope IS NULL OR class_id IS NULL)`
    : '';

  const [holidays, schoolEvents] = await Promise.all([
    db.query<{
      id: number;
      date: Date;
      name: string;
      type: string;
      description: string | null;
      start_date: Date | null;
      end_date: Date | null;
      remark: string | null;
    }>(
      `SELECT id, date, name, type, description,
              COALESCE(start_date, date) AS start_date,
              COALESCE(end_date, start_date, date) AS end_date,
              COALESCE(remark, description) AS remark
       FROM holidays
       ${holidayScopeFilter}
       ORDER BY COALESCE(start_date, date) ASC`,
    ),
    db.query<{
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
      `SELECT id, title, description, event_type,
              to_char(start_date, 'YYYY-MM-DD') AS start_date,
              to_char(COALESCE(end_date, start_date), 'YYYY-MM-DD') AS end_date,
              all_day, start_time, end_time, location, audience, status
       FROM school_events
       ${schoolEventFilter}
       ORDER BY start_date ASC, start_time ASC NULLS FIRST`,
    ),
  ]);

  const holidayEvents: CalendarEvent[] = holidays.rows.map((row) => {
    const start = toDateString(row.start_date || row.date);
    const end = toDateString(row.end_date || start);
    return {
      id: row.id,
      kind: 'holiday',
      title: row.remark || row.name,
      description: row.description || row.remark,
      event_type: row.type,
      start_date: start,
      end_date: end,
      all_day: true,
      audience: 'all',
      status: 'published',
    };
  });

  const eventRows: CalendarEvent[] = schoolEvents.rows.map((row) => ({
    id: row.id,
    kind: 'school_event',
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date ?? row.start_date),
    all_day: row.all_day,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    audience: row.audience,
    status: row.status,
  }));

  return [...holidayEvents, ...eventRows].sort((a, b) => {
    const dateCompare = a.start_date.localeCompare(b.start_date);
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });
}

export async function fetchUpcomingCalendarEvents(
  db: RequestDb,
  limit = 3,
): Promise<CalendarEvent[]> {
  const today = new Date();
  const start = getCalendarDateString(today);
  const end = getCalendarDateString(
    new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()),
  );

  const events = await fetchCalendarEventsInRange(db, start, end, { parentVisibleOnly: true });
  return events.filter((event) => event.end_date >= start).slice(0, limit);
}
