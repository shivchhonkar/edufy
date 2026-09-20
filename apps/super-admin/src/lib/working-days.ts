import type { RequestDb } from '@/lib/request-db';
import { DEFAULT_WORKING_DAYS, ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { ensureSchoolSetupSchema } from '@/lib/ensure-school-setup-schema';

export interface WorkingDay {
  day_of_week: number;
  day_name: string;
  is_working: boolean;
  teaching_period_count: number;
}

const DAY_ORDER_SQL = `CASE WHEN day_of_week = 0 THEN 7 ELSE day_of_week END`;

export async function listSchoolWorkingDays(db: RequestDb): Promise<WorkingDay[]> {
  await ensureTimetableSchema(db);
  const result = await db.query<WorkingDay>(
    `SELECT day_of_week, day_name, is_working, teaching_period_count
     FROM school_working_days
     ORDER BY ${DAY_ORDER_SQL}`,
  );
  return result.rows.length ? result.rows : [...DEFAULT_WORKING_DAYS];
}

export async function saveSchoolWorkingDays(db: RequestDb, days: WorkingDay[]): Promise<void> {
  await ensureTimetableSchema(db);
  for (const day of days) {
    await db.query(
      `UPDATE school_working_days
       SET is_working = $2, teaching_period_count = $3
       WHERE day_of_week = $1`,
      [day.day_of_week, day.is_working, day.teaching_period_count ?? 0],
    );
  }
}

export async function listClassWorkingDayOverride(
  db: RequestDb,
  classId: number,
): Promise<WorkingDay[]> {
  await ensureSchoolSetupSchema(db);
  const result = await db.query<WorkingDay>(
    `SELECT day_of_week, day_name, is_working, teaching_period_count
     FROM class_working_days
     WHERE class_id = $1
     ORDER BY ${DAY_ORDER_SQL}`,
    [classId],
  );
  return result.rows;
}

export async function resolveWorkingDays(db: RequestDb, classId?: number | null): Promise<WorkingDay[]> {
  const schoolDays = await listSchoolWorkingDays(db);
  if (!classId) return schoolDays;

  const override = await listClassWorkingDayOverride(db, classId);
  return override.length ? override : schoolDays;
}

export async function saveClassWorkingDays(
  db: RequestDb,
  classId: number,
  days: WorkingDay[],
): Promise<void> {
  await ensureSchoolSetupSchema(db);
  await db.query('DELETE FROM class_working_days WHERE class_id = $1', [classId]);
  for (const day of days) {
    await db.query(
      `INSERT INTO class_working_days (class_id, day_of_week, day_name, is_working, teaching_period_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        classId,
        day.day_of_week,
        day.day_name,
        day.is_working,
        day.is_working ? day.teaching_period_count ?? 0 : 0,
      ],
    );
  }
}

export async function resetClassWorkingDays(db: RequestDb, classId: number): Promise<void> {
  await ensureSchoolSetupSchema(db);
  await db.query('DELETE FROM class_working_days WHERE class_id = $1', [classId]);
}

export function nonWorkingWeekdays(days: WorkingDay[]): number[] {
  return days.filter((day) => !day.is_working).map((day) => day.day_of_week);
}
