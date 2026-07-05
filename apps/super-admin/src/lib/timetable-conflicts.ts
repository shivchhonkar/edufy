type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export interface TimetablePlacementInput {
  class_id: number;
  section_id: number | null;
  day_of_week: number;
  period_id: number;
  subject_id: number | null;
  staff_id: number | null;
  room: string | null;
  academic_year?: string | null;
  exclude_entry_id?: number | null;
}

export interface TimetableConflict {
  code: string;
  message: string;
}

export async function validateTimetablePlacement(
  db: Db,
  input: TimetablePlacementInput,
): Promise<TimetableConflict[]> {
  const conflicts: TimetableConflict[] = [];

  if (!input.subject_id && !input.staff_id) {
    return conflicts;
  }

  const periodResult = await db.query(
    `SELECT name, slot_type, COALESCE(is_schedulable, true) AS is_schedulable
     FROM timetable_periods WHERE id = $1`,
    [input.period_id],
  );
  const period = periodResult.rows[0] as
    | { name: string; slot_type: string; is_schedulable: boolean }
    | undefined;

  if (!period) {
    conflicts.push({ code: 'invalid_period', message: 'Period not found.' });
    return conflicts;
  }

  if (period.is_schedulable === false || period.slot_type !== 'period') {
    conflicts.push({
      code: 'non_schedulable_slot',
      message: `${period.name} is a break and cannot be scheduled.`,
    });
    return conflicts;
  }

  const workingDayResult = await db.query(
    `SELECT is_working, teaching_period_count
     FROM school_working_days WHERE day_of_week = $1`,
    [input.day_of_week],
  );
  if (workingDayResult.rows.length) {
    const workingDay = workingDayResult.rows[0] as {
      is_working: boolean;
      teaching_period_count: number;
    };
    if (!workingDay.is_working) {
      conflicts.push({
        code: 'non_working_day',
        message: 'This day is not a working day.',
      });
    } else {
      const schedulableBefore = await db.query(
        `SELECT COUNT(*)::int AS count
         FROM timetable_periods
         WHERE COALESCE(is_schedulable, true) = true
           AND COALESCE(slot_type, 'period') = 'period'
           AND sort_order <= (
             SELECT sort_order FROM timetable_periods WHERE id = $1
           )`,
        [input.period_id],
      );
      const periodIndex = (schedulableBefore.rows[0] as { count: number }).count;
      if (periodIndex > workingDay.teaching_period_count) {
        conflicts.push({
          code: 'day_period_limit',
          message: `Only ${workingDay.teaching_period_count} teaching period(s) are allowed on this day.`,
        });
      }
    }
  }

  if (input.staff_id) {
    const availability = await db.query(
      `SELECT is_available FROM teacher_period_availability
       WHERE staff_id = $1 AND day_of_week = $2 AND period_id = $3`,
      [input.staff_id, input.day_of_week, input.period_id],
    );
    if (
      availability.rows.length &&
      (availability.rows[0] as { is_available: boolean }).is_available === false
    ) {
      conflicts.push({
        code: 'teacher_unavailable',
        message: 'Teacher is marked unavailable for this period.',
      });
    }

    const teacherClash = await db.query(
      `SELECT cl.name AS class_name, sec.name AS section_name, tp.name AS period_name
       FROM class_timetable ct
       JOIN classes cl ON ct.class_id = cl.id
       LEFT JOIN sections sec ON ct.section_id = sec.id
       JOIN timetable_periods tp ON ct.period_id = tp.id
       WHERE ct.staff_id = $1
         AND ct.day_of_week = $2
         AND ct.period_id = $3
         AND ($4::int IS NULL OR ct.id <> $4)
         AND NOT (ct.class_id = $5 AND ct.section_id IS NOT DISTINCT FROM $6)
       LIMIT 1`,
      [
        input.staff_id,
        input.day_of_week,
        input.period_id,
        input.exclude_entry_id ?? null,
        input.class_id,
        input.section_id,
      ],
    );
    if (teacherClash.rows.length) {
      const row = teacherClash.rows[0] as {
        class_name: string;
        section_name: string | null;
        period_name: string;
      };
      conflicts.push({
        code: 'teacher_clash',
        message: `Teacher is already assigned to ${row.class_name}${
          row.section_name ? ` ${row.section_name}` : ''
        } on this period.`,
      });
    }
  }

  if (input.room?.trim()) {
    const roomClash = await db.query(
      `SELECT cl.name AS class_name, sec.name AS section_name
       FROM class_timetable ct
       JOIN classes cl ON ct.class_id = cl.id
       LEFT JOIN sections sec ON ct.section_id = sec.id
       WHERE LOWER(TRIM(ct.room)) = LOWER(TRIM($1))
         AND ct.day_of_week = $2
         AND ct.period_id = $3
         AND ($4::int IS NULL OR ct.id <> $4)
         AND NOT (ct.class_id = $5 AND ct.section_id IS NOT DISTINCT FROM $6)
       LIMIT 1`,
      [
        input.room,
        input.day_of_week,
        input.period_id,
        input.exclude_entry_id ?? null,
        input.class_id,
        input.section_id,
      ],
    );
    if (roomClash.rows.length) {
      const row = roomClash.rows[0] as { class_name: string; section_name: string | null };
      conflicts.push({
        code: 'room_clash',
        message: `Room ${input.room} is already used by ${row.class_name}${
          row.section_name ? ` ${row.section_name}` : ''
        }.`,
      });
    }
  }

  return conflicts;
}

export async function resolveTeacherForSubject(
  db: Db,
  classId: number,
  sectionId: number | null,
  subjectId: number,
  academicYear?: string | null,
) {
  const params: unknown[] = [classId, subjectId];
  let query = `
    SELECT staff_id
    FROM teacher_assignments
    WHERE class_id = $1 AND subject_id = $2`;
  if (sectionId) {
    params.push(sectionId);
    query += ` AND (section_id = $${params.length} OR section_id IS NULL)`;
  }
  if (academicYear) {
    params.push(academicYear);
    query += ` AND academic_year = $${params.length}`;
  }
  query += ` ORDER BY CASE WHEN section_id IS NULL THEN 1 ELSE 0 END LIMIT 1`;

  const result = await db.query(query, params);
  return (result.rows[0] as { staff_id: number } | undefined)?.staff_id ?? null;
}

export async function resolveRoomForSubject(db: Db, classId: number, subjectId: number) {
  const requirement = await db.query(
    `SELECT preferred_room FROM class_subject_period_requirements
     WHERE class_id = $1 AND subject_id = $2 AND preferred_room IS NOT NULL`,
    [classId, subjectId],
  );
  const preferred = (requirement.rows[0] as { preferred_room: string } | undefined)?.preferred_room;
  if (preferred) return preferred;

  const defaults = await db.query(
    `SELECT room_name FROM subject_room_defaults WHERE subject_id = $1`,
    [subjectId],
  );
  return (defaults.rows[0] as { room_name: string } | undefined)?.room_name ?? null;
}
