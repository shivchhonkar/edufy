import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';
import { classNameOrderSql, sortClassesByName } from '@/lib/class-sort';
import { Class } from '@/shared/types';

const CLASSES_QUERY_WITH_JUNCTION = `
  SELECT c.*,
    COALESCE(sc.section_count, 0)::int AS section_count,
    COALESCE(st.student_count, 0)::int AS student_count
  FROM classes c
  LEFT JOIN (
    SELECT class_id, COUNT(DISTINCT section_id)::int AS section_count
    FROM (
      SELECT class_id, id AS section_id FROM sections WHERE class_id IS NOT NULL
      UNION
      SELECT class_id, section_id FROM class_sections
    ) combined
    GROUP BY class_id
  ) sc ON sc.class_id = c.id
  LEFT JOIN (
    SELECT class_id, COUNT(*)::int AS student_count
    FROM students
    WHERE class_id IS NOT NULL
    GROUP BY class_id
  ) st ON st.class_id = c.id
`;

const CLASSES_QUERY_LEGACY = `
  SELECT c.*,
    COALESCE(sc.section_count, 0)::int AS section_count,
    COALESCE(st.student_count, 0)::int AS student_count
  FROM classes c
  LEFT JOIN (
    SELECT class_id, COUNT(*)::int AS section_count
    FROM sections
    GROUP BY class_id
  ) sc ON sc.class_id = c.id
  LEFT JOIN (
    SELECT class_id, COUNT(*)::int AS student_count
    FROM students
    WHERE class_id IS NOT NULL
    GROUP BY class_id
  ) st ON st.class_id = c.id
`;

// GET all classes
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

    let queryText = `${CLASSES_QUERY_WITH_JUNCTION} WHERE 1=1`;

    if (activeOnly) {
      queryText += ' AND COALESCE(c.is_active, true) = true';
    }

    queryText += ` ORDER BY ${classNameOrderSql('c.name')}`;

    let result;
    try {
      result = await db.query<Class>(queryText, []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('class_sections')) {
        let legacyText = `${CLASSES_QUERY_LEGACY} WHERE 1=1`;
        if (activeOnly) legacyText += ' AND COALESCE(c.is_active, true) = true';
        legacyText += ` ORDER BY ${classNameOrderSql('c.name')}`;
        try {
          result = await db.query<Class>(legacyText, []);
        } catch (err2: unknown) {
          const msg2 = err2 instanceof Error ? err2.message : '';
          if (activeOnly && msg2.includes('is_active')) {
            result = await db.query<Class>(`${CLASSES_QUERY_LEGACY} ORDER BY ${classNameOrderSql('c.name')}`, []);
          } else {
            throw err2;
          }
        }
      } else if (activeOnly && message.includes('is_active')) {
        result = await db.query<Class>(`${CLASSES_QUERY_WITH_JUNCTION} ORDER BY ${classNameOrderSql('c.name')}`, []);
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      data: sortClassesByName(result.rows),
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST create new class
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { name, description, academic_year, is_active } = body;

    if (!name || !academic_year) {
      return NextResponse.json(
        { success: false, error: 'Name and academic year are required' },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await db.query<Class>(
        `INSERT INTO classes (name, description, academic_year, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, description || null, academic_year, is_active !== false]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('is_active')) {
        result = await db.query<Class>(
          `INSERT INTO classes (name, description, academic_year)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [name, description || null, academic_year]
        );
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...result.rows[0], is_active: result.rows[0].is_active ?? true },
      message: 'Class created successfully',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
