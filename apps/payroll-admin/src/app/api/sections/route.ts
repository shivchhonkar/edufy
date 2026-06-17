import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';
import { classNameOrderSql } from '@/lib/class-sort';
import { Section } from '@/shared/types';

const SECTIONS_SELECT = `
  SELECT s.*,
    COALESCE(st.student_count, 0)::int AS student_count,
    COALESCE(cs.class_count, 0)::int AS class_count,
    COALESCE(ac.assigned_classes, '[]'::json) AS assigned_classes
  FROM sections s
  LEFT JOIN (
    SELECT section_id, COUNT(*)::int AS student_count
    FROM students
    WHERE section_id IS NOT NULL
    GROUP BY section_id
  ) st ON st.section_id = s.id
  LEFT JOIN (
    SELECT section_id, COUNT(*)::int AS class_count
    FROM class_sections
    GROUP BY section_id
  ) cs ON cs.section_id = s.id
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY ${classNameOrderSql('c.name')}) AS assigned_classes
    FROM class_sections cs2
    JOIN classes c ON c.id = cs2.class_id
    WHERE cs2.section_id = s.id
  ) ac ON true
`;

async function assignSectionToClasses(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  sectionId: number,
  classIds: number[]
) {
  for (const classId of classIds) {
    try {
      await db.query(
        `INSERT INTO class_sections (class_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [classId, sectionId]
      );
    } catch {
      // class_sections table may not exist yet
    }
  }
}

// GET all sections (optionally filtered by class_id)
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const classId = request.nextUrl.searchParams.get('class_id');
    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

    let queryText = SECTIONS_SELECT + ' WHERE 1=1';
    const queryParams: unknown[] = [];
    let paramCount = 0;

    if (classId) {
      paramCount++;
      queryText += ` AND (
        EXISTS (SELECT 1 FROM class_sections csf WHERE csf.section_id = s.id AND csf.class_id = $${paramCount})
        OR s.class_id = $${paramCount}
      )`;
      queryParams.push(classId);
    }

    if (activeOnly) {
      queryText += ' AND COALESCE(s.is_active, true) = true';
    }

    queryText += ' ORDER BY s.name ASC';

    let result;
    try {
      result = await db.query<Section>(queryText, queryParams);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('class_sections')) {
        let legacyQuery = `
          SELECT s.*, COALESCE(st.student_count, 0)::int AS student_count
          FROM sections s
          LEFT JOIN (
            SELECT section_id, COUNT(*)::int AS student_count
            FROM students WHERE section_id IS NOT NULL GROUP BY section_id
          ) st ON st.section_id = s.id
          WHERE 1=1
        `;
        const legacyParams: unknown[] = [];
        if (classId) {
          legacyQuery += ' AND s.class_id = $1';
          legacyParams.push(classId);
        }
        legacyQuery += ' ORDER BY s.name ASC';
        result = await db.query<Section>(legacyQuery, legacyParams);
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

// POST create section and optionally assign to class(es)
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const body = await request.json();
    const { name, capacity, class_id, class_ids, class_teacher_id, is_active } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Section name is required' },
        { status: 400 }
      );
    }

    const idsToAssign: number[] = class_ids?.length
      ? class_ids
      : class_id
        ? [class_id]
        : [];

    let result;
    try {
      result = await db.query<Section>(
        `INSERT INTO sections (name, capacity, class_teacher_id, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name.trim(), capacity || null, class_teacher_id || null, is_active !== false]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('column "is_active"') || !idsToAssign.length) {
        result = await db.query<Section>(
          `INSERT INTO sections (class_id, name, capacity, class_teacher_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [idsToAssign[0] || null, name.trim(), capacity || null, class_teacher_id || null]
        );
      } else {
        result = await db.query<Section>(
          `INSERT INTO sections (name, capacity, class_teacher_id)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [name.trim(), capacity || null, class_teacher_id || null]
        );
      }
    }

    const section = result.rows[0];
    if (idsToAssign.length) {
      await assignSectionToClasses(db, section.id, idsToAssign);
    }

    return NextResponse.json({
      success: true,
      data: section,
      message: 'Section created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
