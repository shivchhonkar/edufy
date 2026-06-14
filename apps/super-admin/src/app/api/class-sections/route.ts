import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';
import { classNameOrderSql } from '@/lib/class-sort';

// GET class-section assignments
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const classId = request.nextUrl.searchParams.get('class_id');
    const sectionId = request.nextUrl.searchParams.get('section_id');

    let query = `
      SELECT cs.*, c.name AS class_name, s.name AS section_name
      FROM class_sections cs
      JOIN classes c ON cs.class_id = c.id
      JOIN sections s ON cs.section_id = s.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (classId) {
      params.push(classId);
      query += ` AND cs.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      query += ` AND cs.section_id = $${params.length}`;
    }

    query += ` ORDER BY ${classNameOrderSql('c.name')}, s.name`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching class sections:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch assignments';
    if (message.includes('class_sections')) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST assign section to class
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const body = await request.json();
    const { class_id, section_id } = body;

    if (!class_id || !section_id) {
      return NextResponse.json(
        { success: false, error: 'Class ID and Section ID are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO class_sections (class_id, section_id)
       VALUES ($1, $2)
       ON CONFLICT (class_id, section_id) DO NOTHING
       RETURNING *`,
      [class_id, section_id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0] || { class_id, section_id },
      message: 'Section assigned to class',
    });
  } catch (error: unknown) {
    console.error('Error assigning section:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign section';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE remove assignment
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const id = request.nextUrl.searchParams.get('id');
    const classId = request.nextUrl.searchParams.get('class_id');
    const sectionId = request.nextUrl.searchParams.get('section_id');

    if (id) {
      await db.query('DELETE FROM class_sections WHERE id = $1', [id]);
    } else if (classId && sectionId) {
      const studentCheck = await db.query(
        'SELECT COUNT(*)::int AS count FROM students WHERE class_id = $1 AND section_id = $2',
        [classId, sectionId]
      );
      if (studentCheck.rows[0].count > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot unassign — students are enrolled in this class/section.' },
          { status: 400 }
        );
      }
      await db.query(
        'DELETE FROM class_sections WHERE class_id = $1 AND section_id = $2',
        [classId, sectionId]
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Assignment id or class_id+section_id required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Section removed from class',
    });
  } catch (error: unknown) {
    console.error('Error removing assignment:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove assignment';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
