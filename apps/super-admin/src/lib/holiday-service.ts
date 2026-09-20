import type { RequestDb } from '@/lib/request-db';
import { ensureHolidaySchema } from '@/lib/ensure-holiday-schema';
import {
  toDateOnly,
  type HolidayRecord,
  type HolidayScope,
} from '@/lib/holiday-utils';

export interface HolidayInput {
  academic_year?: string | null;
  scope?: HolidayScope | string | null;
  class_id?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  date?: string | null;
  remark?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
}

export interface HolidayListFilters {
  academicYear?: string | null;
  classId?: number | null;
  studentId?: number | null;
  scope?: HolidayScope | null;
  startDate?: string | null;
  endDate?: string | null;
  year?: string | null;
}

interface HolidayRow {
  id: number;
  date: Date | string;
  name: string;
  type: string | null;
  description: string | null;
  academic_year: string | null;
  scope: string | null;
  class_id: number | null;
  class_name: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  remark: string | null;
  created_at?: Date | string;
}

const HOLIDAY_SELECT = `
  SELECT
    h.id,
    h.date,
    h.name,
    h.type,
    h.description,
    h.academic_year,
    h.scope,
    h.class_id,
    c.name AS class_name,
    COALESCE(h.start_date, h.date) AS start_date,
    COALESCE(h.end_date, h.start_date, h.date) AS end_date,
    COALESCE(h.remark, h.description) AS remark,
    h.created_at
  FROM holidays h
  LEFT JOIN classes c ON c.id = h.class_id
`;

function normalizeScope(value: unknown): HolidayScope {
  return value === 'class' ? 'class' : 'school';
}

function parseClassId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const id = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function mapHolidayRow(row: HolidayRow): HolidayRecord {
  const start = toDateOnly(row.start_date || row.date);
  const end = toDateOnly(row.end_date || start);
  const remark = row.remark?.trim() || row.description?.trim() || row.name || null;
  return {
    id: row.id,
    date: start,
    name: row.name || remark || 'Holiday',
    type: row.type || 'school',
    description: row.description,
    academic_year: row.academic_year,
    scope: normalizeScope(row.scope),
    class_id: row.class_id,
    class_name: row.class_name,
    start_date: start,
    end_date: end,
    remark,
    created_at: row.created_at ? toDateOnly(row.created_at) : undefined,
  };
}

export function normalizeHolidayInput(body: HolidayInput): {
  academic_year: string | null;
  scope: HolidayScope;
  class_id: number | null;
  start_date: string;
  end_date: string;
  remark: string;
  name: string;
  description: string | null;
  type: string;
} | { error: string } {
  const start_date = toDateOnly(body.start_date || body.date);
  const end_date = toDateOnly(body.end_date || start_date);
  const remark = (body.remark || body.name || body.description || '').trim();
  const scope = normalizeScope(body.scope);
  const class_id = scope === 'class' ? parseClassId(body.class_id) : null;

  if (!start_date) return { error: 'From date is required' };
  if (!end_date) return { error: 'To date is required' };
  if (end_date < start_date) return { error: 'To date cannot be before from date' };
  if (!remark) return { error: 'Remark is required' };
  if (scope === 'class' && !class_id) return { error: 'Class is required for class-wise holidays' };

  return {
    academic_year: body.academic_year?.trim() || null,
    scope,
    class_id,
    start_date,
    end_date,
    remark,
    name: (body.name || remark).trim(),
    description: (body.description || remark).trim() || null,
    type: body.type?.trim() || 'school',
  };
}

export async function listHolidays(
  db: RequestDb,
  filters: HolidayListFilters = {},
): Promise<HolidayRecord[]> {
  await ensureHolidaySchema(db);

  let classId = filters.classId ?? null;
  if (!classId && filters.studentId) {
    const student = await db.query<{ class_id: number | null }>(
      'SELECT class_id FROM students WHERE id = $1 LIMIT 1',
      [filters.studentId],
    );
    classId = student.rows[0]?.class_id ?? null;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.academicYear) {
    params.push(filters.academicYear);
    conditions.push(`(h.academic_year = $${params.length} OR h.academic_year IS NULL)`);
  }

  if (filters.year) {
    params.push(filters.year);
    conditions.push(`(
      EXTRACT(YEAR FROM COALESCE(h.start_date, h.date)) = $${params.length}
      OR EXTRACT(YEAR FROM COALESCE(h.end_date, h.start_date, h.date)) = $${params.length}
    )`);
  }

  if (filters.startDate && filters.endDate) {
    params.push(filters.startDate, filters.endDate);
    conditions.push(`COALESCE(h.start_date, h.date) <= $${params.length}`);
    conditions.push(`COALESCE(h.end_date, h.start_date, h.date) >= $${params.length - 1}`);
  }

  if (filters.scope === 'school') {
    conditions.push(`(h.scope = 'school' OR h.scope IS NULL OR h.class_id IS NULL)`);
  } else if (filters.scope === 'class') {
    conditions.push(`h.scope = 'class'`);
  }

  if (classId) {
    params.push(classId);
    conditions.push(`(h.scope = 'school' OR h.scope IS NULL OR h.class_id IS NULL OR h.class_id = $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query<HolidayRow>(
    `${HOLIDAY_SELECT} ${where} ORDER BY COALESCE(h.start_date, h.date) ASC, h.id ASC`,
    params,
  );

  return result.rows.map(mapHolidayRow);
}

export async function insertHoliday(db: RequestDb, body: HolidayInput): Promise<HolidayRecord | { error: string }> {
  await ensureHolidaySchema(db);
  const input = normalizeHolidayInput(body);
  if ('error' in input) return input;

  const result = await db.query<HolidayRow>(
    `INSERT INTO holidays (
      date, name, type, description, academic_year, scope, class_id, start_date, end_date, remark
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING
      id, date, name, type, description, academic_year, scope, class_id,
      NULL::varchar AS class_name,
      start_date, end_date, remark, created_at`,
    [
      input.start_date,
      input.name,
      input.type,
      input.description,
      input.academic_year,
      input.scope,
      input.class_id,
      input.start_date,
      input.end_date,
      input.remark,
    ],
  );

  const created = mapHolidayRow(result.rows[0]);
  if (created.class_id) {
    const classRow = await db.query<{ name: string }>(
      'SELECT name FROM classes WHERE id = $1',
      [created.class_id],
    );
    created.class_name = classRow.rows[0]?.name ?? null;
  }
  return created;
}

export async function insertHolidaysForClasses(
  db: RequestDb,
  body: HolidayInput,
  classIds: number[],
): Promise<HolidayRecord[] | { error: string }> {
  const created: HolidayRecord[] = [];
  for (const classId of classIds) {
    const row = await insertHoliday(db, { ...body, scope: 'class', class_id: classId });
    if ('error' in row) return row;
    created.push(row);
  }
  return created;
}

export async function updateHoliday(
  db: RequestDb,
  id: number,
  body: HolidayInput,
): Promise<HolidayRecord | { error: string } | null> {
  await ensureHolidaySchema(db);
  const input = normalizeHolidayInput(body);
  if ('error' in input) return input;

  const result = await db.query<HolidayRow>(
    `UPDATE holidays SET
      date = $1,
      name = $2,
      type = $3,
      description = $4,
      academic_year = $5,
      scope = $6,
      class_id = $7,
      start_date = $8,
      end_date = $9,
      remark = $10
    WHERE id = $11
    RETURNING
      id, date, name, type, description, academic_year, scope, class_id,
      NULL::varchar AS class_name,
      start_date, end_date, remark, created_at`,
    [
      input.start_date,
      input.name,
      input.type,
      input.description,
      input.academic_year,
      input.scope,
      input.class_id,
      input.start_date,
      input.end_date,
      input.remark,
      id,
    ],
  );

  if (!result.rows[0]) return null;
  const updated = mapHolidayRow(result.rows[0]);
  if (updated.class_id) {
    const classRow = await db.query<{ name: string }>(
      'SELECT name FROM classes WHERE id = $1',
      [updated.class_id],
    );
    updated.class_name = classRow.rows[0]?.name ?? null;
  }
  return updated;
}
