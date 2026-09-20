import type { RequestDb } from '@/lib/request-db';
import { ensureSchoolSetupSchema } from '@/lib/ensure-school-setup-schema';
import { classNameOrderSql, compareClassNames } from '@/lib/class-sort';

export type AgeAsOnMode = 'admission_date' | 'academic_year_start' | 'fixed_date';

export interface ClassAgeRestriction {
  class_id: number;
  class_name: string;
  academic_year: string | null;
  min_age_years: number | null;
  max_age_years: number | null;
  as_on_mode: AgeAsOnMode;
  as_on_date: string | null;
}

function toDateOnly(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function ageInYears(dateOfBirth: string, asOnDate: string): number {
  const birth = new Date(`${toDateOnly(dateOfBirth)}T00:00:00`);
  const asOn = new Date(`${toDateOnly(asOnDate)}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(asOn.getTime())) return NaN;

  let age = asOn.getFullYear() - birth.getFullYear();
  const monthDiff = asOn.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOn.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function parseOptionalAge(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 25) return null;
  return Math.round(parsed * 10) / 10;
}

export async function listClassAgeRestrictions(db: RequestDb): Promise<ClassAgeRestriction[]> {
  await ensureSchoolSetupSchema(db);
  const result = await db.query<{
    class_id: number;
    class_name: string;
    academic_year: string | null;
    min_age_years: string | number | null;
    max_age_years: string | number | null;
    as_on_mode: string | null;
    as_on_date: Date | string | null;
  }>(
    `SELECT
       c.id AS class_id,
       c.name AS class_name,
       c.academic_year,
       r.min_age_years,
       r.max_age_years,
       COALESCE(r.as_on_mode, 'admission_date') AS as_on_mode,
       r.as_on_date
     FROM classes c
     LEFT JOIN class_age_restrictions r ON r.class_id = c.id
     WHERE COALESCE(c.is_active, true) = true
     ORDER BY ${classNameOrderSql('c.name')}`,
  );

  return result.rows
    .map((row) => ({
      class_id: row.class_id,
      class_name: row.class_name,
      academic_year: row.academic_year,
      min_age_years: row.min_age_years == null ? null : Number(row.min_age_years),
      max_age_years: row.max_age_years == null ? null : Number(row.max_age_years),
      as_on_mode: (row.as_on_mode as AgeAsOnMode) || 'admission_date',
      as_on_date: toDateOnly(row.as_on_date) || null,
    }))
    .sort((a, b) => compareClassNames(a.class_name, b.class_name));
}

export async function saveClassAgeRestrictions(
  db: RequestDb,
  rows: Array<{
    class_id: number;
    min_age_years?: number | null;
    max_age_years?: number | null;
    as_on_mode?: AgeAsOnMode;
    as_on_date?: string | null;
  }>,
): Promise<void> {
  await ensureSchoolSetupSchema(db);

  for (const row of rows) {
    const minAge = parseOptionalAge(row.min_age_years);
    const maxAge = parseOptionalAge(row.max_age_years);
    if (minAge == null && maxAge == null) {
      await db.query('DELETE FROM class_age_restrictions WHERE class_id = $1', [row.class_id]);
      continue;
    }
    if (minAge != null && maxAge != null && minAge > maxAge) {
      throw new Error('Minimum age cannot be greater than maximum age');
    }

    await db.query(
      `INSERT INTO class_age_restrictions (class_id, min_age_years, max_age_years, as_on_mode, as_on_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (class_id) DO UPDATE SET
         min_age_years = EXCLUDED.min_age_years,
         max_age_years = EXCLUDED.max_age_years,
         as_on_mode = EXCLUDED.as_on_mode,
         as_on_date = EXCLUDED.as_on_date,
         updated_at = CURRENT_TIMESTAMP`,
      [
        row.class_id,
        minAge,
        maxAge,
        row.as_on_mode || 'admission_date',
        row.as_on_date || null,
      ],
    );
  }
}

async function resolveAsOnDate(
  db: RequestDb,
  restriction: {
    as_on_mode: AgeAsOnMode;
    as_on_date: string | null;
    academic_year: string | null;
  },
  admissionDate?: string | null,
): Promise<string> {
  if (restriction.as_on_mode === 'fixed_date' && restriction.as_on_date) {
    return restriction.as_on_date;
  }
  if (restriction.as_on_mode === 'academic_year_start' && restriction.academic_year) {
    const year = await db.query<{ start_date: Date | string }>(
      'SELECT start_date FROM academic_years WHERE name = $1 LIMIT 1',
      [restriction.academic_year],
    );
    const start = toDateOnly(year.rows[0]?.start_date);
    if (start) return start;
  }
  return toDateOnly(admissionDate) || toDateOnly(new Date());
}

export async function assertClassAgeRestriction(
  db: RequestDb,
  options: {
    classId?: number | null;
    dateOfBirth?: string | null;
    admissionDate?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!options.classId || !options.dateOfBirth) return { ok: true };

  await ensureSchoolSetupSchema(db);
  const result = await db.query<{
    class_name: string;
    academic_year: string | null;
    min_age_years: string | number | null;
    max_age_years: string | number | null;
    as_on_mode: string | null;
    as_on_date: Date | string | null;
  }>(
    `SELECT
       c.name AS class_name,
       c.academic_year,
       r.min_age_years,
       r.max_age_years,
       COALESCE(r.as_on_mode, 'admission_date') AS as_on_mode,
       r.as_on_date
     FROM classes c
     LEFT JOIN class_age_restrictions r ON r.class_id = c.id
     WHERE c.id = $1`,
    [options.classId],
  );

  const row = result.rows[0];
  if (!row) return { ok: true };

  const minAge = row.min_age_years == null ? null : Number(row.min_age_years);
  const maxAge = row.max_age_years == null ? null : Number(row.max_age_years);
  if (minAge == null && maxAge == null) return { ok: true };

  const asOn = await resolveAsOnDate(
    db,
    {
      as_on_mode: (row.as_on_mode as AgeAsOnMode) || 'admission_date',
      as_on_date: toDateOnly(row.as_on_date) || null,
      academic_year: row.academic_year,
    },
    options.admissionDate,
  );
  const age = ageInYears(options.dateOfBirth, asOn);
  if (Number.isNaN(age)) return { ok: true };

  if (minAge != null && age < minAge) {
    return {
      ok: false,
      error: `${row.class_name} requires minimum age ${minAge} years (student is ${age} as on ${asOn}).`,
    };
  }
  if (maxAge != null && age > maxAge) {
    return {
      ok: false,
      error: `${row.class_name} allows maximum age ${maxAge} years (student is ${age} as on ${asOn}).`,
    };
  }

  return { ok: true };
}
