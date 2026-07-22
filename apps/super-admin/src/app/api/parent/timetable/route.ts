import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ENTRY_SELECT = `
  SELECT ct.*, tp.name AS period_name, tp.start_time, tp.end_time, tp.sort_order,
         sub.name AS subject_name, st.first_name || ' ' || st.last_name AS teacher_name
  FROM class_timetable ct
  INNER JOIN timetable_periods tp ON ct.period_id = tp.id
  LEFT JOIN subjects sub ON ct.subject_id = sub.id
  LEFT JOIN staff st ON ct.staff_id = st.id`;

type TimetableRow = {
  id: number;
  class_id: number;
  section_id: number | null;
  day_of_week: number;
  period_id: number;
  subject_name?: string;
  teacher_name?: string;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  room?: string | null;
  is_inherited?: boolean;
};

function mergeSectionWithTemplate(sectionRows: TimetableRow[], templateRows: TimetableRow[]): TimetableRow[] {
  const merged: TimetableRow[] = [];
  const seen = new Set<string>();

  for (const row of sectionRows) {
    const key = `${row.day_of_week}-${row.period_id}`;
    seen.add(key);
    merged.push({ ...row, is_inherited: false });
  }

  for (const row of templateRows) {
    const key = `${row.day_of_week}-${row.period_id}`;
    if (!seen.has(key)) {
      merged.push({ ...row, is_inherited: true });
    }
  }

  return merged.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    await ensureTimetableSchema(db);

    const studentResult = await db.query(
      `SELECT s.class_id, s.section_id, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1 AND s.status = 'active'`,
      [studentId],
    );

    const student = studentResult.rows[0] as
      | { class_id: number; section_id: number | null; class_name?: string; section_name?: string }
      | undefined;

    if (!student?.class_id) {
      return NextResponse.json({
        success: true,
        data: {
          entries: [],
          periods: [],
          day_names: DAY_NAMES,
          meta: { class_id: null, section_id: null },
        },
      });
    }

    const dayFilter = request.nextUrl.searchParams.get('day_of_week');
    const classId = student.class_id;
    const sectionId = student.section_id;

    const [periods, sectionResult, templateResult] = await Promise.all([
      db.query('SELECT * FROM timetable_periods WHERE is_active = true ORDER BY sort_order'),
      sectionId
        ? db.query(
            `${ENTRY_SELECT} WHERE ct.class_id = $1 AND ct.section_id = $2 ORDER BY ct.day_of_week, tp.sort_order`,
            [classId, sectionId],
          )
        : Promise.resolve({ rows: [] }),
      db.query(
        `${ENTRY_SELECT} WHERE ct.class_id = $1 AND ct.section_id IS NULL ORDER BY ct.day_of_week, tp.sort_order`,
        [classId],
      ),
    ]);

    let entries = sectionId
      ? mergeSectionWithTemplate(
          sectionResult.rows as TimetableRow[],
          templateResult.rows as TimetableRow[],
        )
      : (templateResult.rows as TimetableRow[]);

    if (dayFilter != null && dayFilter !== '') {
      const day = parseInt(dayFilter, 10);
      entries = entries.filter((row) => row.day_of_week === day);
    }

    const mappedEntries = entries.map((row) => ({
      ...row,
      day_name: DAY_NAMES[row.day_of_week] ?? 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: {
        entries: mappedEntries,
        periods: periods.rows,
        day_names: DAY_NAMES,
        meta: {
          class_id: classId,
          section_id: sectionId,
          class_name: student.class_name,
          section_name: student.section_name,
        },
      },
    });
  } catch (error) {
    console.error('Parent timetable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable' },
      { status: 500 },
    );
  }
}
