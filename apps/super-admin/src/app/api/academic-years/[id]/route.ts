import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { syncActiveAcademicYear } from '@/lib/ensure-system-settings';
import {
  getAcademicYearAssociations,
  isAcademicYearDeletable,
} from '@/lib/academic-year-usage';
// PUT - Update academic year
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const yearId = params.id;
    const body = await request.json();
    const { name, start_date, end_date } = body;

    if (!name?.trim() || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    const existing = await db.query(
      'SELECT id, is_active FROM academic_years WHERE id = $1',
      [yearId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    const duplicate = await db.query(
      'SELECT id FROM academic_years WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [name.trim(), yearId]
    );
    if (duplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Academic year "${name}" already exists` },
        { status: 409 }
      );
    }

    const result = await db.query(
      `UPDATE academic_years
       SET name = $1, start_date = $2, end_date = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name.trim(), start_date, end_date, yearId]
    );

    if (existing.rows[0].is_active) {
      await syncActiveAcademicYear(db, name.trim());
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    console.error('Error updating academic year:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE - Delete academic year
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const yearId = params.id;
    const checkActive = await db.query(
      'SELECT is_active, name FROM academic_years WHERE id = $1',
      [yearId]
    );

    if (checkActive.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    if (checkActive.rows[0].is_active) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete active academic year "${checkActive.rows[0].name}". Please activate a different year first.` 
        },
        { status: 400 }
      );
    }

    const associations = await getAcademicYearAssociations(
      db,
      Number(yearId),
      checkActive.rows[0].name
    );

    if (!isAcademicYearDeletable(false, associations)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${checkActive.rows[0].name}" — linked to ${associations.join(', ')}.`,
          associations,
        },
        { status: 400 }
      );
    }

    // Delete the academic year
    const result = await db.query(
      'DELETE FROM academic_years WHERE id = $1 RETURNING *',
      [yearId]
    );

    return NextResponse.json({
      success: true,
      message: 'Academic year deleted successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error deleting academic year:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




