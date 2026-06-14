import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// PUT - Update holiday
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { date, name, type, description } = body;

    if (!date || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Date, name, and type are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE holidays SET
        date = $1,
        name = $2,
        type = $3,
        description = $4
      WHERE id = $5
      RETURNING *`,
      [date, name, type, description || null, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Holiday updated successfully',
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}










