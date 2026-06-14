type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export interface TimetableEntryInput {
  class_id: number;
  section_id: number | null;
  day_of_week: number;
  period_id: number;
  subject_id: number | null;
  staff_id?: number | null;
  room?: string | null;
  academic_year?: string | null;
}

/**
 * Upsert a timetable cell. Uses IS NOT DISTINCT FROM because PostgreSQL
 * UNIQUE + ON CONFLICT does not treat NULL section_id / academic_year reliably.
 */
export async function upsertClassTimetableEntry(db: Db, entry: TimetableEntryInput) {
  const {
    class_id,
    section_id,
    day_of_week,
    period_id,
    subject_id,
    staff_id = null,
    room = null,
    academic_year = null,
  } = entry;

  const existing = await db.query(
    `SELECT id FROM class_timetable
     WHERE class_id = $1
       AND day_of_week = $2
       AND period_id = $3
       AND section_id IS NOT DISTINCT FROM $4
       AND academic_year IS NOT DISTINCT FROM $5
     ORDER BY id
     LIMIT 1`,
    [class_id, day_of_week, period_id, section_id, academic_year]
  );

  if (existing.rows.length > 0) {
    const id = (existing.rows[0] as { id: number }).id;
    return db.query(
      `UPDATE class_timetable
       SET subject_id = $1, staff_id = $2, room = $3
       WHERE id = $4
       RETURNING *`,
      [subject_id, staff_id, room, id]
    );
  }

  return db.query(
    `INSERT INTO class_timetable (
      class_id, section_id, day_of_week, period_id, subject_id, staff_id, room, academic_year
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [class_id, section_id, day_of_week, period_id, subject_id, staff_id, room, academic_year]
  );
}
