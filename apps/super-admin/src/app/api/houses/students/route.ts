import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHousesSchema } from '@/lib/ensure-houses-schema';
import { getPaginationParams } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const classId = searchParams.get('class_id')?.trim() || '';
    const sectionId = searchParams.get('section_id')?.trim() || '';
    const houseId = searchParams.get('house_id')?.trim() || '';
    const unassignedOnly = searchParams.get('unassigned_only') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    const conditions = [`s.status = 'active'`];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        s.admission_number ILIKE $${paramIndex}
        OR s.first_name ILIKE $${paramIndex}
        OR s.last_name ILIKE $${paramIndex}
        OR CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    if (classId) {
      conditions.push(`COALESCE(e.class_id, s.class_id) = $${paramIndex}`);
      params.push(parseInt(classId, 10));
      paramIndex += 1;
    }

    if (sectionId) {
      conditions.push(`COALESCE(e.section_id, s.section_id) = $${paramIndex}`);
      params.push(parseInt(sectionId, 10));
      paramIndex += 1;
    }

    if (houseId === 'none') {
      conditions.push('e.house_id IS NULL');
    } else if (houseId) {
      conditions.push(`e.house_id = $${paramIndex}`);
      params.push(parseInt(houseId, 10));
      paramIndex += 1;
    }

    if (unassignedOnly) {
      conditions.push('e.house_id IS NULL');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const listResult = await db.query(
      `SELECT
        s.id,
        s.admission_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.roll_number,
        COALESCE(e.class_id, s.class_id) AS class_id,
        COALESCE(e.section_id, s.section_id) AS section_id,
        c.name AS class_name,
        sec.name AS section_name,
        e.house_id,
        h.name AS house_name,
        h.color AS house_color,
        h.code AS house_code
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       LEFT JOIN school_houses h ON h.id = e.house_id
       LEFT JOIN classes c ON c.id = COALESCE(e.class_id, s.class_id)
       LEFT JOIN sections sec ON sec.id = COALESCE(e.section_id, s.section_id)
       ${whereClause}
       ORDER BY c.name NULLS LAST, sec.name NULLS LAST, s.first_name, s.last_name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageLimit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        items: listResult.rows,
        total,
        page,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching house students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
