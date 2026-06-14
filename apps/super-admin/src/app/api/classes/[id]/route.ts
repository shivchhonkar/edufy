import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

// PUT - Update class
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;
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
      result = await db.query(
        `UPDATE classes
         SET name = $1, description = $2, academic_year = $3, is_active = $4
         WHERE id = $5
         RETURNING *`,
        [name, description || null, academic_year, is_active !== false, id]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('column "is_active"')) {
        result = await db.query(
          `UPDATE classes
           SET name = $1, description = $2, academic_year = $3
           WHERE id = $4
           RETURNING *`,
          [name, description || null, academic_year, id]
        );
      } else {
        throw err;
      }
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Class updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating class:', error);
    const message = error instanceof Error ? error.message : 'Failed to update class';
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
      `UPDATE classes SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: is_active ? 'Class enabled successfully' : 'Class disabled successfully',
    });
  } catch (error: unknown) {
    console.error('Error toggling class status:', error);
    const message = error instanceof Error ? error.message : 'Failed to update class status';
    if (message.includes('column "is_active"')) {
      return NextResponse.json(
        { success: false, error: 'Run phase10_classes_is_active migration to enable/disable classes' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;

    const studentCheck = await db.query(
      'SELECT COUNT(*)::int AS count FROM students WHERE class_id = $1',
      [id]
    );

    if (studentCheck.rows[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete class with enrolled students. Reassign students first or disable the class.',
        },
        { status: 400 }
      );
    }

    const enrollmentCheck = await db.query(
      'SELECT COUNT(*)::int AS count FROM student_enrollments WHERE class_id = $1',
      [id]
    );

    if (enrollmentCheck.rows[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete class with enrollment history. Disable the class instead.',
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      'DELETE FROM classes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting class:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete class';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
