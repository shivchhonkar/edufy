import type { PoolClient } from 'pg';
import type { RequestDb } from '@/lib/request-db';
import { ensureAcademicCalendarSchema } from '@/lib/ensure-academic-calendar-schema';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';

const PTM_CALENDAR_LOCK = 814271;

type PtmCalendarRow = {
  id: number;
  title: string;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  remarks?: string | null;
  status?: string | null;
  calendar_event_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
};

function timeOrNull(value?: string | null) {
  const text = String(value || '').trim();
  return text || null;
}

function eventPayload(schedule: PtmCalendarRow) {
  const startTime = timeOrNull(schedule.start_time);
  const endTime = timeOrNull(schedule.end_time);
  const classLabel = [schedule.class_name, schedule.section_name].filter(Boolean).join(' - ');
  const description =
    [classLabel ? `Class: ${classLabel}` : null, schedule.remarks || null].filter(Boolean).join('\n') || null;
  return {
    title: schedule.title,
    description,
    allDay: !startTime,
    startTime,
    endTime,
    venue: schedule.venue || null,
    status: schedule.status === 'cancelled' ? 'cancelled' : 'published',
  };
}

async function upsertPtmEvent(client: PoolClient, schedule: PtmCalendarRow) {
  const payload = eventPayload(schedule);
  const existing = await client.query<{ id: number }>(
    `SELECT id
     FROM school_events
     WHERE ptm_schedule_id = $1
        OR ($2::int IS NOT NULL AND id = $2)
     ORDER BY CASE WHEN ptm_schedule_id = $1 THEN 0 ELSE 1 END, id
     LIMIT 1`,
    [schedule.id, schedule.calendar_event_id || null]
  );

  if (existing.rows[0]) {
    const eventId = existing.rows[0].id;
    await client.query(
      `UPDATE school_events e
       SET title = $1,
           description = $2,
           event_type = 'ptm',
           start_date = p.scheduled_date,
           end_date = p.scheduled_date,
           all_day = $3,
           start_time = NULLIF($4, '')::time,
           end_time = NULLIF($5, '')::time,
           location = $6,
           audience = 'parents',
           status = $7,
           ptm_schedule_id = p.id,
           updated_at = CURRENT_TIMESTAMP
       FROM ptm_schedules p
       WHERE e.id = $8 AND p.id = $9`,
      [
        payload.title,
        payload.description,
        payload.allDay,
        payload.startTime || '',
        payload.endTime || '',
        payload.venue,
        payload.status,
        eventId,
        schedule.id,
      ]
    );
    return eventId;
  }

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO school_events (
       title, description, event_type, start_date, end_date,
       all_day, start_time, end_time, location, audience, status, ptm_schedule_id
     )
     SELECT $1, $2, 'ptm', p.scheduled_date, p.scheduled_date,
            $3, NULLIF($4, '')::time, NULLIF($5, '')::time, $6, 'parents', $7, p.id
     FROM ptm_schedules p
     WHERE p.id = $8
     RETURNING id`,
    [
      payload.title,
      payload.description,
      payload.allDay,
      payload.startTime || '',
      payload.endTime || '',
      payload.venue,
      payload.status,
      schedule.id,
    ]
  );
  return inserted.rows[0].id;
}

/** Keep one calendar event per PTM and drop extras created by overlapping syncs. */
export async function reconcilePtmCalendarEvents(db: RequestDb) {
  await ensureStudentOperationsSchema(db);
  await ensureAcademicCalendarSchema(db);

  await db.transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [PTM_CALENDAR_LOCK]);
    await client.query(`ALTER TABLE school_events ADD COLUMN IF NOT EXISTS ptm_schedule_id INTEGER`);
    await client.query(`
      DELETE FROM school_events a
      USING school_events b
      WHERE a.ptm_schedule_id IS NOT NULL
        AND a.ptm_schedule_id = b.ptm_schedule_id
        AND a.id > b.id
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_school_events_ptm_schedule
      ON school_events (ptm_schedule_id)
      WHERE ptm_schedule_id IS NOT NULL
    `);

    const schedules = await client.query<PtmCalendarRow>(
      `SELECT p.id,
              p.title,
              to_char(p.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
              NULLIF(p.start_time, '') AS start_time,
              NULLIF(p.end_time, '') AS end_time,
              p.venue,
              p.remarks,
              p.status,
              p.calendar_event_id,
              c.name AS class_name,
              sec.name AS section_name
       FROM ptm_schedules p
       LEFT JOIN classes c ON c.id = p.class_id
       LEFT JOIN sections sec ON sec.id = p.section_id
       ORDER BY p.id`
    );

    const keepIds: number[] = [];
    for (const schedule of schedules.rows) {
      const eventId = await upsertPtmEvent(client, schedule);
      keepIds.push(eventId);
      await client.query(
        `UPDATE ptm_schedules
         SET calendar_event_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND calendar_event_id IS DISTINCT FROM $2`,
        [schedule.id, eventId]
      );
    }

    await client.query(
      `DELETE FROM school_events
       WHERE event_type = 'ptm'
         AND NOT (id = ANY($1::int[]))`,
      [keepIds.length ? keepIds : [0]]
    );
  });
}

export async function syncPtmCalendarEvent(db: RequestDb) {
  await reconcilePtmCalendarEvents(db);
}

export async function syncUnlinkedPtmSchedules(db: RequestDb) {
  await reconcilePtmCalendarEvents(db);
}

export async function loadPtmForCalendar(db: RequestDb, id: number) {
  await ensureStudentOperationsSchema(db);
  const result = await db.query<PtmCalendarRow>(
    `SELECT p.id, p.title, to_char(p.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
            p.start_time, p.end_time, p.venue, p.remarks, p.status, p.calendar_event_id,
            c.name AS class_name, sec.name AS section_name
     FROM ptm_schedules p
     LEFT JOIN classes c ON p.class_id = c.id
     LEFT JOIN sections sec ON p.section_id = sec.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function removePtmCalendarEvent(db: RequestDb, calendarEventId?: number | null) {
  if (!calendarEventId) return;
  await ensureAcademicCalendarSchema(db);
  await db.query(
    `DELETE FROM school_events WHERE id = $1 AND event_type = 'ptm'`,
    [calendarEventId]
  );
}
