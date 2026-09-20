import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { updateHoliday, type HolidayInput } from '@/lib/holiday-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const body = (await request.json()) as HolidayInput;
    const id = parseInt(params.id, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid holiday ID' }, { status: 400 });
    }

    const updated = await updateHoliday(db, id, body);
    if (updated && 'error' in updated) {
      return NextResponse.json({ success: false, error: updated.error }, { status: 400 });
    }
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Holiday updated successfully',
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update holiday' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const id = parseInt(params.id, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid holiday ID' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM holidays WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 },
    );
  }
}
