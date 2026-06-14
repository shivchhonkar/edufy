import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';

async function syncSectionClasses(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  sectionId: string,
  classIds: number[]
) {
  await db.query('DELETE FROM class_sections WHERE section_id = $1', [sectionId]);
  for (const classId of classIds) {
    await db.query(
      `INSERT INTO class_sections (class_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [classId, sectionId]
    );
  }
}

// PUT - Update section
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureClassSectionsTable(db);
    const { id } = params;
    const body = await request.json();
    const { name, capacity, is_active, class_ids } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Section name is required' },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await db.query(
        `UPDATE sections
         SET name = $1, capacity = $2, is_active = $3
         WHERE id = $4
         RETURNING *`,
        [name.trim(), capacity || null, is_active !== false, id]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('column "is_active"')) {
        result = await db.query(
          `UPDATE sections SET name = $1, capacity = $2 WHERE id = $3 RETURNING *`,
          [name.trim(), capacity || null, id]
        );
      } else {
        throw err;
      }
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    if (Array.isArray(class_ids)) {
      try {
        await syncSectionClasses(db, id, class_ids);
      } catch {
        // class_sections may not exist yet
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Section updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating section:', error);
    const message = error instanceof Error ? error.message : 'Failed to update section';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH - Toggle active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE sections SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: is_active ? 'Section enabled' : 'Section disabled',
    });
  } catch (error: unknown) {
    console.error('Error toggling section:', error);
    const message = error instanceof Error ? error.message : 'Failed to update section';
    if (message.includes('column "is_active"')) {
      return NextResponse.json(
        { success: false, error: 'Run phase11_class_sections migration to enable/disable sections' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE - Delete section
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;

    const studentCheck = await db.query(
      'SELECT COUNT(*)::int AS count FROM students WHERE section_id = $1',
      [id]
    );

    if (studentCheck.rows[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete section with enrolled students. Reassign students first or disable the section.',
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      'DELETE FROM sections WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting section:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete section';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
