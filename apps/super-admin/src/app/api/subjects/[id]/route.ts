import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// PUT - Update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { name, code, description } = body;
    const { id } = params;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Subject name is required' },
        { status: 400 }
      );
    }

    // Try with updated_at, fall back if column doesn't exist
    let result;
    try {
      result = await db.query(
        `UPDATE subjects 
         SET name = $1, code = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [name, code, description, id]
      );
    } catch (err: any) {
      // If updated_at column doesn't exist, try without it
      if (err.message?.includes('column "updated_at"')) {
        result = await db.query(
          `UPDATE subjects 
           SET name = $1, code = $2, description = $3
           WHERE id = $4 
           RETURNING *`,
          [name, code, description, id]
        );
      } else {
        throw err;
      }
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Subject updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const { id } = params;

    // Check if subject is assigned to any class
    const assignmentCheck = await db.query(
      'SELECT COUNT(*) FROM class_subjects WHERE subject_id = $1',
      [id]
    );

    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete subject that is assigned to classes. Please remove assignments first.' 
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      'DELETE FROM subjects WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

